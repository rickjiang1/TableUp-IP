import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

async function main() {
  if (!args.environment || !environmentTargets[args.environment]) {
    console.error("Usage: node backend/src/import-ingredients-csv.js --env dev /path/to/Ingredient.csv");
    console.error("Use --env prod --allow-prod-write only for an intentional production import.");
    process.exit(1);
  }
  if (args.environment === "prod" && !args.allowProdWrite) {
    console.error("Refusing to write production data without --allow-prod-write.");
    process.exit(1);
  }

  assertTargetEnvironment(args.environment);

  const csvPath = args.csvPath ? resolve(args.csvPath) : "";
  if (!csvPath || !existsSync(csvPath)) {
    console.error("CSV path is required.");
    process.exit(1);
  }

  const ingredients = parseCsv(readFileSync(csvPath, "utf8"))
    .map((row) => ({
      ingredient_id: cleanId(row.ingredient_id),
      canonical_name: String(row.canonical_name || "").trim(),
      category: String(row.category || "other").trim() || "other"
    }))
    .filter((row) => row.ingredient_id && row.canonical_name && row.category !== "category");

  const aliases = buildAliasRows(ingredients);

  console.log(`Target Supabase project: ${environmentTargets[args.environment].label} (${environmentTargets[args.environment].projectRef})`);

  let updatedRecipeIngredients = 0;
  if (!args.dryRun) {
    await upsertRows("ingredients?on_conflict=ingredient_id", ingredients, 200);
    await upsertRows("ingredient_aliases?on_conflict=alias_name", aliases, 200);
    updatedRecipeIngredients = await backfillRecipeIngredientIds(ingredients, aliases);
  }

  console.log(JSON.stringify({
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    ingredients: ingredients.length,
    aliases: aliases.length,
    recipeIngredientsBackfilled: updatedRecipeIngredients
  }, null, 2));
}

function parseArgs(argv) {
  const parsed = {
    environment: "",
    csvPath: "",
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
      continue;
    }
    if (value === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (!value.startsWith("--") && !parsed.csvPath) {
      parsed.csvPath = value;
    }
  }

  return parsed;
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const url = requiredEnv("SUPABASE_URL");
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    throw new Error("SUPABASE_URL must be a valid Supabase URL.");
  }
  if (!host.startsWith(`${target.projectRef}.`)) {
    throw new Error(`Refusing to write ${target.label}. SUPABASE_URL points to ${host}, expected project ref ${target.projectRef}.`);
  }
}


function buildAliasRows(ingredientRows) {
  const byAlias = new Map();

  for (const ingredient of ingredientRows) {
    const aliases = generatedAliasesForIngredient(ingredient);
    for (const alias of aliases) {
      addAlias(byAlias, ingredient, alias, aliasConfidence(alias, ingredient), true);
    }
  }

  for (const [ingredientId, aliases] of Object.entries(manualAliases)) {
    const ingredient = ingredientRows.find((row) => row.ingredient_id === ingredientId);
    if (!ingredient) {
      continue;
    }
    for (const alias of aliases) {
      addAlias(byAlias, ingredient, alias, 1, true);
      if (ingredient.category === "protein" && containsCjk(alias)) {
        for (const productAlias of chineseProteinProductAliases(alias)) {
          addAlias(byAlias, ingredient, productAlias, 0.9, true);
        }
      }
    }
  }

  return [...byAlias.values()].sort((left, right) => {
    const ingredientCompare = left.ingredient_id.localeCompare(right.ingredient_id);
    return ingredientCompare || left.alias_name.localeCompare(right.alias_name);
  });
}

