import { existsSync, readFileSync } from "node:fs";
import { query, sqlNumber, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node src/seed-ingredient-modifiers.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

const modifierRows = coreModifierRows();
if (!args.dryRun) {
  await ensureTable();
  await deactivateCuratedModifiersNotInSeed(modifierRows);
  await upsertModifiers(modifierRows);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  modifiers: modifierRows.length,
  byType: countBy(modifierRows, (row) => row.modifier_type),
  byStrength: countBy(modifierRows, (row) => row.strength),
  samples: modifierRows.slice(0, 30)
}, null, 2));

function coreModifierRows() {
  return [
    ...weak("storage", "chilled", "zh", ["冰鲜", "冷藏", "鲜冷"]),
    ...weak("storage", "frozen", "zh", ["冷冻", "速冻"]),
    ...weak("storage", "fresh", "zh", ["新鲜"]),
    ...weak("storage", "chilled", "en", ["chilled", "refrigerated"]),
    ...weak("storage", "frozen", "en", ["frozen", "quick frozen"]),
    ...weak("storage", "fresh", "en", ["fresh"]),

    ...weak("usage", "hotpot", "zh", ["火锅", "涮", "涮锅", "打边炉"]),
    ...weak("usage", "bbq", "zh", ["烧烤", "烤肉"]),
    ...weak("usage", "stew", "zh", ["红烧"]),
    ...weak("usage", "stir_fry", "zh", ["小炒"]),
    ...weak("usage", "soup", "zh", ["煲汤", "炖汤"]),
    ...weak("usage", "hotpot", "en", ["hotpot", "hot pot", "shabu", "shabu shabu"]),
    ...weak("usage", "bbq", "en", ["bbq", "barbecue", "grill", "grilling"]),
    ...weak("usage", "stew", "en", ["stew", "braise", "braising"]),
    ...weak("usage", "stir_fry", "en", ["stir fry", "stir-fry"]),
    ...weak("usage", "soup", "en", ["soup", "stock"]),

    ...strong("cut", "sliced", "zh", ["片", "切片", "薄切", "薄片", "厚片"]),
    ...strong("cut", "rolled", "zh", ["卷", "肉卷"]),
    ...strong("cut", "chunk", "zh", ["块", "大块"]),
    ...strong("cut", "diced", "zh", ["丁", "粒"]),
    ...strong("cut", "shredded", "zh", ["丝"]),
    ...strong("cut", "strip", "zh", ["条"]),
    ...strong("cut", "minced", "zh", ["末", "碎"]),
    ...strong("cut", "ground", "zh", ["馅", "肉馅", "绞肉"]),
    ...strong("cut", "sliced", "en", ["sliced", "slice", "thin sliced", "thin-sliced"]),
    ...strong("cut", "rolled", "en", ["rolled", "roll"]),
    ...strong("cut", "chunk", "en", ["chunk", "chunks", "cubed", "cube"]),
    ...strong("cut", "diced", "en", ["diced", "dice"]),
    ...strong("cut", "shredded", "en", ["shredded", "shred"]),
    ...strong("cut", "strip", "en", ["strip", "strips"]),
    ...strong("cut", "minced", "en", ["minced", "mince", "chopped"]),
    ...strong("cut", "ground", "en", ["ground", "mince meat"]),

    ...weak("package", "boxed", "zh", ["盒装"]),
    ...weak("package", "bagged", "zh", ["袋装"]),
    ...weak("package", "bulk", "zh", ["散装"]),
    ...weak("package", "canned", "zh", ["罐装"]),
    ...weak("package", "bottled", "zh", ["瓶装"]),
    ...weak("package", "packed", "zh", ["包装"]),
    ...weak("package", "tray", "zh", ["托盘装", "盘装"]),
    ...weak("package", "boxed", "en", ["boxed", "box"]),
    ...weak("package", "bagged", "en", ["bagged", "bag"]),
    ...weak("package", "bulk", "en", ["bulk"]),
    ...weak("package", "canned", "en", ["canned"]),
    ...weak("package", "bottled", "en", ["bottled", "bottle"]),
    ...weak("package", "packed", "en", ["pack", "packed", "package", "tray"]),

    ...strong("part", "breast", "zh", ["胸", "胸肉"]),
    ...strong("part", "thigh", "zh", ["腿", "腿肉", "大腿"]),
    ...strong("part", "wing", "zh", ["翅", "翅膀", "鸡翅"]),
    ...strong("part", "belly", "zh", ["腩", "五花"]),
    ...strong("part", "tendon", "zh", ["筋"]),
    ...strong("part", "tripe", "zh", ["肚", "百叶", "毛肚"]),
    ...strong("part", "rib", "zh", ["肋", "肋条", "排骨"]),
    ...strong("part", "breast", "en", ["breast"]),
    ...strong("part", "thigh", "en", ["thigh", "leg"]),
    ...strong("part", "wing", "en", ["wing", "wings"]),
    ...strong("part", "belly", "en", ["belly"]),
    ...strong("part", "tendon", "en", ["tendon"]),
    ...strong("part", "tripe", "en", ["tripe"]),
    ...strong("part", "rib", "en", ["rib", "ribs"]),

    ...strong("preparation", "boneless", "zh", ["无骨", "去骨"]),
    ...strong("preparation", "bone_in", "zh", ["带骨", "有骨"]),
    ...strong("preparation", "skinless", "zh", ["去皮"]),
    ...strong("preparation", "skin_on", "zh", ["带皮", "有皮"]),
    ...strong("preparation", "boneless", "en", ["boneless"]),
    ...strong("preparation", "bone_in", "en", ["bone in", "bone-in"]),
    ...strong("preparation", "skinless", "en", ["skinless"]),
    ...strong("preparation", "skin_on", "en", ["skin on", "skin-on"]),

    ...weak("origin", "usa", "zh", ["美国", "美国产"]),
    ...weak("origin", "australia", "zh", ["澳洲", "澳大利亚"]),
    ...weak("origin", "japan", "zh", ["日本"]),
    ...weak("origin", "canada", "zh", ["加拿大"]),
    ...weak("quality", "wagyu", "zh", ["和牛", "美国和牛", "澳洲和牛"]),
    ...weak("quality", "angus", "zh", ["安格斯", "黑安格斯"]),
    ...weak("quality", "organic", "zh", ["有机"]),
    ...weak("origin", "usa", "en", ["american", "usa", "u.s."]),
    ...weak("origin", "australia", "en", ["australian"]),
    ...weak("origin", "japan", "en", ["japanese"]),
    ...weak("origin", "canada", "en", ["canadian"]),
    ...weak("quality", "wagyu", "en", ["wagyu"]),
    ...weak("quality", "angus", "en", ["angus", "black angus"]),
    ...weak("quality", "organic", "en", ["organic"])
  ];
}

