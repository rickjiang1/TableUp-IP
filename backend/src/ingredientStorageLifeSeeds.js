import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/usda-foodkeeper-20250702.json"
);

const source = JSON.parse(readFileSync(sourceFile, "utf8"));

export const ingredientStorageLifeSource = {
  name: "USDA FSIS FoodKeeper Data",
  fileName: source.fileName,
  originalUrl: "https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json",
  retrievedFrom: "https://web.archive.org/web/20250702182320if_/https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json",
  retrievedAt: "2026-06-15",
  archiveTimestamp: "2025-07-02T18:23:20Z"
};

const fdaSafetyNote = "FDA safe handling baseline: keep refrigerator at or below 40F and freezer at or below 0F; refrigerate or freeze meat, poultry, eggs, seafood, and other perishables within 2 hours, or within 1 hour above 90F.";

const appCanonicalDerivations = [
  derive("onions_yellow_white_red_etc", ["onion", "yellow_onion", "white_onion", "red_onion"], ["洋葱", "黄洋葱", "白洋葱", "红洋葱"]),
  derive("onions_spring_or_green", ["scallion", "green_onion", "spring_onion"], ["葱", "小葱", "青葱", "大葱", "香葱"]),
  derive("potatoes", ["potato"], ["土豆", "马铃薯"]),
  derive("sweet_potatoes", ["sweet_potato", "yam"], ["红薯", "地瓜", "紫薯"]),
  derive("tomatoes", ["tomato"], ["番茄", "西红柿"]),
  derive("apples", ["apple"], ["苹果"]),
  derive("bananas", ["banana"], ["香蕉"]),
  derive("avocado", ["avocado"], ["牛油果", "鳄梨"]),
  derive("lettuce_iceberg_romaine", ["lettuce", "romaine_lettuce", "iceberg_lettuce"], ["生菜", "罗马生菜"]),
  derive("lettuce_leaf_spinach", ["spinach"], ["菠菜"]),
  derive("garlic", ["garlic"], ["大蒜", "大蒜头", "蒜头", "蒜"]),
  derive("gingerroot", ["ginger"], ["姜", "生姜"]),
  derive("carrots", ["carrot"], ["胡萝卜", "红萝卜"]),
  derive("eggs_in_shell", ["egg"], ["鸡蛋", "蛋"]),
  derive("milk", ["milk"], ["牛奶"]),
  derive("butter", ["butter"], ["黄油", "牛油"]),
  derive("beef_steaks", ["beef", "steak"], ["牛肉", "牛排"]),
  derive("beef_short_ribs", ["beef_short_rib", "short_rib"], ["牛肋条", "牛小排", "牛短肋"]),
  derive("beef_ground", ["ground_beef"], ["牛肉馅", "牛绞肉"]),
  derive("pork_chops", ["pork", "pork_chop"], ["猪肉", "猪排"]),
  derive("chicken_parts_breast_halves_boneless", ["chicken_breast"], ["鸡胸肉", "鸡胸"]),
  derive("chicken_parts_legs_or_thighs", ["chicken_thigh", "chicken_leg"], ["鸡腿", "鸡腿肉", "鸡翅根"]),
  derive("chicken_whole", ["chicken"], ["鸡肉", "整鸡"]),
  derive("shrimp", ["shrimp"], ["虾", "鲜虾"]),
  derive("salmon", ["salmon"], ["三文鱼", "鲑鱼"]),
  derive("rice_white_or_wild", ["rice", "white_rice"], ["米", "大米", "白米"]),
  derive("rice_brown", ["brown_rice"], ["糙米"]),
  derive("tofu", ["tofu"], ["豆腐"]),
  derive("soy_sauce_or_teriyaki_sauce", ["soy_sauce"], ["酱油", "生抽", "老抽"]),
  derive("vinegar_white", ["white_vinegar", "vinegar"], ["白醋", "醋"]),
  derive("apple_cider_vinegar", ["apple_cider_vinegar"], ["苹果醋"]),
  derive("salt_table_plain_or_iodized", ["salt"], ["盐", "食盐"]),
  derive("sugar_granulated", ["sugar"], ["糖", "白糖", "砂糖"]),
  derive("spice_spices_ground", ["spice", "ground_spice"], ["香料", "调料粉"]),
  derive("spice_spices_whole", ["whole_spice"], ["整粒香料"]),
  derive("flour_white", ["flour", "all_purpose_flour"], ["面粉", "中筋面粉"]),
  derive("honey", ["honey"], ["蜂蜜"]),
  derive("peanut_butter_commercial", ["peanut_butter"], ["花生酱"])
];