function generatedAliasesForIngredient(ingredient) {
  const base = new Set();
  const idWords = ingredient.ingredient_id.replace(/_/g, " ");
  const canonical = ingredient.canonical_name;

  addAliasVariant(base, ingredient.ingredient_id);
  addAliasVariant(base, idWords);
  addAliasVariant(base, canonical);
  for (const piece of canonical.split(/[\/,;]/g)) {
    addAliasVariant(base, piece);
  }
  for (const piece of canonical.match(/\(([^)]+)\)/g) || []) {
    addAliasVariant(base, piece.replace(/[()]/g, ""));
  }

  const expanded = new Set(base);
  for (const alias of base) {
    addAliasVariant(expanded, alias.replace(/-/g, " "));
    addAliasVariant(expanded, alias.replace(/\s+/g, "-"));
    addAliasVariant(expanded, singularize(alias));
    addAliasVariant(expanded, pluralize(alias));
  }

  if (ingredient.category === "protein") {
    for (const alias of [...expanded]) {
      if (!alias || containsCjk(alias)) {
        continue;
      }
      for (const prefix of ["fresh", "frozen", "boneless", "skinless", "boneless skinless", "sliced", "thin sliced", "ground", "american wagyu", "wagyu"]) {
        addAliasVariant(expanded, `${prefix} ${alias}`);
      }
    }
  }

  return [...expanded].filter(Boolean);
}

function addAliasVariant(set, value) {
  const alias = String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
  if (alias && alias.length <= 96) {
    set.add(alias);
  }
}

function addAlias(byAlias, ingredient, aliasName, confidenceScore, verified) {
  const alias = String(aliasName || "").trim();
  if (!alias) {
    return;
  }
  const key = alias.toLowerCase();
  const existing = byAlias.get(key);
  if (existing && Number(existing.confidence_score || 0) >= confidenceScore) {
    return;
  }
  byAlias.set(key, {
    alias_name: alias,
    ingredient_id: ingredient.ingredient_id,
    canonical_name: ingredient.canonical_name,
    language: containsCjk(alias) ? "zh" : "en",
    category: ingredient.category,
    confidence_score: confidenceScore,
    verified
  });
}

function aliasConfidence(alias, ingredient) {
  if (alias === ingredient.canonical_name || alias === ingredient.ingredient_id || alias === ingredient.ingredient_id.replace(/_/g, " ")) {
    return 1;
  }
  return 0.88;
}

async function backfillRecipeIngredientIds(ingredientRows, aliasRows) {
  const resolver = buildResolver(ingredientRows, aliasRows);
  const recipeIngredients = await restRequest("pantry_recipe_ingredients?select=ingredient_id,name,canonical_ingredient_id", { method: "GET" });
  let count = 0;

  for (const row of recipeIngredients) {
    if (row.canonical_ingredient_id && ingredientRows.some((ingredient) => ingredient.ingredient_id === row.canonical_ingredient_id)) {
      continue;
    }
    const resolved = resolver.resolve(row.name);
    if (!resolved) {
      continue;
    }
    await restRequest(`pantry_recipe_ingredients?ingredient_id=eq.${encodeURIComponent(row.ingredient_id)}`, {
      method: "PATCH",
      body: JSON.stringify({ canonical_ingredient_id: resolved })
    });
    count += 1;
  }

  return count;
}

function buildResolver(ingredientRows, aliasRows) {
  const byName = new Map();
  const byAlias = new Map();
  for (const ingredient of ingredientRows) {
    byName.set(normalizeName(ingredient.ingredient_id), ingredient.ingredient_id);
    byName.set(normalizeName(ingredient.canonical_name), ingredient.ingredient_id);
  }
  for (const alias of aliasRows) {
    byAlias.set(normalizeName(alias.alias_name), alias.ingredient_id);
  }
  return {
    resolve(value) {
      for (const candidate of nameCandidates(value)) {
        if (byName.has(candidate)) {
          return byName.get(candidate);
        }
        if (byAlias.has(candidate)) {
          return byAlias.get(candidate);
        }
      }
      return "";
    }
  };
}

function nameCandidates(value) {
  const normalized = normalizeName(value);
  if (!normalized) {
    return [];
  }
  const candidates = new Set([normalized]);
  const englishDescriptorPattern = /\b(american|usa?|usda|choice|prime|select|wagyu|angus|black angus|organic|grass fed|frozen|fresh|raw|cooked|boneless|bone in|bone-in|skinless|skin on|skin-on|thin sliced|thin-sliced|sliced|diced|cubed|whole|trimmed|tray|pack|package)\b/g;
  candidates.add(normalizeName(normalized.replace(/\([^)]*\)/g, " ")));
  candidates.add(normalizeName(normalized.replace(englishDescriptorPattern, " ")));
  let strippedChinese = normalized;
  for (const descriptor of chineseDescriptorWords) {
    strippedChinese = strippedChinese.replaceAll(descriptor, " ");
  }
  candidates.add(normalizeName(strippedChinese));
  return [...candidates].filter(Boolean);
}