function weak(type, value, language, texts) {
  return rows(type, value, language, "weak", texts);
}

function strong(type, value, language, texts) {
  return rows(type, value, language, "strong", texts);
}

function rows(type, value, language, strength, texts) {
  return texts.map((text) => ({
    modifier_text: text,
    normalized_text: normalizeText(text),
    modifier_type: type,
    normalized_value: value,
    language,
    strength,
    confidence_score: 1,
    notes: "Curated MVP modifier for deterministic ingredient matching."
  }));
}

async function ensureTable() {
  await query(readFileSync(new URL("../migrations/20260619_ingredient_modifiers.sql", import.meta.url), "utf8"));
}

async function upsertModifiers(rows) {
  for (let index = 0; index < rows.length; index += 200) {
    const chunk = rows.slice(index, index + 200);
    await query(`
      insert into ingredient_modifiers (
        modifier_text, normalized_text, modifier_type, normalized_value, language, strength,
        confidence_score, notes, source_name, updated_at
      )
      values ${chunk.map((row) => `(
        ${sqlString(row.modifier_text)},
        ${sqlString(row.normalized_text)},
        ${sqlString(row.modifier_type)},
        ${sqlString(row.normalized_value)},
        ${sqlString(row.language)},
        ${sqlString(row.strength)},
        ${sqlNumber(row.confidence_score, 1)},
        ${sqlString(row.notes)},
        'curated',
        now()
      )`).join(",\n")}
      on conflict (modifier_text, modifier_type, normalized_value, language) do update set
        normalized_text = excluded.normalized_text,
        strength = excluded.strength,
        confidence_score = excluded.confidence_score,
        notes = excluded.notes,
        active = true,
        updated_at = now();
    `);
  }
}

async function deactivateCuratedModifiersNotInSeed(rows) {
  const keys = rows.map((row) => `(${sqlString(row.modifier_text)}, ${sqlString(row.modifier_type)}, ${sqlString(row.normalized_value)}, ${sqlString(row.language)})`);
  await query(`
    update ingredient_modifiers
    set active = false, updated_at = now()
    where source_name = 'curated'
      and (modifier_text, modifier_type, normalized_value, language) not in (
        values ${keys.join(",\n")}
      );
  `);
}

function parseArgs(argv) {
  const parsed = { environment: "", dryRun: false, allowProdWrite: false };
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
    throw new Error(`Refusing to seed ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}
