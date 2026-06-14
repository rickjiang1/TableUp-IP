import { fetchCloudRecipes, fetchMatchingRules, upsertUnknownIngredients } from "./supabase.js";

const requiredWeight = 1.0;
const optionalWeight = 0.3;
const pantryWeight = 0.1;

export async function matchRecipesForInventory(inventoryInput) {
  const [recipes, rules] = await Promise.all([
    fetchCloudRecipes(),
    fetchMatchingRules()
  ]);

  const resolver = buildIngredientResolver(rules);
  const substitutions = buildSubstitutionMap(rules.substitutions);
  const inventory = normalizeInventory(inventoryInput, resolver);
  await recordUnknownIngredients(inventory, recipes, resolver);

  return recipes
    .map((recipe) => matchRecipe(recipe, inventory, resolver, substitutions))
    .sort((left, right) => {
      if (right.match_score_percent !== left.match_score_percent) {
        return right.match_score_percent - left.match_score_percent;
      }
      return left.recipe_name.localeCompare(right.recipe_name);
    });
}

function matchRecipe(recipe, inventory, resolver, substitutions) {
  const details = recipe.ingredients.map((ingredient) => {
    const recipeIngredientId = resolveRecipeIngredientId(ingredient, resolver);
    const exactItem = inventory.find((item) => !item.aliasMatched && item.ingredientId === recipeIngredientId);

    if (exactItem) {
      return ingredientMatch(ingredient, exactItem, "exact", 1);
    }

    const aliasItem = inventory.find((item) => item.aliasMatched && item.ingredientId === recipeIngredientId);
    if (aliasItem) {
      return ingredientMatch(ingredient, aliasItem, "alias", 1);
    }

    const candidates = substitutions.get(recipeIngredientId) || [];
    for (const candidate of candidates) {
      const substituteItem = inventory.find((item) => item.ingredientId === candidate.substituteIngredientId);
      if (substituteItem) {
        return ingredientMatch(ingredient, substituteItem, "substitute", candidate.confidenceScore);
      }
    }

    return {
      recipe_ingredient: ingredient.name,
      recipe_ingredient_id: recipeIngredientId,
      user_inventory_ingredient: "",
      match_type: "missing",
      match_score: 0,
      weight: ingredientWeight(ingredient)
    };
  });

  const weightedScoreSum = details.reduce((sum, detail) => sum + detail.match_score * detail.weight, 0);
  const totalWeight = details.reduce((sum, detail) => sum + detail.weight, 0);
  const matchScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;

  return {
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    image_url: recipe.imageURL,
    video_url: recipe.videoURL,
    match_score_percent: Math.round(matchScore * 1000) / 10,
    matched_ingredients: details.filter((detail) => detail.match_type === "exact" || detail.match_type === "alias"),
    missing_required_ingredients: details
      .filter((detail) => detail.match_type === "missing")
      .filter((detail) => requiredIngredientByName(recipe, detail.recipe_ingredient)),
    missing_optional_ingredients: details
      .filter((detail) => detail.match_type === "missing")
      .filter((detail) => optionalIngredientByName(recipe, detail.recipe_ingredient)),
    substituted_ingredients: details.filter((detail) => detail.match_type === "substitute"),
    pantry_missing: details
      .filter((detail) => detail.match_type === "missing")
      .filter((detail) => pantryIngredientByName(recipe, detail.recipe_ingredient)),
    details
  };
}

function ingredientMatch(ingredient, inventoryItem, matchType, score) {
  return {
    recipe_ingredient: ingredient.name,
    recipe_ingredient_id: ingredient.canonicalIngredientId || "",
    user_inventory_ingredient: inventoryItem.name,
    user_inventory_ingredient_id: inventoryItem.ingredientId,
    match_type: matchType,
    match_score: score,
    weight: ingredientWeight(ingredient)
  };
}

function normalizeInventory(input, resolver) {
  const items = Array.isArray(input) ? input : [];
  return items
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const explicitId = typeof item?.ingredient_id === "string" ? item.ingredient_id.trim() : "";
      const resolved = explicitId && resolver.isKnownIngredientId(explicitId)
        ? { ingredientId: explicitId, aliasMatched: false, known: true }
        : resolver.resolve(name);
      return {
        name,
        ingredientId: resolved.ingredientId,
        aliasMatched: resolved.aliasMatched,
        known: resolved.known,
        quantity: Number(item?.quantity || 0),
        unit: typeof item?.unit === "string" ? item.unit : ""
      };
    })
    .filter((item) => item.name && item.ingredientId);
}