async function upsertRows(path, rows, chunkSize) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    await restRequest(path, {
      method: "POST",
      body: JSON.stringify(chunk),
      prefer: "resolution=merge-duplicates"
    });
  }
}

async function restRequest(path, { method, body, prefer }) {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return [];
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((csvRow) => csvRow.some((value) => String(value || "").trim()));
  const [headers = [], ...dataRows] = nonEmptyRows;
  const cleanHeaders = headers.map((header) => header.replace(/^\ufeff/, "").trim());
  return dataRows.map((values) => Object.fromEntries(cleanHeaders.map((header, index) => [header, values[index] || ""])));
}

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

function singularize(value) {
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("es")) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }
  return value;
}

function pluralize(value) {
  if (value.endsWith("s")) {
    return value;
  }
  if (value.endsWith("y")) {
    return `${value.slice(0, -1)}ies`;
  }
  return `${value}s`;
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(value);
}

function chineseProteinProductAliases(alias) {
  const variants = new Set();
  for (const prefix of ["美国", "澳洲", "日本", "加拿大", "美国和牛", "和牛", "冷冻", "冰鲜", "新鲜"]) {
    variants.add(`${prefix}${alias}`);
  }
  for (const modifier of ["无骨", "去骨", "带骨", "去皮", "带皮", "切片", "薄切", "火锅", "烧烤"]) {
    variants.add(`${modifier}${alias}`);
    variants.add(`${alias}${modifier}`);
  }
  for (const prefix of ["美国和牛", "和牛", "冷冻", "澳洲"]) {
    for (const modifier of ["无骨", "去骨", "带骨", "切片", "薄切", "火锅"]) {
      variants.add(`${prefix}${modifier}${alias}`);
      variants.add(`${prefix}${alias}${modifier}`);
    }
  }
  return [...variants].filter((value) => value.length <= 96);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
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
      const index = trimmed.indexOf("=");
      if (index === -1) {
        continue;
      }
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  }
}

const chineseDescriptorWords = [
  "美国和牛",
  "黑安格斯",
  "美国",
  "澳洲",
  "日本",
  "加拿大",
  "和牛",
  "有机",
  "冷冻",
  "冰鲜",
  "新鲜",
  "无骨",
  "去骨",
  "带骨",
  "去皮",
  "带皮",
  "切片",
  "薄切",
  "火锅",
  "烧烤",
  "袋装",
  "盒装"
];

