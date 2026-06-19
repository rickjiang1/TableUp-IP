import { existsSync, readFileSync } from "node:fs";
import { query, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node src/apply-ingredient-alias-review-decisions.js --env dev --csv /path/to/file.csv [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production update.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
if (!args.csvPath) {
  console.error("--csv is required.");
  process.exit(1);
}

assertTargetEnvironment(args.environment);

const rows = readDecisionCsv(args.csvPath);
const preparedRows = await prepareDecisionRows(rows);
const summary = summarize(preparedRows);
const currentCounts = await fetchReviewCounts();
const matchedCount = await countMatchingRows(rows);

if (!args.dryRun) {
  await applyDecisions(preparedRows);
}

const afterCounts = await fetchReviewCounts();
console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  csvRows: rows.length,
  csvActions: summary,
  modifyModes: summarizeModifyModes(preparedRows),
  matchingDatabaseRows: matchedCount,
  before: currentCounts,
  after: afterCounts,
  samples: preparedRows.slice(0, args.limit).map((row) => ({
    aliasName: row.aliasName,
    action: row.action,
    modifyMode: row.modifyMode,
    ingredientId: row.ingredientId,
    suggestedAliasName: row.suggestedAliasName,
    suggestedIngredientSlug: row.suggestedIngredientSlug
  }))
}, null, 2));

function readDecisionCsv(path) {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const [headerLine, ...lines] = text.split(/\r?\n/).filter((line) => line.length > 0);
  const headers = parseCsvLine(headerLine);
  return lines.map((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] ?? ""]));
    const action = String(row.final_decision || row.recommended_action || "").trim().toUpperCase();
    if (!["DELETE", "KEEP", "MODIFY", "REVIEW"].includes(action)) {
      throw new Error(`Unsupported recommended_action on CSV row ${index + 2}: ${row.recommended_action}`);
    }
    return {
      aliasName: String(row.alias_name || "").trim(),
      ingredientId: String(row.ingredient_id || "").trim(),
      ingredientSlug: String(row.ingredient_slug || "").trim(),
      action,
      reasonCn: String(row.final_reason_cn || row.reason_cn || "").trim(),
      issueTypes: String(row.issue_types || "").trim(),
      suggestedIngredientSlug: String(row.final_suggested_ingredient_slug || row.suggested_ingredient_slug || "").trim(),
      suggestedAliasName: String(row.final_suggested_alias_name || row.suggested_alias_name || "").trim(),
      suggestedAliasType: String(row.final_suggested_alias_type || row.suggested_alias_type || "").trim(),
      decisionConfidence: Number(row.final_confidence || row.decision_confidence || 0)
    };
  }).filter((row) => row.aliasName && row.ingredientId);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

async function fetchReviewCounts() {
  return await query(`
    select
      coalesce(review_status, '') as review_status,
      coalesce(active, true) as active,
      count(*)::int as count
    from ingredient_aliases
    group by coalesce(review_status, ''), coalesce(active, true)
    order by review_status, active;
  `);
}

async function prepareDecisionRows(rows) {
  const prepared = rows.map((row) => ({ ...row, modifyMode: "" }));
  const modifyRows = prepared.filter((row) => row.action === "MODIFY" && row.suggestedAliasName);
  const csvActionByAlias = new Map(prepared.map((row) => [row.aliasName, row.action]));
  const existingTargetAliases = await fetchExistingAliasNames([...new Set(modifyRows.map((row) => row.suggestedAliasName))]);
  const bySuggestedAlias = new Map();

  for (const row of modifyRows) {
    if (!bySuggestedAlias.has(row.suggestedAliasName)) {
      bySuggestedAlias.set(row.suggestedAliasName, []);
    }
    bySuggestedAlias.get(row.suggestedAliasName).push(row);
  }

  for (const [suggestedAliasName, group] of bySuggestedAlias.entries()) {
    const targetCsvAction = csvActionByAlias.get(suggestedAliasName);
    if (targetCsvAction === "DELETE" || targetCsvAction === "REVIEW") {
      for (const row of group) {
        row.modifyMode = "manual_review_target_conflict";
      }
      continue;
    }

    if (existingTargetAliases.has(suggestedAliasName)) {
      for (const row of group) {
        row.modifyMode = row.aliasName === suggestedAliasName ? "keep_existing_target" : "covered_by_existing_target";
      }
      continue;
    }

    const renameRow = group.find((row) => row.aliasName === suggestedAliasName) || group[0];
    renameRow.modifyMode = "rename_to_target";
    for (const row of group) {
      if (row !== renameRow) {
        row.modifyMode = "covered_by_new_target";
      }
    }
  }

  return prepared;
}