const supplementalRules = [
  supplemental("barbecue_sauce_bottled", "Condiments, Sauces & Canned Goods", ["barbecue sauce", "bbq sauce", "烧烤酱"], "room_temperature", 30, "after_opening", "StillTasty", "https://www.stilltasty.com/Fooditems/index/16454", "USDA FoodKeeper covers opened refrigerated BBQ sauce; StillTasty adds opened pantry best-quality guidance. Use shorter time for room-temperature opened storage."),
  supplemental("fish_sauce", "Condiments, Sauces & Canned Goods", ["fish sauce", "鱼露"], "room_temperature", 365, "default", "StillTasty", "https://www.stilltasty.com/searchitems/index/6", "Supplemental condiment rule because USDA FoodKeeper data did not include a fish sauce product row in this dataset."),
  supplemental("rice_vinegar", "Condiments, Sauces & Canned Goods", ["rice vinegar", "米醋", "米酒醋"], "room_temperature", 730, "default", "StillTasty", "https://www.stilltasty.com/searchitems/index/6", "Supplemental vinegar rule; acidic condiments are generally shelf-stable when unopened and properly stored."),
  supplemental("sriracha", "Condiments, Sauces & Canned Goods", ["sriracha", "sriracha sauce", "是拉差", "辣椒酱"], "room_temperature", 180, "default", "USDA FoodKeeper derived hot sauce", ingredientStorageLifeSource.originalUrl, "USDA FoodKeeper has a hot sauce rule but not a Sriracha-specific row; mapped conservatively to hot sauce."),
  supplemental("gochujang", "Condiments, Sauces & Canned Goods", ["gochujang", "korean chili paste", "韩式辣酱"], "cold", 365, "default", "StillTasty", "https://www.stilltasty.com/searchitems/index/6", "Supplemental fermented condiment rule; keep refrigerated after opening when label recommends."),
  supplemental("olive_oil", "Condiments, Sauces & Canned Goods", ["olive oil", "橄榄油"], "room_temperature", 365, "default", "StillTasty", "https://www.stilltasty.com/searchitems/index/6", "Supplemental oil rule because USDA FoodKeeper data did not include olive oil in this dataset."),
  supplemental("dry_beans", "Grains, Beans & Pasta", ["dry beans", "dried beans", "black beans", "kidney beans", "pinto beans", "干豆", "黑豆", "红腰豆"], "room_temperature", 365, "default", "USDA FoodKeeper analogous dry legumes", ingredientStorageLifeSource.originalUrl, "USDA FoodKeeper includes dried lentils; dry beans are added as a conservative analogous dry-legume rule."),
  supplemental("frozen_fruit_category", "Fruit", ["fruit", "水果"], "frozen", 240, "default", "UGA/NCHFP", "https://nchfp.uga.edu/how/freeze/freeze-general-information/how-long-can-i-store-frozen-foods/", "NCHFP lists frozen fruits and vegetables at 8-12 months; TableUp uses the conservative 8-month value."),
  supplemental("frozen_vegetable_category", "Vegetable", ["vegetable", "蔬菜"], "frozen", 240, "default", "UGA/NCHFP", "https://nchfp.uga.edu/how/freeze/freeze-general-information/how-long-can-i-store-frozen-foods/", "NCHFP lists frozen fruits and vegetables at 8-12 months; TableUp uses the conservative 8-month value."),
  supplemental("frozen_poultry_category", "Meat", ["poultry", "chicken", "turkey", "鸡肉", "火鸡"], "frozen", 180, "default", "UGA/NCHFP", "https://nchfp.uga.edu/how/freeze/freeze-general-information/how-long-can-i-store-frozen-foods/", "NCHFP lists frozen poultry at 6-9 months; TableUp uses the conservative 6-month value."),
  supplemental("frozen_fish_category", "Seafood", ["fish", "seafood", "鱼", "海鲜"], "frozen", 90, "default", "UGA/NCHFP", "https://nchfp.uga.edu/how/freeze/freeze-general-information/how-long-can-i-store-frozen-foods/", "NCHFP lists frozen fish at 3-6 months; TableUp uses the conservative 3-month value."),
  supplemental("frozen_ground_meat_category", "Meat", ["ground meat", "ground beef", "ground pork", "肉馅", "绞肉"], "frozen", 90, "default", "UGA/NCHFP", "https://nchfp.uga.edu/how/freeze/freeze-general-information/how-long-can-i-store-frozen-foods/", "NCHFP lists frozen ground meat at 3-4 months; TableUp uses the conservative 3-month value.")
];

