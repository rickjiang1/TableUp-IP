import { existsSync, readFileSync } from "node:fs";
import { query, sqlNumber, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: {
    projectRef: "tochbwhcyoqqdepghisc",
    label: "TableUp-DEV"
  },
  prod: {
    projectRef: "oapybkblltlyugmmtqjr",
    label: "TableUp"
  }
};

const sourceName = "substitution_rule_enrichment_v1";
const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node backend/src/enrich-substitution-rules.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production enrichment.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

async function main() {
  await query(readFileSync("backend/migrations/20260618_dynamic_substitution_engine.sql", "utf8"));
  const categories = await fetchCategories();
  const rules = buildSubstitutionRules(categories);

  if (!args.dryRun) {
    await replaceGeneratedRules(rules);
  }

  console.log(JSON.stringify({
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    categories: categories.length,
    generatedRules: rules.length,
    byContext: countBy(rules, "context"),
    sample: rules.slice(0, 20).map((rule) => ({
      source: rule.sourceSlug,
      target: rule.targetSlug,
      context: rule.context,
      baseScore: rule.baseScore,
      notes: rule.notes
    }))
  }, null, 2));
}

function parseArgs(argv) {
  const parsed = {
    environment: "",
    allowProdWrite: false,
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") {
      parsed.environment = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value.startsWith("--env=")) {
      parsed.environment = value.slice("--env=".length).trim().toLowerCase();
      continue;
    }
    if (value === "--allow-prod-write") {
      parsed.allowProdWrite = true;
    }
    if (value === "--dry-run") {
      parsed.dryRun = true;
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
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key) {
        process.env[key] = value;
      }
    }
  }
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required.");
  }
  let host = "";
  try {
    host = new URL(databaseUrl).host;
  } catch {
    throw new Error("SUPABASE_DATABASE_URL must be a valid URL.");
  }
  if (!host.startsWith(`db.${target.projectRef}.`)) {
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

async function fetchCategories() {
  return await query(`
    select id, slug, name, parent_category_id
    from ingredient_categories
    order by slug asc;
  `);
}

async function replaceGeneratedRules(rules) {
  await query(`delete from substitution_rules where notes like ${sqlString(`[${sourceName}]%`)};`);
  for (const chunk of chunks(rules, 500)) {
    if (chunk.length === 0) continue;
    await query(`
      insert into substitution_rules (
        source_category_id,
        target_category_id,
        context,
        base_score,
        notes,
        updated_at
      )
      values ${chunk.map((rule) => `(
        ${sqlString(rule.sourceCategoryId)}::uuid,
        ${sqlString(rule.targetCategoryId)}::uuid,
        ${sqlString(rule.context)},
        ${sqlNumber(rule.baseScore, 0)},
        ${sqlString(rule.notes)},
        now()
      )`).join(",\n")}
      on conflict (source_category_id, target_category_id, context) do update set
        base_score = excluded.base_score,
        notes = excluded.notes,
        updated_at = now();
    `);
  }
}

function buildSubstitutionRules(categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const childrenByParent = new Map();
  for (const category of categories) {
    const parentId = category.parent_category_id || "";
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(category);
  }

  const generated = new Map();
  const addRule = ({ source, target, context = "general", baseScore, note }) => {
    const sourceCategory = bySlug.get(source);
    const targetCategory = bySlug.get(target);
    if (!sourceCategory || !targetCategory) return;
    const key = `${sourceCategory.id}:${targetCategory.id}:${context}`;
    const notes = `[${sourceName}] ${note}`;
    const current = generated.get(key);
    if (!current || baseScore > current.baseScore) {
      generated.set(key, {
        sourceCategoryId: sourceCategory.id,
        targetCategoryId: targetCategory.id,
        sourceSlug: source,
        targetSlug: target,
        context,
        baseScore: roundScore(baseScore),
        notes
      });
    }
  };

  for (const category of categories) {
    const slug = category.slug;
    if (topLevelCategories.has(slug)) continue;
    for (const context of contextsForCategory(slug)) {
      addRule({
        source: slug,
        target: slug,
        context,
        baseScore: selfCategoryScore(slug, context),
        note: `same subcategory dynamic rule for ${slug}`
      });
    }
  }

  for (const parent of categories) {
    const siblings = childrenByParent.get(parent.id) || [];
    for (const source of siblings) {
      for (const target of siblings) {
        if (source.slug === target.slug) continue;
        const pair = siblingRule(source.slug, target.slug, byId.get(parent.id)?.slug || "");
        if (!pair) continue;
        for (const context of pair.contexts) {
          addRule({
            source: source.slug,
            target: target.slug,
            context,
            baseScore: pair.baseScore,
            note: `sibling category dynamic rule under ${pair.parentSlug}`
          });
        }
      }
    }
  }

  for (const override of directionalOverrides) {
    for (const context of override.contexts) {
      addRule({
        source: override.source,
        target: override.target,
        context,
        baseScore: override.baseScore,
        note: override.note
      });
    }
  }

  return [...generated.values()]
    .filter((rule) => rule.baseScore > 0)
    .sort((left, right) => left.sourceSlug.localeCompare(right.sourceSlug) || left.targetSlug.localeCompare(right.targetSlug) || left.context.localeCompare(right.context));
}

function contextsForCategory(slug) {
  const custom = {
    allium: ["general", "stir_fry", "soup", "sauce", "marinade"],
    rhizome_aromatic: ["general", "stir_fry", "soup", "sauce", "marinade"],
    herb: ["general", "salad", "sauce", "marinade"],
    mushroom: ["general", "stir_fry", "soup", "sauce"],
    leafy_green: ["general", "salad", "stir_fry", "soup"],
    brassica: ["general", "stir_fry", "soup"],
    tuber: ["general", "soup", "stew"],
    root_vegetable: ["general", "soup", "stew", "roast"],
    squash_gourd: ["general", "soup", "stir_fry"],
    cucumber_gourd: ["general", "salad"],
    milk: ["general", "sauce", "soup", "baking"],
    cream: ["general", "sauce", "soup"],
    yogurt: ["general", "sauce", "marinade"],
    cheese: ["general", "baking", "sauce"],
    butter_fat: ["general", "sauce", "baking"],
    flour_starch: ["general", "sauce", "baking"],
    oil_fat: ["general", "stir_fry", "sauce", "baking"],
    sweetener: ["general", "baking", "sauce"],
    sauce_condiment: ["general", "sauce", "marinade", "stir_fry"],
    spice: ["general", "marinade", "sauce"],
    poultry: ["general", "stir_fry", "soup"],
    beef: ["general", "stir_fry", "soup", "stew"],
    pork: ["general", "stir_fry", "soup", "stew"],
    lamb: ["general", "stew"],
    fish: ["general", "soup"],
    shellfish: ["general", "stir_fry", "soup"],
    tofu_soy: ["general", "stir_fry", "soup"],
    legume: ["general", "soup"],
    nut_seed: ["general", "baking", "salad"],
    rice: ["general"],
    noodle_pasta: ["general", "soup"],
    bread: ["general", "baking"]
  };
  return custom[slug] || ["general"];
}

function selfCategoryScore(slug, context) {
  if (["beef", "pork", "lamb"].includes(slug)) return context === "stir_fry" ? 0.72 : 0.68;
  if (slug === "poultry") return 0.76;
  if (["fish", "shellfish"].includes(slug)) return 0.68;
  if (["flour_starch"].includes(slug) && context === "baking") return 0.58;
  if (["sweetener"].includes(slug) && context === "baking") return 0.66;
  if (["milk", "cream", "yogurt", "cheese", "butter_fat"].includes(slug)) return context === "baking" ? 0.62 : 0.76;
  if (["allium", "rhizome_aromatic", "herb", "mushroom"].includes(slug)) return 0.80;
  if (["oil_fat", "sauce_condiment", "spice"].includes(slug)) return 0.78;
  if (["rice", "noodle_pasta", "bread"].includes(slug)) return 0.66;
  return 0.70;
}

function siblingRule(sourceSlug, targetSlug, parentSlug) {
  if (parentSlug === "aromatic") {
    return { parentSlug, baseScore: 0.28, contexts: ["general", "stir_fry", "soup", "sauce", "marinade"] };
  }
  if (parentSlug === "meat") {
    return { parentSlug, baseScore: 0.38, contexts: ["general"] };
  }
  if (parentSlug === "protein") {
    if (["fish", "shellfish"].includes(sourceSlug) && ["fish", "shellfish"].includes(targetSlug)) {
      return { parentSlug, baseScore: 0.55, contexts: ["general", "soup"] };
    }
    return null;
  }
  if (parentSlug === "dairy") {
    return { parentSlug, baseScore: 0.55, contexts: ["general", "sauce", "soup"] };
  }
  if (parentSlug === "vegetable") {
    return { parentSlug, baseScore: 0.44, contexts: ["general", "soup"] };
  }
  if (parentSlug === "fruit") {
    return { parentSlug, baseScore: 0.50, contexts: ["general", "salad"] };
  }
  if (parentSlug === "grain") {
    return { parentSlug, baseScore: 0.42, contexts: ["general"] };
  }
  if (parentSlug === "pantry") {
    return { parentSlug, baseScore: 0.35, contexts: ["general"] };
  }
  return null;
}

const directionalOverrides = [
  { source: "milk", target: "cream", contexts: ["sauce", "soup"], baseScore: 0.58, note: "milk can lighten cream in cooked applications but is not equivalent" },
  { source: "cream", target: "milk", contexts: ["sauce", "soup"], baseScore: 0.62, note: "milk can replace cream only when lower fat/body is acceptable" },
  { source: "flour_starch", target: "flour_starch", contexts: ["sauce"], baseScore: 0.82, note: "starches/flours can substitute as thickeners with ratio changes" },
  { source: "allium", target: "allium", contexts: ["stir_fry", "soup", "sauce"], baseScore: 0.84, note: "allium family substitutions are often acceptable by taste" },
  { source: "rhizome_aromatic", target: "rhizome_aromatic", contexts: ["stir_fry", "soup", "sauce"], baseScore: 0.80, note: "rhizome aromatics can be close but flavor intensity varies" },
  { source: "herb", target: "herb", contexts: ["salad"], baseScore: 0.76, note: "fresh herbs can substitute in garnish/salad contexts with flavor caveats" },
  { source: "oil_fat", target: "oil_fat", contexts: ["stir_fry", "sauce"], baseScore: 0.84, note: "cooking fats substitute well when smoke point/flavor are acceptable" },
  { source: "beef", target: "beef", contexts: ["stew"], baseScore: 0.76, note: "beef cuts can substitute in stew when cook time is adjusted" },
  { source: "pork", target: "pork", contexts: ["stew"], baseScore: 0.74, note: "pork cuts can substitute in stew when cook time/fat are adjusted" },
  { source: "poultry", target: "poultry", contexts: ["stir_fry"], baseScore: 0.78, note: "poultry cuts can substitute in stir fry with timing adjustment" }
];

const topLevelCategories = new Set(["protein", "meat", "dairy", "vegetable", "fruit", "grain", "pantry", "beverage", "aromatic"]);

function roundScore(value) {
  return Math.round(Math.max(0, Math.min(1, Number(value || 0))) * 1000) / 1000;
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    counts[row[field]] = (counts[row[field]] || 0) + 1;
    return counts;
  }, {});
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

await main();