async function fetchExistingAliasNames(aliasNames) {
  const existing = new Set();
  for (const chunk of chunks(aliasNames, 500)) {
    if (chunk.length === 0) continue;
    const result = await query(`
      select alias_name
      from ingredient_aliases
      where alias_name in (${chunk.map(sqlString).join(",")});
    `);
    for (const row of result) {
      existing.add(String(row.alias_name || ""));
    }
  }
  return existing;
}

async function countMatchingRows(rows) {
  let total = 0;
  for (const chunk of chunks(rows, 400)) {
    const values = chunk.map((row) => `(${sqlString(row.aliasName)}, ${sqlString(row.ingredientId)}::uuid)`).join(",\n");
    const result = await query(`
      with decisions(alias_name, ingredient_id) as (values ${values})
      select count(*)::int as count
      from ingredient_aliases aliases
      join decisions
        on decisions.alias_name = aliases.alias_name
       and decisions.ingredient_id = aliases.ingredient_id;
    `);
    total += Number(result[0]?.count || 0);
  }
  return total;
}

async function applyDecisions(rows) {
  for (const chunk of chunks(rows, 250)) {
    const values = chunk.map((row) => `(
      ${sqlString(row.aliasName)},
      ${sqlString(row.ingredientId)}::uuid,
      ${sqlString(row.action)},
      ${sqlString(row.reasonCn)},
      ${sqlString(row.issueTypes)},
      ${sqlString(row.suggestedIngredientSlug)},
      ${sqlString(row.suggestedAliasName)},
      ${sqlString(row.suggestedAliasType)},
      ${sqlString(row.modifyMode || "")},
      ${Number.isFinite(row.decisionConfidence) ? row.decisionConfidence : 0}
    )`).join(",\n");

    await query(`
      with decisions(
        alias_name,
        ingredient_id,
        recommended_action,
        reason_cn,
        issue_types,
        suggested_ingredient_slug,
        suggested_alias_name,
        suggested_alias_type,
        modify_mode,
        decision_confidence
      ) as (values ${values})
      update ingredient_aliases aliases
      set
        active = case
          when decisions.recommended_action = 'DELETE' then false
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode in ('covered_by_existing_target', 'covered_by_new_target') then false
          else true
        end,
        verified = case
          when decisions.recommended_action = 'DELETE' then false
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode in ('covered_by_existing_target', 'covered_by_new_target') then false
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode = 'manual_review_target_conflict' then aliases.verified
          when decisions.recommended_action in ('KEEP', 'MODIFY') then true
          else aliases.verified
        end,
        confidence_score = case
          when decisions.recommended_action = 'DELETE' then least(aliases.confidence_score, 0.35)
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode in ('covered_by_existing_target', 'covered_by_new_target') then least(aliases.confidence_score, 0.55)
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode = 'manual_review_target_conflict' then aliases.confidence_score
          when decisions.recommended_action = 'KEEP' then greatest(aliases.confidence_score, 0.90)
          when decisions.recommended_action = 'MODIFY' then greatest(aliases.confidence_score, 0.90)
          else aliases.confidence_score
        end,
        alias_name = case
          when decisions.recommended_action = 'MODIFY'
            and decisions.modify_mode = 'rename_to_target'
            and decisions.suggested_alias_name <> ''
          then decisions.suggested_alias_name
          else aliases.alias_name
        end,
        ingredient_slug = case
          when decisions.recommended_action = 'MODIFY' and decisions.suggested_ingredient_slug <> ''
          then decisions.suggested_ingredient_slug
          else aliases.ingredient_slug
        end,
        review_status = case
          when decisions.recommended_action = 'DELETE' then 'inactive_review_deleted'
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode in ('covered_by_existing_target', 'covered_by_new_target') then 'inactive_review_modified_duplicate'
          when decisions.recommended_action = 'MODIFY' and decisions.modify_mode = 'manual_review_target_conflict' then 'review'
          when decisions.recommended_action in ('KEEP', 'MODIFY') then 'accepted'
          else 'review'
        end,
        review_reason = concat_ws(
          '; ',
          nullif(decisions.reason_cn, ''),
          nullif(decisions.issue_types, ''),
          case
            when decisions.recommended_action = 'MODIFY'
              and decisions.modify_mode = 'manual_review_target_conflict'
            then concat('manual review: suggested target alias is also marked DELETE/REVIEW in review csv: ', decisions.suggested_alias_name)
            when decisions.recommended_action = 'MODIFY'
              and decisions.modify_mode in ('covered_by_existing_target', 'covered_by_new_target')
            then concat('covered by clean alias from review csv: ', decisions.suggested_alias_name)
            when decisions.recommended_action = 'MODIFY'
            then concat('modified from review csv; alias_type=', nullif(decisions.suggested_alias_type, ''))
            when decisions.recommended_action = 'KEEP'
            then 'kept from review csv'
            when decisions.recommended_action = 'DELETE'
            then 'deleted from review csv'
            else 'requires manual review from review csv'
          end
        ),
        updated_at = now()
      from decisions
      where aliases.alias_name = decisions.alias_name
        and aliases.ingredient_id = decisions.ingredient_id;
    `);
  }
}

