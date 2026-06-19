import { existsSync, readFileSync } from "node:fs";
import { query, sqlString } from "./postgres.js";
import { extractIngredientModifiers, normalizeIngredientName } from "./ingredientMatcher.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node src/mark-ingredient-aliases-review.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production update.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await ensureSchema();
const [aliases, modifiers] = await Promise.all([fetchAliases(), fetchModifiers()]);
const reviewRows = aliases
  .map((alias) => reviewAlias(alias, modifiers))
  .filter((row) => row.needsReview);

if (!args.dryRun && reviewRows.length > 0) {
  await markRowsForReview(reviewRows);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  activeAliases: aliases.length,
  markedForReview: reviewRows.length,
  byReason: countReasons(reviewRows),
  samples: reviewRows.slice(0, args.limit).map((row) => ({
    aliasName: row.aliasName,
    ingredientSlug: row.ingredientSlug,
    reviewReason: row.reviewReason
  }))
}, null, 2));

async function ensureSchema() {
  await query(readFileSync(new URL("../migrations/20260619_ingredient_alias_quality_controls.sql", import.meta.url), "utf8"));
}

async function fetchAliases() {
  return await query(`
    select
      aliases.alias_name,
      aliases.ingredient_id,
      aliases.ingredient_slug,
      aliases.canonical_name,
      aliases.language,
      aliases.confidence_score,
      aliases.verified,
      aliases.active,
      ingredients.canonical_name as ingredient_canonical_name,
      ingredients.ingredient_slug as current_ingredient_slug
    from ingredient_aliases aliases
    left join ingredients
      on ingredients.ingredient_id = aliases.ingredient_id
    where coalesce(aliases.active, true) = true
    order by aliases.alias_name asc;
  `);
}

async function fetchModifiers() {
  return await query(`
    select modifier_text, normalized_text, modifier_type, normalized_value, language, strength
    from ingredient_modifiers
    where active = true
    order by length(normalized_text) desc, normalized_text asc;
  `);
}

function reviewAlias(alias, modifiers) {
  const aliasName = String(alias.alias_name || "").trim();
  const normalized = normalizeIngredientName(aliasName);
  const modifierResult = extractIngredientModifiers(aliasName, modifiers);
  const reasons = [];

  if (!alias.ingredient_id) {
    reasons.push("missing ingredient_id relationship");
  }
  if (normalized.length > 28 || normalized.split(/\s+/).filter(Boolean).length > 5) {
    reasons.push("alias looks like a product long name");
  }

  const weakModifiers = modifierResult.modifiers.filter((modifier) => modifier.strength === "weak");
  const strongModifiers = modifierResult.modifiers.filter((modifier) => modifier.strength === "strong");
  if (weakModifiers.length > 0) {
    reasons.push(`contains weak modifier: ${weakModifiers.map((modifier) => modifier.text).join(", ")}`);
  }
  if (strongModifiers.length > 0) {
    reasons.push(`contains strong modifier: ${strongModifiers.map((modifier) => modifier.text).join(", ")}`);
  }

  if (/^\d+/.test(normalized) || /\b\d+\s*(g|kg|lb|lbs|oz|ml|l|克|斤|磅|包|袋|盒)\b/i.test(normalized)) {
    reasons.push("contains quantity or package size");
  }
  if (/[®™]/.test(aliasName) || /\b(costco|kirkland|trader joe|whole foods|great value|weee|日日鲜|盒马)\b/i.test(normalized)) {
    reasons.push("contains likely brand or retailer text");
  }
  const confidence = Number(alias.confidence_score || 0);
  if (confidence > 0 && confidence < 0.8) {
    reasons.push(`low confidence score: ${confidence}`);
  }

  return {
    aliasName,
    ingredientSlug: alias.current_ingredient_slug || alias.ingredient_slug || "",
    needsReview: reasons.length > 0,
    reviewReason: reasons.join("; ")
  };
}

async function markRowsForReview(rows) {
  for (let index = 0; index < rows.length; index += 250) {
    const chunk = rows.slice(index, index + 250);
    await query(`
      update ingredient_aliases
      set review_status = 'review',
          review_reason = case alias_name
            ${chunk.map((row) => `when ${sqlString(row.aliasName)} then ${sqlString(row.reviewReason)}`).join("\n")}
            else review_reason
          end,
          updated_at = now()
      where active = true
        and alias_name in (${chunk.map((row) => sqlString(row.aliasName)).join(",")});
    `);
  }
}

function parseArgs(argv) {
  const parsed = { environment: "", dryRun: false, allowProdWrite: false, limit: 25 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") {
      parsed.environment = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
    } else if (value.startsWith("--env=")) {
      parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    } else if (value === "--dry-run") {
      parsed.dryRun = true;
    } else if (value === "--allow-prod-write") {
      parsed.allowProdWrite = true;
    } else if (value === "--limit") {
      parsed.limit = Math.max(1, Math.min(Number(argv[index + 1] || 25), 1000));
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
    if (!existsSync(envPath)) {
      continue;
    }
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

function countReasons(rows) {
  const counts = {};
  for (const row of rows) {
    for (const reason of row.reviewReason.split("; ").filter(Boolean)) {
      const key = reason.replace(/:.*/, "");
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}
