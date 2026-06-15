export const unitAliasRows = [
  alias("piece", "piece"), alias("pieces", "piece"), alias("pc", "piece"), alias("pcs", "piece"), alias("each", "piece"), alias("ea", "piece"), alias("count", "piece"), alias("ct", "piece"),
  alias("个", "piece", "zh"), alias("颗", "piece", "zh"), alias("只", "piece", "zh"), alias("根", "piece", "zh"),
  alias("whole", "whole"), alias("wholes", "whole"), alias("entire", "whole"), alias("完整", "whole", "zh"), alias("整", "whole", "zh"),
  alias("half", "half"), alias("halves", "half"), alias("1/2", "half"), alias("半", "half", "zh"),
  alias("head", "head"), alias("heads", "head"), alias("bulb", "bulb"), alias("bulbs", "bulb"), alias("头", "head", "zh"), alias("整头", "head", "zh"),
  alias("clove", "clove"), alias("cloves", "clove"), alias("瓣", "clove", "zh"),
  alias("bunch", "bunch"), alias("bunches", "bunch"), alias("bundle", "bunch"), alias("把", "bunch", "zh"), alias("束", "bunch", "zh"),
  alias("leaf", "leaf"), alias("leaves", "leaf"), alias("叶", "leaf", "zh"),
  alias("slice", "slice"), alias("slices", "slice"), alias("片", "slice", "zh"),
  alias("sprig", "sprig"), alias("sprigs", "sprig"),
  alias("stick", "stick"), alias("sticks", "stick"), alias("条", "stick", "zh"),
  alias("can", "can"), alias("cans", "can"), alias("tin", "can"), alias("tins", "can"), alias("罐", "can", "zh"),
  alias("bottle", "bottle"), alias("bottles", "bottle"), alias("瓶", "bottle", "zh"),
  alias("bag", "bag"), alias("bags", "bag"), alias("袋", "bag", "zh"),
  alias("pack", "pack"), alias("packs", "pack"), alias("package", "pack"), alias("packages", "pack"), alias("pkg", "pack"), alias("pkgs", "pack"), alias("包", "pack", "zh"), alias("盒", "pack", "zh"), alias("盒装", "pack", "zh"),
  alias("tray", "tray"), alias("trays", "tray"),
  alias("gram", "gram"), alias("grams", "gram"), alias("g", "gram"), alias("克", "gram", "zh"),
  alias("kilogram", "kg"), alias("kilograms", "kg"), alias("kg", "kg"), alias("kilo", "kg"), alias("kilos", "kg"), alias("千克", "kg", "zh"), alias("公斤", "kg", "zh"),
  alias("jin", "jin"), alias("斤", "jin", "zh"),
  alias("ounce", "oz"), alias("ounces", "oz"), alias("oz", "oz"), alias("盎司", "oz", "zh"),
  alias("pound", "lb"), alias("pounds", "lb"), alias("lb", "lb"), alias("lbs", "lb"), alias("磅", "lb", "zh"),
  alias("milliliter", "ml"), alias("milliliters", "ml"), alias("millilitre", "ml"), alias("millilitres", "ml"), alias("ml", "ml"), alias("毫升", "ml", "zh"),
  alias("liter", "l"), alias("liters", "l"), alias("litre", "l"), alias("litres", "l"), alias("l", "l"), alias("升", "l", "zh"),
  alias("cup", "cup"), alias("cups", "cup"), alias("c", "cup"), alias("杯", "cup", "zh"),
  alias("tablespoon", "tbsp"), alias("tablespoons", "tbsp"), alias("tbsp", "tbsp"), alias("tbs", "tbsp"), alias("tb", "tbsp"), alias("大勺", "tbsp", "zh"), alias("汤匙", "tbsp", "zh"),
  alias("teaspoon", "tsp"), alias("teaspoons", "tsp"), alias("tsp", "tsp"), alias("小勺", "tsp", "zh"), alias("茶匙", "tsp", "zh"),
  alias("pinch", "pinch"), alias("pinches", "pinch"), alias("少许", "pinch", "zh"),
  alias("dash", "dash"), alias("dashes", "dash"),
  alias("fluid ounce", "fl_oz"), alias("fluid ounces", "fl_oz"), alias("fl oz", "fl_oz"), alias("floz", "fl_oz")
];

const unitAliasMap = new Map(unitAliasRows.map((row) => [row.alias.toLowerCase(), row.unit]));