export const ingredientStorageLifeRules = buildRules(source);

function buildRules(foodKeeperData) {
  const categories = new Map(sheetRows(foodKeeperData, "Category").map((row) => [row.ID, row]));
  const products = sheetRows(foodKeeperData, "Product");
  const rows = [];

  for (const product of products) {
    const category = categories.get(product.Category_ID);
    const base = baseRuleFields(product, category);
    rows.push(...defaultStorageRules(product, base));
    rows.push(...conditionStorageRules(product, base, "after_opening", [
      ["room_temperature", "Pantry_After_Opening"],
      ["cold", "Refrigerate_After_Opening"]
    ]));
    rows.push(...conditionStorageRules(product, base, "after_thawing", [
      ["cold", "Refrigerate_After_Thawing"]
    ]));
  }

  const enrichedRows = mergeSupplementalRules([
    ...rows,
    ...deriveAppCanonicalRows(rows),
    ...supplementalRules
  ]);

  return enrichedRows.sort((left, right) =>
    left.priority - right.priority ||
    left.ingredient_id.localeCompare(right.ingredient_id) ||
    left.storage_approach.localeCompare(right.storage_approach) ||
    left.condition_state.localeCompare(right.condition_state)
  );
}

function defaultStorageRules(product, base) {
  return [
    ["room_temperature", "DOP_Pantry", "Pantry"],
    ["cold", "DOP_Refrigerate", "Refrigerate"],
    ["frozen", "DOP_Freeze", "Freeze"]
  ].flatMap(([storageApproach, dateOfPurchasePrefix, fallbackPrefix]) => {
    const fromPurchase = storageRule(product, dateOfPurchasePrefix, storageApproach, "default", base);
    return fromPurchase ? [fromPurchase] : compact([storageRule(product, fallbackPrefix, storageApproach, "default", base)]);
  });
}

function conditionStorageRules(product, base, conditionState, fields) {
  return fields.flatMap(([storageApproach, prefix]) =>
    compact([storageRule(product, prefix, storageApproach, conditionState, base)])
  );
}

function storageRule(product, prefix, storageApproach, conditionState, base) {
  const metric = stringValue(product[`${prefix}_Metric`]);
  const days = metricToDays(product[`${prefix}_Min`], product[`${prefix}_Max`], metric);
  if (days === null) {
    return null;
  }

  return {
    ...base,
    storage_approach: storageApproach,
    storage_location: "",
    default_days: days,
    condition_state: conditionState,
    notes: buildNotes(product, prefix, metric),
    source_name: ingredientStorageLifeSource.name,
    source_url: ingredientStorageLifeSource.originalUrl,
    source_priority: 1,
    safety_note: safetyNoteFor(base.category, storageApproach, product, metric),
    active: true
  };
}