function summarize(rows) {
  return rows.reduce((counts, row) => {
    counts[row.action] = (counts[row.action] || 0) + 1;
    return counts;
  }, {});
}

function summarizeModifyModes(rows) {
  return rows
    .filter((row) => row.action === "MODIFY")
    .reduce((counts, row) => {
      const key = row.modifyMode || "none";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
}

function chunks(rows, size) {
  const output = [];
  for (let index = 0; index < rows.length; index += size) {
    output.push(rows.slice(index, index + size));
  }
  return output;
}

function parseArgs(argv) {
  const parsed = { environment: "", csvPath: "", dryRun: false, allowProdWrite: false, limit: 10 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") {
      parsed.environment = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
    } else if (value.startsWith("--env=")) {
      parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    } else if (value === "--csv") {
      parsed.csvPath = String(argv[index + 1] || "").trim();
      index += 1;
    } else if (value.startsWith("--csv=")) {
      parsed.csvPath = value.slice("--csv=".length).trim();
    } else if (value === "--dry-run") {
      parsed.dryRun = true;
    } else if (value === "--allow-prod-write") {
      parsed.allowProdWrite = true;
    } else if (value === "--limit") {
      parsed.limit = Math.max(1, Math.min(Number(argv[index + 1] || 10), 100));
      index += 1;
    }
  }
  return parsed;
}

function loadEnv(environment) {
  const paths = [
    new URL("../.env", import.meta.url),
    environment ? new URL(`../.env.${environment}`, import.meta.url) : null,
    environment ? new URL(`../.env.${environment}.local`, import.meta.url) : null
  ].filter(Boolean);

  for (const envPath of paths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = value;
    }
  }
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required.");
  }
  const host = new URL(databaseUrl).host;
  if (!host.startsWith(`db.${target.projectRef}.`)) {
    throw new Error(`Refusing to update ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}
