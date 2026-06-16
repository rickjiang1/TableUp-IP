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

const sourceName = "taxonomy_enrichment_v1";
const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node backend/src/enrich-ingredient-taxonomy.js --env dev [--dry-run]");
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
  await upsertCategories();
  await upsertTags();

  const ingredients = await fetchIngredients();
  const enriched = ingredients.map(enrichIngredient);

  if (!args.dryRun) {
    await updateIngredientTaxonomy(enriched);
    await replaceFunctionalProfiles(enriched);
  }

  const stats = summarize(enriched);
  console.log(JSON.stringify({
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    ingredients: enriched.length,
    withCategory: stats.withCategory,
    withSubcategory: stats.withSubcategory,
    withTags: stats.withTags,
    totalTagAssignments: stats.totalTagAssignments,
    topSubcategories: stats.topSubcategories,
    noTagExamples: enriched.filter((item) => item.tags.length === 0).slice(0, 20).map((item) => ({
      ingredient_slug: item.ingredient_slug,
      canonical_name: item.canonical_name,
      category: item.category
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

async function fetchIngredients() {
  return await query(`
    select ingredient_id, ingredient_slug, canonical_name, category, canonical_unit, default_unit
    from ingredients
    order by canonical_name asc;
  `);
}

async function upsertCategories() {
  const values = categoryRows.map((row) => `(${sqlString(row.slug)}, ${sqlString(row.name)})`).join(",\n");
  await query(`
    insert into ingredient_categories (slug, name)
    values ${values}
    on conflict (slug) do update set
      name = excluded.name,
      updated_at = now();
  `);

  const parentUpdates = categoryRows
    .filter((row) => row.parent)
    .map((row) => `(${sqlString(row.slug)}, ${sqlString(row.parent)})`)
    .join(",\n");
  await query(`
    with rows (slug, parent_slug) as (
      values ${parentUpdates}
    )
    update ingredient_categories child
    set parent_category_id = parent.id,
        updated_at = now()
    from rows
    join ingredient_categories parent on parent.slug = rows.parent_slug
    where child.slug = rows.slug;
  `);
}

async function upsertTags() {
  const values = tagRows.map((row) => `(${sqlString(row.slug)}, ${sqlString(row.name)}, ${sqlString(row.tag_type)})`).join(",\n");
  await query(`
    insert into ingredient_tags (slug, name, tag_type)
    values ${values}
    on conflict (slug) do update set
      name = excluded.name,
      tag_type = excluded.tag_type,
      updated_at = now();
  `);
}

async function updateIngredientTaxonomy(rows) {
  for (const chunk of chunks(rows, 400)) {
    await query(`
      with rows (ingredient_id, category_slug, subcategory_slug, default_unit) as (
        values ${chunk.map((row) => `(
          ${sqlString(row.ingredient_id)},
          ${sqlString(row.categorySlug)},
          ${sqlString(row.subcategorySlug)},
          ${sqlString(row.defaultUnit)}
        )`).join(",\n")}
      )
      update ingredients
      set
        category_id = category.id,
        subcategory_id = subcategory.id,
        default_unit = rows.default_unit
      from rows
      left join ingredient_categories category on category.slug = rows.category_slug
      left join ingredient_categories subcategory on subcategory.slug = rows.subcategory_slug
      where ingredients.ingredient_id = rows.ingredient_id::uuid;
    `);
  }
}

async function replaceFunctionalProfiles(rows) {
  await query(`delete from ingredient_functional_profiles where source = ${sqlString(sourceName)};`);
  const profileRows = rows.flatMap((row) => row.tags.map((tag) => ({
    ingredient_id: row.ingredient_id,
    tag_slug: tag.slug,
    weight: tag.weight,
    notes: tag.notes
  })));

  for (const chunk of chunks(profileRows, 600)) {
    if (chunk.length === 0) continue;
    await query(`
      with rows (ingredient_id, tag_slug, weight, notes) as (
        values ${chunk.map((row) => `(
          ${sqlString(row.ingredient_id)},
          ${sqlString(row.tag_slug)},
          ${sqlNumber(row.weight, 1)},
          ${sqlString(row.notes)}
        )`).join(",\n")}
      )
      insert into ingredient_functional_profiles (ingredient_id, tag_id, weight, source, notes, updated_at)
      select rows.ingredient_id::uuid, ingredient_tags.id, rows.weight, ${sqlString(sourceName)}, rows.notes, now()
      from rows
      join ingredient_tags on ingredient_tags.slug = rows.tag_slug
      on conflict (ingredient_id, tag_id) do update set
        weight = excluded.weight,
        source = excluded.source,
        notes = excluded.notes,
        updated_at = now();
    `);
  }
}

function enrichIngredient(ingredient) {
  const slug = normalize(ingredient.ingredient_slug);
  const name = normalize(ingredient.canonical_name);
  const category = normalize(ingredient.category);
  const text = `${slug} ${name} ${category}`;
  const tags = new Map();

  const add = (slugValue, weight = 1, notes = "") => {
    tags.set(slugValue, { slug: slugValue, weight, notes });
  };

  const match = (...patterns) => patterns.some((pattern) => pattern.test(text));
  const categoryMatch = (...values) => values.includes(category);

  let top = "pantry";
  let sub = "misc_pantry";

  if (match(/beef|steak|brisket|ribeye|short rib|sirloin|tenderloin|flank|chuck|oxtail|tripe|牛/)) {
    top = "protein";
    sub = "beef";
    add("meat", 1, "beef pattern");
    add("animal_protein", 1, "beef pattern");
    add("savory", 0.7, "beef pattern");
  } else if (match(/chicken|hen|rooster|turkey|duck|goose|quail|poultry|鸡|鸭|鹅/)) {
    top = "protein";
    sub = "poultry";
    add("meat", 1, "poultry pattern");
    add("animal_protein", 1, "poultry pattern");
    add("savory", 0.7, "poultry pattern");
  } else if (match(/pork|bacon|ham|sausage|prosciutto|belly|ribs|baby back|猪/)) {
    top = "protein";
    sub = "pork";
    add("meat", 1, "pork pattern");
    add("animal_protein", 1, "pork pattern");
    add("savory", 0.7, "pork pattern");
  } else if (match(/lamb|mutton|羊/)) {
    top = "protein";
    sub = "lamb";
    add("meat", 1, "lamb pattern");
    add("animal_protein", 1, "lamb pattern");
  } else if (match(/shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|shellfish|abalone|conch|squid|octopus|虾|蟹|贝|蚝|鲍|鱿鱼|章鱼/)) {
    top = "protein";
    sub = "shellfish";
    add("seafood", 1, "shellfish pattern");
    add("animal_protein", 1, "shellfish pattern");
    add("quick_cooking", 0.8, "shellfish pattern");
  } else if (match(/fish|salmon|cod|tuna|tilapia|catfish|bass|mackerel|sardine|trout|halibut|snapper|pollock|anchovy|anchovies|eel|鱼|三文鱼|鳗/)) {
    top = "protein";
    sub = "fish";
    add("seafood", 1, "fish pattern");
    add("animal_protein", 1, "fish pattern");
  } else if (match(/\begg\b|eggs|蛋/)) {
    top = "protein";
    sub = "egg";
    add("animal_protein", 1, "egg pattern");
    add("binder", 0.9, "egg pattern");
    add("emulsifier", 0.6, "egg pattern");
  } else if (match(/tofu|tempeh|soybean|edamame|soy protein|豆腐|豆干|毛豆/)) {
    top = "protein";
    sub = "tofu_soy";
    add("plant_protein", 1, "soy pattern");
    add("mild", 0.8, "soy pattern");
  } else if (match(/almond|walnut|cashew|pecan|pistachio|hazelnut|peanut|sesame|sunflower seed|pumpkin seed|nut|seed|芝麻|花生|坚果/)) {
    top = "protein";
    sub = "nut_seed";
    add("plant_protein", 0.7, "nut/seed pattern");
    add("fatty", 0.8, "nut/seed pattern");
  } else if (match(/bean|lentil|chickpea|pea|black eyed|kidney|legume|豆|扁豆/)) {
    top = "protein";
    sub = "legume";
    add("plant_protein", 1, "legume pattern");
    add("starchy", 0.7, "legume pattern");
  } else if (match(/milk|cream|yogurt|yoghurt|cheese|butter|ghee|dairy|half and half|buttermilk|乳|奶|芝士|黄油/)) {
    top = "dairy";
    sub = dairySubcategory(text);
    add("dairy", 1, "dairy pattern");
    add("creamy", match(/cream|yogurt|cheese|butter|奶油|芝士/) ? 1 : 0.55, "dairy pattern");
  } else if (match(/rice|noodle|pasta|spaghetti|macaroni|ramen|udon|soba|wheat|oat|barley|quinoa|couscous|grain|bagel|baguette|bread|米|面|粉丝|年糕|面包/)) {
    top = "grain";
    sub = grainSubcategory(text);
    add("starchy", 1, "grain pattern");
    add("dry_goods", 0.7, "grain pattern");
  } else if (match(/flour|starch|cornmeal|bread crumb|panko|面粉|淀粉/)) {
    top = "pantry";
    sub = "flour_starch";
    add("powder", 1, "flour/starch pattern");
    add("thickener", match(/starch|淀粉/) ? 1 : 0.45, "flour/starch pattern");
    add("binder", 0.7, "flour/starch pattern");
  } else if (match(/oil|lard|shortening|tallow|margarine|grease|fat|油/)) {
    top = "pantry";
    sub = "oil_fat";
    add("fatty", 1, "fat/oil pattern");
    add("cooking_fat", 1, "fat/oil pattern");
  } else if (match(/soy sauce|vinegar|sauce|paste|miso|ketchup|mustard|mayonnaise|dressing|condiment|酱|醋|耗油|蚝油/)) {
    top = "pantry";
    sub = "sauce_condiment";
    add("sauce", 1, "sauce/condiment pattern");
    add("savory", 0.6, "sauce/condiment pattern");
  } else if (match(/sugar|honey|syrup|molasses|甜|糖|蜂蜜/)) {
    top = "pantry";
    sub = "sweetener";
    add("sweet", 1, "sweetener pattern");
  } else if (match(/salt|pepper|spice|cumin|paprika|cinnamon|clove|nutmeg|seasoning|powder|盐|胡椒|粉|香料/)) {
    top = "pantry";
    sub = "spice";
    add(match(/salt|盐/) ? "salty" : "aromatic", 1, "spice pattern");
    add("dry_goods", 0.8, "spice pattern");
  } else if (match(/broth|stock|juice|tea|coffee|wine|beer|water|drink|beverage|汤|汁|茶|咖啡/)) {
    top = "beverage";
    sub = "beverage";
    add("liquid", 1, "beverage pattern");
  } else if (match(/apple|pear|orange|lemon|lime|berry|strawberry|blueberry|grape|banana|mango|melon|peach|plum|cherry|pineapple|fruit|果|莓|柠檬|橙/)) {
    top = "fruit";
    sub = fruitSubcategory(text);
    add("sweet", 0.75, "fruit pattern");
    if (match(/lemon|lime|orange|citrus|柠檬|橙/)) add("acidic", 1, "citrus pattern");
  } else if (match(/ginger|galangal|turmeric|姜|黄姜|南姜/)) {
    top = "vegetable";
    sub = "rhizome_aromatic";
    add("aromatic", 1, "rhizome aromatic pattern");
    add("rhizome", 1, "rhizome aromatic pattern");
    add("savory", 0.55, "rhizome aromatic pattern");
  } else if (match(/garlic|onion|shallot|scallion|leek|chive|蒜|葱|洋葱|韭/)) {
    top = "vegetable";
    sub = "allium";
    add("aromatic", 1, "allium pattern");
    add("allium", 1, "allium pattern");
    add("savory", 0.7, "allium pattern");
  } else if (match(/cilantro|parsley|basil|mint|dill|thyme|rosemary|sage|oregano|herb|香菜|罗勒|薄荷/)) {
    top = "vegetable";
    sub = "herb";
    add("herbal", 1, "herb pattern");
    add("aromatic", 0.8, "herb pattern");
  } else if (match(/mushroom|shiitake|enoki|oyster mushroom|木耳|蘑菇|香菇|金针菇/)) {
    top = "vegetable";
    sub = "mushroom";
    add("umami", 0.9, "mushroom pattern");
    add("savory", 0.7, "mushroom pattern");
  } else if (match(/potato|sweet potato|yam|taro|cassava|芋|土豆|地瓜|红薯/)) {
    top = "vegetable";
    sub = "tuber";
    add("starchy", 1, "tuber pattern");
  } else if (match(/carrot|radish|daikon|turnip|beet|parsnip|root|萝卜|胡萝卜/)) {
    top = "vegetable";
    sub = "root_vegetable";
    add("crisp", 0.6, "root vegetable pattern");
    add("starchy", 0.4, "root vegetable pattern");
  } else if (match(/spinach|lettuce|cabbage|bok choy|kale|chard|greens|leaf|菜|菠菜|生菜|白菜/)) {
    top = "vegetable";
    sub = "leafy_green";
    add("leafy", 1, "leafy vegetable pattern");
    add("quick_cooking", 0.5, "leafy vegetable pattern");
  } else if (match(/broccoli|cauliflower|brussels|kohlrabi|gai lan|芥兰|西兰花|花菜/)) {
    top = "vegetable";
    sub = "brassica";
    add("crisp", 0.7, "brassica pattern");
  } else if (match(/zucchini|squash|pumpkin|cucumber|gourd|冬瓜|南瓜|黄瓜|丝瓜/)) {
    top = "vegetable";
    sub = match(/cucumber|黄瓜/) ? "cucumber_gourd" : "squash_gourd";
    add("mild", 0.7, "gourd pattern");
  } else if (categoryMatch("vegetable", "aromatic", "herb")) {
    top = "vegetable";
    sub = category === "herb" ? "herb" : category === "aromatic" ? "allium" : "other_vegetable";
    add("plant_based", 0.8, "legacy vegetable category");
  } else if (categoryMatch("fruit")) {
    top = "fruit";
    sub = "other_fruit";
    add("sweet", 0.6, "legacy fruit category");
  } else if (categoryMatch("protein", "meat", "seafood")) {
    top = "protein";
    sub = category === "seafood" ? "seafood" : "other_protein";
    add("protein", 0.8, "legacy protein category");
  }

  applyFormTags(text, add);
  applyFlavorTags(text, add);
  applyCookingRoleTags(text, add);
  applyCutTags(text, add);

  if (top === "vegetable" || top === "fruit" || sub === "legume" || sub === "tofu_soy") {
    add("plant_based", 0.8, "plant category");
  }
  if (top === "protein") {
    add("protein", 1, "protein category");
  }
  if (top === "pantry") {
    add("shelf_stable", 0.6, "pantry category");
  }

  return {
    ...ingredient,
    categorySlug: top,
    subcategorySlug: sub,
    defaultUnit: ingredient.default_unit || ingredient.canonical_unit || defaultUnitFor(top, sub),
    tags: [...tags.values()]
  };
}

function dairySubcategory(text) {
  if (/cheese|芝士|奶酪/.test(text)) return "cheese";
  if (/cream|half and half|奶油/.test(text)) return "cream";
  if (/yogurt|yoghurt|酸奶/.test(text)) return "yogurt";
  if (/butter|ghee|黄油/.test(text)) return "butter_fat";
  return "milk";
}

function grainSubcategory(text) {
  if (/rice|米/.test(text)) return "rice";
  if (/noodle|pasta|spaghetti|ramen|udon|soba|面|粉丝/.test(text)) return "noodle_pasta";
  if (/bread|bun|tortilla|bagel|baguette|toast|饼|面包/.test(text)) return "bread";
  return "grain";
}

function fruitSubcategory(text) {
  if (/lemon|lime|orange|grapefruit|citrus|柠檬|橙|柚/.test(text)) return "citrus";
  if (/berry|strawberry|blueberry|raspberry|blackberry|莓/.test(text)) return "berry";
  if (/melon|watermelon|cantaloupe|瓜/.test(text)) return "melon";
  if (/apple|pear|苹果|梨/.test(text)) return "apple_pear";
  if (/mango|banana|pineapple|papaya|椰|芒果|香蕉|菠萝/.test(text)) return "tropical_fruit";
  return "other_fruit";
}

function applyFormTags(text, add) {
  if (/liquid|juice|broth|stock|milk|water|oil|vinegar|wine|beer|sauce|液|汁|汤|油|奶/.test(text)) add("liquid", 0.9, "form pattern");
  if (/powder|flour|starch|ground|粉|面粉|淀粉/.test(text)) add("powder", 0.9, "form pattern");
  if (/paste|miso|酱|膏/.test(text)) add("paste", 0.8, "form pattern");
  if (/dried|dry|dehydrated|干/.test(text)) add("dried", 0.8, "form pattern");
  if (/fresh|新鲜/.test(text)) add("fresh", 0.6, "form pattern");
  if (/frozen|冷冻|冰冻/.test(text)) add("frozen", 0.7, "form pattern");
  if (/sliced|slice|thin|片|薄切/.test(text)) add("sliced", 0.7, "form pattern");
  if (/ground|minced|碎|末|绞/.test(text)) add("ground", 0.8, "form pattern");
  if (/whole|整|whole/.test(text)) add("whole", 0.5, "form pattern");
}

function applyFlavorTags(text, add) {
  if (/salty|salt|soy sauce|miso|酱油|盐/.test(text)) add("salty", 0.8, "flavor pattern");
  if (/sweet|sugar|honey|syrup|糖|甜|蜂蜜/.test(text)) add("sweet", 0.9, "flavor pattern");
  if (/acid|vinegar|lemon|lime|yogurt|醋|柠檬|酸/.test(text)) add("acidic", 0.8, "flavor pattern");
  if (/mushroom|soy sauce|miso|fish sauce|oyster sauce|anchovy|海带|香菇|味噌|蚝油/.test(text)) add("umami", 0.8, "flavor pattern");
  if (/chili|pepper|hot|spicy|辣|椒/.test(text)) add("spicy", 0.8, "flavor pattern");
  if (/garlic|onion|ginger|herb|spice|蒜|葱|姜|香/.test(text)) add("aromatic", 0.7, "flavor pattern");
}

function applyCookingRoleTags(text, add) {
  if (/baking|bake|flour|sugar|butter|egg|yeast|baking powder|烘焙/.test(text)) add("baking", 0.7, "cooking role pattern");
  if (/soup|broth|stock|stew|汤|炖/.test(text)) add("soup", 0.7, "cooking role pattern");
  if (/sauce|cream|milk|starch|flour|酱|汁/.test(text)) add("sauce", 0.7, "cooking role pattern");
  if (/salad|lettuce|cucumber|herb|生菜|黄瓜|沙拉/.test(text)) add("salad", 0.6, "cooking role pattern");
  if (/stir fry|sliced|thin|wok|炒|片/.test(text)) add("stir_fry", 0.6, "cooking role pattern");
  if (/marinade|soy sauce|vinegar|wine|ginger|garlic|腌|酱油|料酒/.test(text)) add("marinade", 0.6, "cooking role pattern");
}

function applyCutTags(text, add) {
  if (/breast|tenderloin|loin|lean|胸|里脊/.test(text)) add("lean", 0.8, "cut pattern");
  if (/thigh|belly|rib|short rib|brisket|oxtail|fatty|五花|肋|腩/.test(text)) add("fatty", 0.8, "cut pattern");
  if (/bone in|bone-in|rib|oxtail|带骨/.test(text)) add("bone_in", 0.7, "cut pattern");
  if (/boneless|去骨|无骨/.test(text)) add("boneless", 0.7, "cut pattern");
}

function defaultUnitFor(top, sub) {
  if (top === "dairy" || sub === "sauce_condiment" || sub === "beverage") return "ml";
  if (sub === "egg") return "piece";
  if (sub === "aromatic") return "piece";
  return "gram";
}

function summarize(rows) {
  const subcategoryCounts = new Map();
  for (const row of rows) {
    subcategoryCounts.set(row.subcategorySlug, (subcategoryCounts.get(row.subcategorySlug) || 0) + 1);
  }

  return {
    withCategory: rows.filter((row) => row.categorySlug).length,
    withSubcategory: rows.filter((row) => row.subcategorySlug).length,
    withTags: rows.filter((row) => row.tags.length > 0).length,
    totalTagAssignments: rows.reduce((sum, row) => sum + row.tags.length, 0),
    topSubcategories: [...subcategoryCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([subcategory, count]) => ({ subcategory, count }))
  };
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

const categoryRows = [
  { slug: "protein", name: "Protein" },
  { slug: "meat", name: "Meat", parent: "protein" },
  { slug: "poultry", name: "Poultry", parent: "meat" },
  { slug: "beef", name: "Beef", parent: "meat" },
  { slug: "pork", name: "Pork", parent: "meat" },
  { slug: "lamb", name: "Lamb", parent: "meat" },
  { slug: "fish", name: "Fish", parent: "protein" },
  { slug: "shellfish", name: "Shellfish", parent: "protein" },
  { slug: "seafood", name: "Seafood", parent: "protein" },
  { slug: "egg", name: "Egg", parent: "protein" },
  { slug: "tofu_soy", name: "Tofu and soy", parent: "protein" },
  { slug: "legume", name: "Legume", parent: "protein" },
  { slug: "nut_seed", name: "Nut and seed", parent: "protein" },
  { slug: "other_protein", name: "Other protein", parent: "protein" },
  { slug: "dairy", name: "Dairy" },
  { slug: "milk", name: "Milk", parent: "dairy" },
  { slug: "cream", name: "Cream", parent: "dairy" },
  { slug: "yogurt", name: "Yogurt", parent: "dairy" },
  { slug: "cheese", name: "Cheese", parent: "dairy" },
  { slug: "butter_fat", name: "Butter and dairy fat", parent: "dairy" },
  { slug: "vegetable", name: "Vegetable" },
  { slug: "aromatic", name: "Aromatic vegetable", parent: "vegetable" },
  { slug: "allium", name: "Allium", parent: "aromatic" },
  { slug: "rhizome_aromatic", name: "Rhizome aromatic", parent: "aromatic" },
  { slug: "herb", name: "Herb", parent: "vegetable" },
  { slug: "mushroom", name: "Mushroom", parent: "vegetable" },
  { slug: "tuber", name: "Tuber", parent: "vegetable" },
  { slug: "root_vegetable", name: "Root vegetable", parent: "vegetable" },
  { slug: "leafy_green", name: "Leafy green", parent: "vegetable" },
  { slug: "brassica", name: "Brassica", parent: "vegetable" },
  { slug: "squash_gourd", name: "Squash and gourd", parent: "vegetable" },
  { slug: "cucumber_gourd", name: "Cucumber and watery gourd", parent: "vegetable" },
  { slug: "other_vegetable", name: "Other vegetable", parent: "vegetable" },
  { slug: "fruit", name: "Fruit" },
  { slug: "citrus", name: "Citrus", parent: "fruit" },
  { slug: "berry", name: "Berry", parent: "fruit" },
  { slug: "melon", name: "Melon", parent: "fruit" },
  { slug: "apple_pear", name: "Apple and pear", parent: "fruit" },
  { slug: "tropical_fruit", name: "Tropical fruit", parent: "fruit" },
  { slug: "other_fruit", name: "Other fruit", parent: "fruit" },
  { slug: "grain", name: "Grain" },
  { slug: "rice", name: "Rice", parent: "grain" },
  { slug: "noodle_pasta", name: "Noodle and pasta", parent: "grain" },
  { slug: "bread", name: "Bread", parent: "grain" },
  { slug: "pantry", name: "Pantry" },
  { slug: "misc_pantry", name: "Misc pantry", parent: "pantry" },
  { slug: "oil_fat", name: "Oil and fat", parent: "pantry" },
  { slug: "sauce_condiment", name: "Sauce and condiment", parent: "pantry" },
  { slug: "sweetener", name: "Sweetener", parent: "pantry" },
  { slug: "spice", name: "Spice", parent: "pantry" },
  { slug: "flour_starch", name: "Flour and starch", parent: "pantry" },
  { slug: "beverage", name: "Beverage" }
];

const tagRows = [
  ["protein", "Protein", "nutrition"],
  ["animal_protein", "Animal protein", "nutrition"],
  ["plant_protein", "Plant protein", "nutrition"],
  ["dairy", "Dairy", "nutrition"],
  ["seafood", "Seafood", "nutrition"],
  ["plant_based", "Plant based", "nutrition"],
  ["liquid", "Liquid", "form"],
  ["solid", "Solid", "form"],
  ["powder", "Powder", "form"],
  ["paste", "Paste", "form"],
  ["dried", "Dried", "form"],
  ["fresh", "Fresh", "form"],
  ["frozen", "Frozen", "form"],
  ["sliced", "Sliced", "form"],
  ["ground", "Ground", "form"],
  ["whole", "Whole", "form"],
  ["leafy", "Leafy", "form"],
  ["creamy", "Creamy", "texture"],
  ["thick", "Thick", "texture"],
  ["crisp", "Crisp", "texture"],
  ["tender", "Tender", "texture"],
  ["fatty", "Fatty", "texture"],
  ["lean", "Lean", "texture"],
  ["bone_in", "Bone-in", "form"],
  ["boneless", "Boneless", "form"],
  ["starchy", "Starchy", "texture"],
  ["mild", "Mild", "flavor"],
  ["acidic", "Acidic", "flavor"],
  ["sweet", "Sweet", "flavor"],
  ["savory", "Savory", "flavor"],
  ["umami", "Umami", "flavor"],
  ["aromatic", "Aromatic", "flavor"],
  ["herbal", "Herbal", "flavor"],
  ["salty", "Salty", "flavor"],
  ["spicy", "Spicy", "flavor"],
  ["allium", "Allium", "flavor"],
  ["rhizome", "Rhizome", "form"],
  ["thickener", "Thickener", "function"],
  ["emulsifier", "Emulsifier", "function"],
  ["binder", "Binder", "function"],
  ["cooking_fat", "Cooking fat", "function"],
  ["quick_cooking", "Quick cooking", "cooking_role"],
  ["shelf_stable", "Shelf stable", "function"],
  ["dry_goods", "Dry goods", "function"],
  ["baking", "Baking", "cooking_role"],
  ["soup", "Soup", "cooking_role"],
  ["sauce", "Sauce", "cooking_role"],
  ["salad", "Salad", "cooking_role"],
  ["stir_fry", "Stir fry", "cooking_role"],
  ["marinade", "Marinade", "cooking_role"]
].map(([slug, name, tag_type]) => ({ slug, name, tag_type }));

await main();