function baseRuleFields(product, category) {
  const productName = [product.Name, product.Name_subtitle].map(stringValue).filter(Boolean).join(" ");
  const categoryName = [category?.Category_Name, category?.Subcategory_Name].map(stringValue).filter(Boolean).join(" / ");
  const aliases = aliasesForProduct(product, productName);

  return {
    ingredient_id: slugify(productName || `foodkeeper_product_${product.ID}`),
    category: categoryName,
    aliases,
    priority: Number(product.ID) || 1000
  };
}

function aliasesForProduct(product, productName) {
  const aliases = new Set();
  addAlias(aliases, productName);
  addAlias(aliases, product.Name);
  addAlias(aliases, product.Name_subtitle);

  for (const keyword of stringValue(product.Keywords).split(",")) {
    addAlias(aliases, keyword);
  }

  const lowerName = stringValue(product.Name).toLowerCase();
  if (lowerName.endsWith("s")) {
    addAlias(aliases, lowerName.slice(0, -1));
  }

  return [...aliases];
}

function derive(sourceIngredientId, appIngredientIds, aliases) {
  return { sourceIngredientId, appIngredientIds, aliases };
}

function deriveAppCanonicalRows(rows) {
  const derivedRows = [];
  for (const mapping of appCanonicalDerivations) {
    const sourceRows = rows.filter((row) => row.ingredient_id === mapping.sourceIngredientId);
    for (const row of sourceRows) {
      for (const ingredientId of mapping.appIngredientIds) {
        derivedRows.push({
          ...row,
          ingredient_id: ingredientId,
          aliases: uniqueText([...row.aliases, ...mapping.appIngredientIds, ...mapping.aliases]),
          priority: Math.max(1, row.priority - 1),
          notes: appendNote(row.notes, `TableUp canonical mapping from USDA FoodKeeper product '${mapping.sourceIngredientId}'.`)
        });
      }
    }
  }
  return derivedRows;
}

function supplemental(ingredientId, category, aliases, storageApproach, defaultDays, conditionState, sourceName, sourceUrl, safetyNote) {
  return {
    ingredient_id: ingredientId,
    category,
    aliases: uniqueText([ingredientId, ...aliases]),
    priority: 20_000,
    storage_approach: storageApproach,
    storage_location: "",
    default_days: defaultDays,
    condition_state: conditionState,
    notes: `Supplemental storage rule from ${sourceName}.`,
    source_name: sourceName,
    source_url: sourceUrl,
    source_priority: sourcePriority(sourceName),
    safety_note: safetyNote,
    active: true
  };
}

function mergeSupplementalRules(rows) {
  const merged = new Map();
  for (const row of rows) {
    const key = [
      row.ingredient_id,
      row.category,
      row.storage_approach,
      row.storage_location,
      row.condition_state
    ].join("::");
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      continue;
    }

    const winner = chooseConservativeRule(existing, row);
    merged.set(key, {
      ...winner,
      aliases: uniqueText([...existing.aliases, ...row.aliases]),
      notes: appendNote(winner.notes, conflictNote(existing, row, winner)),
      safety_note: uniqueText([existing.safety_note, row.safety_note, conflictSafetyNote(existing, row)]).join(" ")
    });
  }
  return [...merged.values()];
}

function chooseConservativeRule(left, right) {
  if (left.source_priority !== right.source_priority) {
    return left.source_priority < right.source_priority ? left : right;
  }
  return left.default_days <= right.default_days ? left : right;
}

function conflictNote(left, right, winner) {
  if (left.default_days === right.default_days) {
    return "";
  }
  return `Conflict resolved conservatively: ${left.source_name || "source A"}=${left.default_days} days, ${right.source_name || "source B"}=${right.default_days} days; using ${winner.default_days} days.`;
}

function conflictSafetyNote(left, right) {
  if (left.default_days === right.default_days) {
    return "";
  }
  return "When sources conflict at the same priority, TableUp stores the shorter shelf life.";
}

