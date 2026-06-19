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
  console.error("Usage: node src/cleanup-ingredient-aliases.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production cleanup.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await ensureSchema();
const [aliases, modifiers] = await Promise.all([fetchAliases(), fetchModifiers()]);
const aliasIndex = buildAliasIndex(aliases);
const cleanupPlan = aliases
  .map((alias) => planAliasCleanup(alias, modifiers, aliasIndex))
  .filter(Boolean);

if (!args.dryRun && cleanupPlan.length > 0) {
  await applyCleanup(cleanupPlan);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  aliases: aliases.length,
  safeInactiveAliases: cleanupPlan.length,
  byReason: countBy(cleanupPlan, (row) => row.reason),
  samples: cleanupPlan.slice(0, args.limit)
}, null, 2));

async function ensureSchema() {
  await query(readFileSync(new URL("../migrations/20260619_ingredient_alias_quality_controls.sql", import.meta.url), "utf8"));
}

async function fetchAliases() {
  return await query(`
    select alias_name, ingredient_id, ingredient_slug, canonical_name, language, confidence_score, verified, active
    from ingredient_aliases
    where active = true
    order by alias_name asc;
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

function buildAliasIndex(aliases) {
  const byNormalized = new Map();
  for (const alias of aliases) {
    const normalized = normalizeIngredientName(alias.alias_name);
    if (!normalized) {
      continue;
    }
    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, []);
    }
    byNormalized.get(normalized).push(alias);
  }
  return byNormalized;
}

function planAliasCleanup(alias, modifiers, aliasIndex) {
  const aliasName = String(alias.alias_name || "").trim();
  const normalized = normalizeIngredientName(aliasName);
  const ingredientId = String(alias.ingredient_id || "").trim();
  if (!aliasName || !ingredientId) {
    return null;
  }

  const modifierResult = extractIngredientModifiers(aliasName, modifiers);
  if (modifierResult.modifiers.length === 0) {
    return null;
  }

  const replacement = modifierResult.candidateTexts
    .map((candidate) => normalizeIngredientName(candidate))
    .filter((candidate) => candidate && candidate !== normalized)
    .flatMap((candidate) => aliasIndex.get(candidate) || [])
    .find((candidateAlias) => String(candidateAlias.ingredient_id || "") === ingredientId);

  if (!replacement) {
    return null;
  }

  const hasWeakModifier = modifierResult.modifiers.some((modifier) => modifier.strength === "weak");
  const looksLikeLongProduct = normalized.length > 28 || normalized.split(/\s+/).filter(Boolean).length > 5;
  if (!hasWeakModifier && !looksLikeLongProduct) {
    return null;
  }

  return {
    aliasName,
    ingredientId,
    ingredientSlug: alias.ingredient_slug || "",
    replacementAlias: replacement.alias_name,
    reason: hasWeakModifier ? "redundant_modifier_alias" : "redundant_product_long_alias",
    detectedModifiers: modifierResult.modifiers.map((modifier) => `${modifier.type}:${modifier.text}`)
  };
}

async function applyCleanup(plan) {
  for (let index = 0; index < plan.length; index += 250) {
    const chunk = plan.slice(index, index + 250);
    await query(`
      update ingredient_aliases
      set active = false,
          verified = false,
          confidence_score = least(confidence_score, 0.55),
          review_status = 'inactive_redundant_modifier_alias',
          review_reason = case alias_name
            ${chunk.map((row) => `when ${sqlString(row.aliasName)} then ${sqlString(`${row.reason}; covered by ${row.replacementAlias}`)}`).join("\n")}
            else review_reason
          end,
          updated_at = now()
      where alias_name in (${chunk.map((row) => sqlString(row.aliasName)).join(",")});
    `);
  }
}

function parseArgs(argv) {
  const parsed = { environment: "", dryRun: false, allowProdWrite: false, limit: 100 };
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
      parsed.limit = Math.max(1, Math.min(Number(argv[index + 1] || 100), 1000));
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
    throw new Error(`Refusing to clean ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}