function buildIngredientResolver(rules) {
  const byId = new Map();
  const byName = new Map();
  const aliases = new Map();

  for (const ingredient of rules.ingredients || []) {
    byId.set(ingredient.ingredient_id, ingredient);
    byName.set(normalizeName(ingredient.canonical_name), ingredient.ingredient_id);
    byName.set(normalizeName(ingredient.ingredient_id), ingredient.ingredient_id);
  }

  for (const alias of rules.aliases || []) {
    aliases.set(normalizeName(alias.alias_name), alias.ingredient_id);
  }

  return {
    resolve(name) {
      const normalized = normalizeName(name);
      if (byId.has(name)) {
        return { ingredientId: name, aliasMatched: false, known: true };
      }
      if (byName.has(normalized)) {
        return { ingredientId: byName.get(normalized), aliasMatched: false, known: true };
      }
      if (aliases.has(normalized)) {
        return { ingredientId: aliases.get(normalized), aliasMatched: true, known: true };
      }
      return { ingredientId: canonicalIngredientId(name), aliasMatched: false, known: false };
    },
    isKnownIngredientId(ingredientId) {
      return byId.has(String(ingredientId || "").trim());
    }
  };
}

async function recordUnknownIngredients(inventory, recipes, resolver) {
  const unknowns = [];

  for (const item of inventory) {
    if (!item.known) {
      unknowns.push({ rawName: item.name, source: "inventory" });
    }
  }

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients || []) {
      if (ingredient.canonicalIngredientId && resolver.isKnownIngredientId(ingredient.canonicalIngredientId)) {
        continue;
      }

      const resolved = resolver.resolve(ingredient.name);
      if (!resolved.known) {
        unknowns.push({ rawName: ingredient.name, source: "recipe" });
      }
    }
  }

  await upsertUnknownIngredients(dedupeUnknowns(unknowns));
}

function dedupeUnknowns(items) {
  const byKey = new Map();
  for (const item of items) {
    const rawName = typeof item.rawName === "string" ? item.rawName.trim() : "";
    if (!rawName) {
      continue;
    }
    const source = item.source || "inventory";
    const key = `${source}:${normalizeName(rawName)}`;
    const current = byKey.get(key) || { rawName, source, occurrenceCount: 0 };
    current.occurrenceCount += 1;
    byKey.set(key, current);
  }
  return [...byKey.values()];
}

function buildSubstitutionMap(substitutions) {
  const map = new Map();
  for (const substitution of substitutions || []) {
    const ingredientId = substitution.ingredient_id;
    if (!map.has(ingredientId)) {
      map.set(ingredientId, []);
    }
    map.get(ingredientId).push({
      substituteIngredientId: substitution.substitute_ingredient_id,
      confidenceScore: Number(substitution.confidence_score || 0)
    });
  }
  return map;
}

function resolveRecipeIngredientId(ingredient, resolver) {
  if (ingredient.canonicalIngredientId && resolver.isKnownIngredientId(ingredient.canonicalIngredientId)) {
    return ingredient.canonicalIngredientId;
  }
  return resolver.resolve(ingredient.name).ingredientId;
}

function ingredientWeight(ingredient) {
  if (ingredient.pantryFlag) {
    return pantryWeight;
  }
  if (ingredient.optionalFlag || ingredient.role === "secondary") {
    return optionalWeight;
  }
  return requiredWeight;
}

function requiredIngredientByName(recipe, ingredientName) {
  const ingredient = recipe.ingredients.find((item) => item.name === ingredientName);
  return ingredient && !ingredient.pantryFlag && !ingredient.optionalFlag && ingredient.role !== "secondary";
}

function optionalIngredientByName(recipe, ingredientName) {
  const ingredient = recipe.ingredients.find((item) => item.name === ingredientName);
  return ingredient && !ingredient.pantryFlag && (ingredient.optionalFlag || ingredient.role === "secondary");
}

function pantryIngredientByName(recipe, ingredientName) {
  const ingredient = recipe.ingredients.find((item) => item.name === ingredientName);
  return ingredient && ingredient.pantryFlag;
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function canonicalIngredientId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
