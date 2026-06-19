import { existsSync, readFileSync } from "node:fs";
import { query } from "./postgres.js";
import { extractIngredientModifiers, normalizeIngredientName } from "./ingredientMatcher.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node src/audit-ingredient-aliases.js --env dev [--limit 100] [--include-inactive]");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

const [aliases, modifiers] = await Promise.all([
  fetchAliases(),
  fetchModifiers()
]);

const reviewed = aliases.map((alias) => reviewAlias(alias, modifiers));
const flagged = reviewed.filter((row) => row.needsReview);
const clean = reviewed.filter((row) => !row.needsReview);

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  summary: {
    aliases: aliases.length,
    clean: clean.length,
    needsReview: flagged.length,
    byRecommendedAction: countBy(flagged, (row) => row.recommendedAction),
    byReason: countReasons(flagged)
  },
  samples: {
    clean: clean.slice(0, 25).map(publicReviewRow),
    needsReview: flagged.slice(0, args.limit).map(publicReviewRow)
  }
}, null, 2));

async function fetchAliases() {
  const activeFilter = args.includeInactive ? "" : "where coalesce(aliases.active, true) = true";
  return await query(`
    select
      aliases.alias_name,
      aliases.ingredient_id,
      aliases.ingredient_slug,
      aliases.canonical_name,
      aliases.language,
      aliases.confidence_score,
      aliases.verified,
      ingredients.canonical_name as ingredient_canonical_name,
      ingredients.ingredient_slug as current_ingredient_slug,
      ingredients.category
    from ingredient_aliases aliases
    left join ingredients
      on ingredients.ingredient_id = aliases.ingredient_id
    ${activeFilter}
    order by aliases.alias_name asc;
  `);
}

async function fetchModifiers() {
  try {
    return await query(`
      select modifier_text, normalized_text, modifier_type, normalized_value, language, strength
      from ingredient_modifiers
      where active = true
      order by length(normalized_text) desc, normalized_text asc;
    `);
  } catch {
    return [];
  }
}

function reviewAlias(alias, modifiers) {
  const aliasName = String(alias.alias_name || "").trim();
  const normalized = normalizeIngredientName(aliasName);
  const modifierResult = extractIngredientModifiers(aliasName, modifiers);
  const reasons = [];
  let recommendedAction = "keep";

  if (!alias.ingredient_id) {
    reasons.push("missing ingredient_id relationship");
    recommendedAction = "manual_review";
  }

  if (normalized.length > 28 || wordCount(normalized) > 5) {
    reasons.push("alias looks like a product long name");
    recommendedAction = "manual_review";
  }

  const weakModifiers = modifierResult.modifiers.filter((modifier) => modifier.strength === "weak");
  const strongModifiers = modifierResult.modifiers.filter((modifier) => modifier.strength === "strong");
  if (weakModifiers.length > 0) {
    reasons.push(`contains weak modifier: ${weakModifiers.map((modifier) => modifier.text).join(", ")}`);
    recommendedAction = recommendedAction === "keep" ? "remove_or_split_modifier" : recommendedAction;
  }
  if (strongModifiers.length > 0) {
    reasons.push(`contains strong modifier: ${strongModifiers.map((modifier) => modifier.text).join(", ")}`);
    recommendedAction = recommendedAction === "keep" ? "manual_review" : recommendedAction;
  }

  if (/^\d+/.test(normalized) || /\b\d+\s*(g|kg|lb|lbs|oz|ml|l|克|斤|磅|包|袋|盒)\b/i.test(normalized)) {
    reasons.push("contains quantity or package size");
    recommendedAction = "remove_or_split_modifier";
  }

  if (/[®™]/.test(aliasName) || /\b(costco|kirkland|trader joe|whole foods|great value|weee|日日鲜|盒马)\b/i.test(normalized)) {
    reasons.push("contains likely brand or retailer text");
    recommendedAction = "manual_review";
  }

  const confidence = Number(alias.confidence_score || 0);
  if (confidence > 0 && confidence < 0.8) {
    reasons.push(`low confidence score: ${confidence}`);
    recommendedAction = recommendedAction === "keep" ? "manual_review" : recommendedAction;
  }

  const isClean = reasons.length === 0;
  return {
    aliasName,
    normalized,
    ingredientId: alias.ingredient_id || "",
    ingredientSlug: alias.current_ingredient_slug || alias.ingredient_slug || "",
    canonicalName: alias.ingredient_canonical_name || alias.canonical_name || "",
    language: alias.language || "",
    confidenceScore: confidence,
    verified: Boolean(alias.verified),
    needsReview: !isClean,
    reviewReasons: reasons,
    detectedModifiers: modifierResult.modifiers,
    recommendedAction: isClean ? "keep" : recommendedAction
  };
}

function publicReviewRow(row) {
  return {
    aliasName: row.aliasName,
    ingredientSlug: row.ingredientSlug,
    canonicalName: row.canonicalName,
    language: row.language,
    confidenceScore: row.confidenceScore,
    verified: row.verified,
    needsReview: row.needsReview,
    reviewReasons: row.reviewReasons,
    detectedModifiers: row.detectedModifiers,
    recommendedAction: row.recommendedAction
  };
}

function wordCount(value) {
  return String(value || "").split(/\s+/).filter(Boolean).length;
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function countReasons(items) {
  const counts = {};
  for (const item of items) {
    for (const reason of item.reviewReasons) {
      const key = reason.replace(/:.*/, "");
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function parseArgs(argv) {
  const parsed = { environment: "", limit: 100, includeInactive: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") {
      parsed.environment = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
    } else if (value.startsWith("--env=")) {
      parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    } else if (value === "--limit") {
      parsed.limit = Math.max(1, Math.min(Number(argv[index + 1] || 100), 1000));
      index += 1;
    } else if (value.startsWith("--limit=")) {
      parsed.limit = Math.max(1, Math.min(Number(value.slice("--limit=".length) || 100), 1000));
    } else if (value === "--include-inactive") {
      parsed.includeInactive = true;
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
    throw new Error(`Refusing to audit ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}
