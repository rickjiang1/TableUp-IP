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

  return rows.sort((left, right) =>
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

function addAlias(aliases, value) {
  const clean = stringValue(value).replace(/\s+/g, " ").trim();
  if (clean) {
    aliases.add(clean);
    aliases.add(clean.toLowerCase());
  }
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