export const liquidIngredientIds = new Set([
  "milk", "heavy_cream", "cream", "sour_cream", "yogurt", "coconut_milk",
  "soy_sauce", "vinegar", "rice_vinegar", "white_vinegar", "balsamic_vinegar",
  "oil", "sesame_oil", "chili_oil", "olive_oil", "peanut_oil", "canola_oil",
  "fish_sauce", "oyster_sauce", "hoisin_sauce", "shaoxing_wine", "mirin",
  "chicken_stock", "beef_stock", "vegetable_stock", "sriracha", "ketchup", "mustard", "mayonnaise"
]);

export const canonicalUnitByIngredientId = {
  garlic: "clove",
  egg: "piece",
  milk: "ml",
  heavy_cream: "ml",
  cream: "ml",
  coconut_milk: "ml",
  soy_sauce: "ml",
  vinegar: "ml",
  rice_vinegar: "ml",
  white_vinegar: "ml",
  balsamic_vinegar: "ml",
  oil: "ml",
  sesame_oil: "ml",
  chili_oil: "ml",
  olive_oil: "ml",
  peanut_oil: "ml",
  canola_oil: "ml",
  fish_sauce: "ml",
  oyster_sauce: "ml",
  hoisin_sauce: "ml",
  shaoxing_wine: "ml",
  mirin: "ml",
  chicken_stock: "ml",
  beef_stock: "ml",
  vegetable_stock: "ml",
  butter: "gram"
};

export const averagePieceGrams = {
  onion: 150, carrot: 70, tomato: 123, potato: 170, sweet_potato: 130, yam: 150,
  bell_pepper: 150, cucumber: 300, zucchini: 200, eggplant: 300, broccoli: 300,
  mushroom: 18, shiitake_mushroom: 15, king_oyster_mushroom: 90, lemon: 58, lime: 67,
  apple: 182, banana: 118, orange: 131, avocado: 150, corn: 100, celery: 40,
  scallion: 15, ginger: 5, napa_cabbage: 900, cabbage: 900, bok_choy: 170,
  daikon: 700, radish: 25, egg: 1, chicken_wing: 90, chicken_drumstick: 120,
  chicken_thigh: 170, chicken_breast: 200, chicken_leg: 250, tofu: 400, soft_tofu: 400
};