const manualAliases = {
  egg: ["鸡蛋", "蛋", "鸡蛋液", "whole egg"],
  tomato: ["番茄", "西红柿", "tomatoes"],
  scallion: ["葱", "小葱", "香葱", "青葱", "green onion", "green onions", "spring onion", "spring onions"],
  cilantro: ["香菜", "芫荽", "coriander", "coriander leaf"],
  parsley: ["欧芹", "洋香菜"],
  garlic: ["蒜", "大蒜", "蒜头", "garlic clove"],
  ginger: ["姜", "生姜"],
  onion: ["洋葱"],
  shallot: ["红葱头", "干葱", "小洋葱"],
  cucumber: ["黄瓜", "青瓜"],
  carrot: ["胡萝卜", "红萝卜"],
  potato: ["土豆", "马铃薯"],
  sweet_potato: ["红薯", "地瓜", "番薯"],
  napa_cabbage: ["白菜", "大白菜", "娃娃菜"],
  bok_choy: ["小白菜", "青江菜", "上海青"],
  cabbage: ["卷心菜", "包菜", "高丽菜"],
  chinese_broccoli: ["芥兰", "中国芥兰"],
  broccoli: ["西兰花", "花椰菜"],
  cauliflower: ["菜花", "白花菜"],
  spinach: ["菠菜"],
  lettuce: ["生菜", "莴苣"],
  eggplant: ["茄子"],
  zucchini: ["西葫芦"],
  celery: ["芹菜"],
  corn: ["玉米"],
  daikon: ["白萝卜", "萝卜"],
  radish: ["萝卜", "樱桃萝卜"],
  lotus_root: ["莲藕", "藕"],
  bamboo_shoot: ["竹笋", "笋"],
  mushroom: ["蘑菇", "菌菇"],
  shiitake_mushroom: ["香菇", "冬菇"],
  enoki_mushroom: ["金针菇"],
  king_oyster_mushroom: ["杏鲍菇"],
  wood_ear_mushroom: ["木耳", "黑木耳"],
  bell_pepper: ["甜椒", "彩椒", "青椒"],
  jalapeno: ["墨西哥辣椒"],
  chili_pepper: ["辣椒", "红辣椒", "青辣椒"],
  apple: ["苹果"],
  banana: ["香蕉"],
  orange: ["橙子", "橙"],
  lemon: ["柠檬"],
  lime: ["青柠", "莱姆"],
  strawberry: ["草莓"],
  blueberry: ["蓝莓"],
  avocado: ["牛油果", "鳄梨"],
  milk: ["牛奶"],
  heavy_cream: ["淡奶油", "重奶油"],
  cream: ["奶油"],
  butter: ["黄油", "牛油"],
  cheese: ["奶酪", "芝士"],
  yogurt: ["酸奶"],
  tofu: ["豆腐"],
  soft_tofu: ["嫩豆腐", "内酯豆腐"],
  firm_tofu: ["老豆腐", "硬豆腐"],
  rice: ["米饭", "大米", "白米"],
  flour: ["面粉"],
  noodle: ["面条"],
  rice_noodle: ["米粉", "河粉"],
  vermicelli: ["粉丝", "冬粉"],
  chicken: ["鸡肉", "整鸡"],
  chicken_breast: ["鸡胸", "鸡胸肉", "chicken breast meat"],
  chicken_thigh: ["鸡腿肉", "鸡腿排", "chicken thigh meat"],
  chicken_wing: ["鸡翅", "鸡翼"],
  chicken_drumstick: ["鸡小腿", "鸡腿"],
  chicken_leg: ["鸡腿"],
  chicken_feet: ["鸡爪", "凤爪"],
  chicken_liver: ["鸡肝"],
  chicken_gizzard: ["鸡胗", "鸡肫"],
  pork: ["猪肉"],
  ground_pork: ["猪肉末", "猪绞肉", "肉馅", "猪肉馅", "minced pork"],
  pork_belly: ["五花肉", "猪五花", "三层肉"],
  pork_rib: ["排骨", "猪排骨"],
  pork_spare_rib: ["肋排", "猪肋排", "spare ribs", "spareribs"],
  pork_back_rib: ["猪背肋", "baby back ribs", "back ribs"],
  pork_tenderloin: ["猪里脊", "里脊肉"],
  pork_shoulder: ["猪肩肉", "梅花肉"],
  pork_butt: ["猪梅肉", "梅头肉", "boston butt"],
  pork_loin: ["猪外脊", "猪通脊"],
  pork_chop: ["猪排"],
  pork_hock: ["猪肘", "肘子", "蹄膀"],
  pork_jowl: ["猪颈肉", "猪脸肉"],
  pork_feet: ["猪蹄", "猪脚"],
  pork_ear: ["猪耳", "猪耳朵"],
  pork_liver: ["猪肝"],
  pork_intestine: ["猪大肠", "肥肠"],
  beef: ["牛肉"],
  ground_beef: ["牛肉末", "牛绞肉", "牛肉馅", "minced beef"],
  beef_brisket: ["牛腩", "牛胸肉", "brisket"],
  beef_shank: ["牛腱", "牛腱子", "beef heel muscle"],
  beef_chuck: ["牛肩肉", "肩胛肉"],
  beef_rib: ["牛肋排", "牛排骨"],
  beef_short_rib: ["牛肋条", "牛小排", "牛仔骨", "短肋", "short rib", "short ribs", "flanken ribs", "galbi"],
  beef_plate: ["牛腹肉", "牛胸腹肉"],
  beef_short_plate: ["牛腹肋", "short plate"],
  beef_flank: ["牛腩排", "腹肉", "flank steak"],
  beef_round: ["牛后腿肉", "round steak"],
  beef_liver: ["牛肝"],
  beef_tongue: ["牛舌"],
  beef_oxtail: ["牛尾", "oxtail"],
  beef_cheek: ["牛脸肉", "牛颊肉"],
  beef_tri_tip: ["三角肉", "tri tip"],
  beef_strip_steak: ["西冷", "纽约客", "new york strip", "striploin"],
  beef_t_bone: ["丁骨牛排", "t bone"],
  beef_porterhouse: ["红屋牛排"],
  beef_filet_mignon: ["菲力", "菲力牛排", "filet"],
  beef_tenderloin: ["牛柳", "牛里脊", "tenderloin"],
  beef_skirt_steak: ["裙边牛排", "skirt steak"],
  beef_hanger_steak: ["吊龙伴", "hanger steak"],
  beef_flat_iron: ["板腱", "flat iron"],
  beef_chuck_roast: ["肩胛烤肉", "chuck roast"],
  beef_stew_meat: ["炖牛肉", "牛肉块", "stew beef"],
  hot_pot_beef: ["肥牛", "火锅肥牛", "牛肉卷", "涮牛肉"],
  rib_eye: ["肋眼", "肉眼", "ribeye", "rib eye steak"],
  short_ribs: ["牛小排", "牛肋条", "短肋"],
  picanha: ["巴西臀盖", "牛臀盖", "picahna"],
  zabuton: ["雪花牛肉", "牛肩小排"],
  misuji: ["板腱", "嫩肩"],
  karubi: ["牛五花", "烤肉牛小排"],
  tan: ["牛舌"],
  harami: ["横膈膜", "牛横膈膜"],
  lamb: ["羊肉"],
  lamb_chop: ["羊排"],
  lamb_shank: ["羊腱", "羊小腿"],
  shrimp: ["虾", "虾仁", "大虾"],
  fish: ["鱼", "鱼肉"],
  salmon: ["三文鱼", "鲑鱼"],
  cod: ["鳕鱼"],
  tilapia: ["罗非鱼"],
  tuna: ["金枪鱼", "吞拿鱼"],
  crab: ["螃蟹", "蟹"],
  lobster: ["龙虾"],
  clam: ["蛤蜊", "花蛤"],
  mussel: ["青口", "淡菜"],
  squid: ["鱿鱼"],
  scallop: ["扇贝", "带子", "干贝"],
  salt: ["盐", "食盐"],
  oil: ["油", "食用油"],
  sugar: ["糖", "白糖"],
  vinegar: ["醋"],
  black_pepper: ["黑胡椒", "黑椒"],
  white_pepper: ["白胡椒"],
  soy_sauce: ["酱油", "生抽"],
  soy_sauce_light: ["生抽"],
  soy_sauce_dark: ["老抽"],
  sesame_oil: ["香油", "芝麻油"],
  chili_oil: ["辣椒油", "红油"],
  doubanjiang: ["豆瓣酱", "郫县豆瓣酱"],
  oyster_sauce: ["蚝油"],
  hoisin_sauce: ["海鲜酱"],
  fish_sauce: ["鱼露"],
  shaoxing_wine: ["绍兴酒", "料酒", "黄酒"],
  rice_vinegar: ["米醋"],
  olive_oil: ["橄榄油"],
  peanut_oil: ["花生油"],
  canola_oil: ["菜籽油"],
  coconut_milk: ["椰奶", "椰浆"],
  tomato_paste: ["番茄膏", "番茄酱膏"],
  chicken_stock: ["鸡汤", "鸡高汤"],
  beef_stock: ["牛肉高汤", "牛高汤"],
  miso: ["味噌"],
  gochujang: ["韩式辣酱"],
  sriracha: ["是拉差", "是拉差辣酱"],
  chili_crisp: ["油泼辣子", "辣椒脆"],
  five_spice: ["五香粉"],
  star_anise: ["八角", "大料"],
  cinnamon: ["肉桂", "桂皮"],
  cumin: ["孜然"],
  paprika: ["红椒粉"],
  turmeric: ["姜黄"],
  curry_powder: ["咖喱粉"],
  curry_block: ["咖喱块"],
  cornstarch: ["玉米淀粉", "生粉"],
  baking_soda: ["小苏打"],
  baking_powder: ["泡打粉"]
};

await main();