function sourcePriority(sourceName) {
  const clean = stringValue(sourceName).toLowerCase();
  if (clean.includes("usda") || clean.includes("fda")) {
    return 1;
  }
  if (clean.includes("uga") || clean.includes("nchfp")) {
    return 2;
  }
  if (clean.includes("stilltasty")) {
    return 3;
  }
  return 10;
}

function safetyNoteFor(category, storageApproach, product, metric) {
  const notes = [];
  const categoryText = stringValue(category).toLowerCase();
  if (storageApproach === "cold" || storageApproach === "frozen" || /(meat|poultry|seafood|dairy|eggs|deli|prepared)/.test(categoryText)) {
    notes.push(fdaSafetyNote);
  }
  if (stringValue(metric).toLowerCase() === "not recommended") {
    notes.push("USDA FoodKeeper marks this storage approach as not recommended.");
  }
  if (storageApproach === "frozen") {
    notes.push("UGA/NCHFP notes frozen storage preserves quality but does not sterilize food; package correctly and keep at 0F or lower.");
  }
  if (stringValue(product.Name).toLowerCase().includes("garlic") && stringValue(product.Name_subtitle).toLowerCase().includes("oil")) {
    notes.push("Garlic-in-oil has botulism risk if mishandled; keep refrigerated or frozen according to source guidance.");
  }
  return uniqueText(notes).join(" ");
}

function addAlias(aliases, value) {
  const clean = stringValue(value).replace(/\s+/g, " ").trim();
  if (clean) {
    aliases.add(clean);
    aliases.add(clean.toLowerCase());
  }
}

function appendNote(existing, note) {
  return compact([existing, note]).join("; ");
}

function uniqueText(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const clean = stringValue(value).replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(clean);
  }
  return output;
}

function buildNotes(product, prefix, metric) {
  const tip = stringValue(product[`${prefix}_tips`] ?? product[`${prefix}_Tips`]);
  const range = rangeLabel(product[`${prefix}_Min`], product[`${prefix}_Max`], metric);
  return compact([
    `USDA FoodKeeper product ${product.ID}`,
    range ? `range: ${range}` : "",
    tip
  ]).join("; ");
}

function rangeLabel(minimum, maximum, metric) {
  const min = numericValue(minimum);
  const max = numericValue(maximum);
  const cleanMetric = stringValue(metric);
  if (min !== null && max !== null) {
    return `${min}-${max} ${cleanMetric}`.trim();
  }
  if (max !== null) {
    return `${max} ${cleanMetric}`.trim();
  }
  if (cleanMetric) {
    return cleanMetric;
  }
  return "";
}

function metricToDays(minimum, maximum, metric) {
  const cleanMetric = stringValue(metric).toLowerCase();
  const max = numericValue(maximum);
  const min = numericValue(minimum);
  const value = max ?? min;

  if (cleanMetric === "not recommended") {
    return 0;
  }
  if (cleanMetric === "indefinitely") {
    return 3650;
  }
  if (cleanMetric === "when ripe") {
    return value === null ? null : Math.max(1, value);
  }
  if (cleanMetric === "package use-by date") {
    return null;
  }
  if (value === null) {
    return null;
  }

  switch (cleanMetric) {
  case "day":
  case "days":
    return Math.round(value);
  case "week":
  case "weeks":
    return Math.round(value * 7);
  case "month":
  case "months":
    return Math.round(value * 30);
  case "year":
  case "years":
    return Math.round(value * 365);
  default:
    return null;
  }
}

function sheetRows(foodKeeperData, sheetName) {
  return foodKeeperData.sheets
    .find((sheet) => sheet.name === sheetName)
    ?.data.map((row) => Object.assign({}, ...row)) ?? [];
}

function slugify(value) {
  return stringValue(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compact(values) {
  return values.filter((value) => value !== null && value !== undefined && value !== "");
}