export const specificConversions = [
  ...rules("garlic", "clove", [
    ["clove", 1, "exact", "identity"],
    ["piece", 1, "average", "piece usually means one clove for peeled garlic"],
    ["head", 10, "average", "1 head garlic is about 10 cloves"],
    ["bulb", 10, "average", "1 bulb garlic is about 10 cloves"],
    ["whole", 10, "average", "1 whole garlic bulb is about 10 cloves"]
  ]),
  ...rules("onion", "gram", [["whole", 150], ["half", 75], ["piece", 150], ["cup", 160], ["slice", 15]]),
  ...rules("carrot", "gram", [["whole", 70], ["piece", 70], ["cup", 128], ["slice", 5]]),
  ...rules("egg", "piece", [["egg", 1], ["piece", 1], ["whole", 1]]),
  ...rules("milk", "ml", [["cup", 240], ["tbsp", 15], ["tsp", 5], ["ml", 1], ["l", 1000], ["fl_oz", 29.5735]]),
  ...rules("butter", "gram", [["tbsp", 14], ["tsp", 4.7], ["stick", 113], ["cup", 227], ["gram", 1], ["oz", 28.3495], ["lb", 453.592]]),
  ...liquidRules(["soy_sauce", "vinegar", "rice_vinegar", "white_vinegar", "balsamic_vinegar", "oil", "sesame_oil", "chili_oil", "olive_oil", "peanut_oil", "canola_oil"]),
  ...rules("rice", "gram", [["cup", 185], ["tbsp", 12], ["tsp", 4], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...rules("flour", "gram", [["cup", 120], ["tbsp", 8], ["tsp", 2.6], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...rules("sugar", "gram", [["cup", 200], ["tbsp", 12.5], ["tsp", 4.2], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...rules("salt", "gram", [["tsp", 6], ["tbsp", 18], ["pinch", 0.36], ["dash", 0.6], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]])
];

export function normalizeUnitAlias(unit) {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) {
    return "piece";
  }
  return unitAliasMap.get(normalized) || normalized;
}

export function canonicalUnitForIngredient(ingredient) {
  const id = String(ingredient?.ingredient_id || ingredient?.ingredientId || "").trim();
  const category = String(ingredient?.category || "").trim().toLowerCase();
  if (canonicalUnitByIngredientId[id]) {
    return canonicalUnitByIngredientId[id];
  }
  if (liquidIngredientIds.has(id)) {
    return "ml";
  }
  if (["protein", "seafood", "vegetable", "fruit", "grain", "pantry", "seasoning", "spice", "herb", "aromatic", "dairy"].includes(category)) {
    return "gram";
  }
  return "gram";
}

export function buildConversionSeedRows(ingredientRows) {
  const rows = new Map();
  for (const ingredient of ingredientRows) {
    const ingredientId = ingredient.ingredient_id;
    const canonicalUnit = canonicalUnitForIngredient(ingredient);
    addRow(rows, conversion(ingredientId, canonicalUnit, canonicalUnit, 1, "exact", true, "canonical unit identity"));
    if (canonicalUnit === "gram") {
      for (const row of massRules(ingredientId)) addRow(rows, row);
      const average = averagePieceGrams[ingredientId];
      if (average) {
        addRow(rows, conversion(ingredientId, "piece", "gram", average, "average", true, "average edible unit weight"));
        addRow(rows, conversion(ingredientId, "whole", "gram", average, "average", true, "average whole item weight"));
      }
    }
    if (canonicalUnit === "ml") {
      for (const row of volumeRules(ingredientId)) addRow(rows, row);
    }
  }
  for (const row of specificConversions) {
    if (ingredientRows.some((ingredient) => ingredient.ingredient_id === row.ingredient_id)) {
      addRow(rows, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.ingredient_id.localeCompare(b.ingredient_id) || a.from_unit.localeCompare(b.from_unit));
}

export function normalizeIngredientQuantity(input, options = {}) {
  const rawQuantity = Number.isFinite(Number(input?.quantity)) ? Number(input.quantity) : 1;
  const rawUnit = String(input?.unit || "piece").trim() || "piece";
  const ingredientName = String(input?.ingredientName || input?.name || "").trim();
  const ingredient = options.ingredient || null;
  const ingredientId = String(ingredient?.ingredient_id || ingredient?.ingredientId || input?.ingredientId || "").trim();
  const canonicalUnit = String(ingredient?.canonical_unit || ingredient?.canonicalUnit || options.canonicalUnit || "").trim();
  const fromUnit = normalizeUnitAlias(rawUnit);
  const toUnit = canonicalUnit || canonicalUnitForIngredient(ingredient || { ingredient_id: ingredientId, category: options.category || "" });
  const conversions = Array.isArray(options.conversions) ? options.conversions : [];
  const rule = conversions.find((item) =>
    String(item.ingredient_id || item.ingredientId) === ingredientId &&
    normalizeUnitAlias(item.from_unit || item.fromUnit) === fromUnit &&
    normalizeUnitAlias(item.to_unit || item.toUnit) === toUnit
  );
  if (!ingredientId || !rule) {
    return {
      ingredientName,
      rawQuantity,
      rawUnit,
      needsReview: true,
      reason: "Missing conversion rule"
    };
  }
  const conversionRatio = Number(rule.ratio);
  return {
    ingredientName,
    rawQuantity,
    rawUnit,
    canonicalQuantity: rawQuantity * conversionRatio,
    canonicalUnit: toUnit,
    conversionRatio,
    needsReview: false
  };
}

function liquidRules(ids) {
  return ids.flatMap((id) => rules(id, "ml", [["tbsp", 15], ["tsp", 5], ["cup", 240], ["ml", 1], ["l", 1000], ["fl_oz", 29.5735]]));
}

function volumeRules(ingredientId) {
  return rules(ingredientId, "ml", [["ml", 1, "exact"], ["l", 1000, "exact"], ["cup", 240], ["tbsp", 15], ["tsp", 5], ["fl_oz", 29.5735]]);
}

function massRules(ingredientId) {
  return rules(ingredientId, "gram", [["gram", 1, "exact"], ["kg", 1000, "exact"], ["jin", 500, "exact"], ["oz", 28.3495, "exact"], ["lb", 453.592, "exact"]]);
}

function rules(ingredientId, toUnit, entries) {
  return entries.map(([fromUnit, ratio, conversionType = "average", notes = "seeded conversion"]) =>
    conversion(ingredientId, fromUnit, toUnit, ratio, conversionType, true, notes)
  );
}

function conversion(ingredientId, fromUnit, toUnit, ratio, conversionType = "average", isDefault = true, notes = "") {
  return {
    ingredient_id: ingredientId,
    from_unit: normalizeUnitAlias(fromUnit),
    to_unit: normalizeUnitAlias(toUnit),
    ratio: Number(ratio),
    conversion_type: conversionType,
    is_default: Boolean(isDefault),
    notes
  };
}

function alias(aliasText, unit, language = "en", notes = "") {
  return {
    alias: String(aliasText),
    unit: String(unit),
    language,
    notes
  };
}

function addRow(rows, row) {
  rows.set(`${row.ingredient_id}:${row.from_unit}:${row.to_unit}`, row);
}
