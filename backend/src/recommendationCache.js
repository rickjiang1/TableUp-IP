import { createHash } from "node:crypto";
import { query, sqlNumber, sqlString } from "./postgres.js";
import { matchRecipesForInventory } from "./recipeMatching.js";

export function inventoryHash(inventoryInput) {
  const rows = normalizeInventoryForHash(inventoryInput);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function recipeLibraryVersion(recipes) {
  const rows = (Array.isArray(recipes) ? recipes : [])
    .map((recipe) => ({
      id: String(recipe.id || ""),
      updatedAt: String(recipe.updatedAt || ""),
      ingredientCount: Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export async function recommendationsForInventory({
  userId,
  inventory,
  recipes,
  rules,
  sort = "tonight_score",
  limit = 20,
  offset = 0,
  minMatchScore = null,
  difficulty = "",
  minLeftoverScore = null
}) {
  const cleanUserId = String(userId || "").trim();
  if (!isUUID(cleanUserId)) {
    throw new Error("Valid user_id is required for recommendation cache.");
  }

  const threshold = recommendationThreshold();
  const algorithmVersion = recommendationAlgorithmVersion();
  const currentInventoryHash = inventoryHash(inventory);
  const currentRecipeLibraryVersion = recipeLibraryVersion(recipes);
  const cachedRows = await fetchCachedRecommendationRows({
    userId: cleanUserId,
    inventoryHash: currentInventoryHash,
    recipeLibraryVersion: currentRecipeLibraryVersion,
    algorithmVersion,
    threshold
  });

  const cacheHit = cachedRows.length > 0;
  const rows = cacheHit
    ? cachedRows
    : await refreshRecommendationCache({
        userId: cleanUserId,
        inventory,
        recipes,
        rules,
        inventoryHash: currentInventoryHash,
        recipeLibraryVersion: currentRecipeLibraryVersion,
        threshold,
        algorithmVersion
      });

  const filtered = filterAndSortRows(rows, {
    sort,
    minMatchScore,
    difficulty,
    minLeftoverScore
  });
  const boundedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const boundedOffset = Math.max(Number(offset) || 0, 0);
  const page = filtered.slice(boundedOffset, boundedOffset + boundedLimit);

  return {
    recommendations: page.map(rowToRecommendation),
    cache: {
      hit: cacheHit,
      inventoryHash: currentInventoryHash,
      recipeLibraryVersion: currentRecipeLibraryVersion,
      algorithmVersion,
      threshold,
      cachedCount: rows.length,
      returnedCount: page.length
    }
  };
}

async function refreshRecommendationCache({
  userId,
  inventory,
  recipes,
  rules,
  inventoryHash,
  recipeLibraryVersion,
  threshold,
  algorithmVersion
}) {
  const matches = await matchRecipesForInventory(inventory, { recipes, rules });
  const inventoryByIngredientId = buildInventoryByIngredientId(inventory);
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const rows = matches
    .map((match) => scoredRecommendationRow({
      match,
      recipe: recipeById.get(match.recipe_id),
      inventoryByIngredientId,
      userId,
      inventoryHash,
      recipeLibraryVersion,
      algorithmVersion
    }))
    .filter((row) => row.tonight_score >= threshold)
    .sort((left, right) => {
      if (right.tonight_score !== left.tonight_score) {
        return right.tonight_score - left.tonight_score;
      }
      if (right.match_score !== left.match_score) {
        return right.match_score - left.match_score;
      }
      return left.recipe_name.localeCompare(right.recipe_name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  await replaceCachedRecommendations({
    userId,
    inventoryHash,
    recipeLibraryVersion,
    rows
  });
  return rows;
}

function scoredRecommendationRow({
  match,
  recipe,
  inventoryByIngredientId,
  userId,
  inventoryHash,
  recipeLibraryVersion,
  algorithmVersion
}) {
  const matchScore = Number(match.match_score_percent || 0);
  const activeTimeMinutes = Number(recipe?.activeTimeMinutes || 0);
  const leftoverScore = Number(recipe?.leftoverScore || 0);
  const fridgeRescueScore = fridgeRescueScoreForMatch(match, inventoryByIngredientId);
  const timeScore = activeTimeScore(activeTimeMinutes);
  const difficultyScore = difficultyScoreForRecipe(recipe?.difficulty || "");
  const leftoverPercent = Math.min(Math.max(leftoverScore, 0), 5) * 20;
  const tonightScore = roundOne(
    matchScore * 0.50
    + fridgeRescueScore * 0.25
    + timeScore * 0.15
    + difficultyScore * 0.05
    + leftoverPercent * 0.05
  );

  const reasonJson = {
    match_reason: matchReason(matchScore),
    fridge_rescue_reason: fridgeRescueReason(fridgeRescueScore),
    time_reason: activeTimeMinutes > 0 ? `实际操作时间约 ${activeTimeMinutes} 分钟` : "",
    difficulty_reason: recipe?.difficulty ? `难度：${recipe.difficulty}` : "",
    leftover_reason: leftoverScore > 0 ? `剩菜友好度 ${leftoverScore}/5` : ""
  };

  return {
    user_id: userId,
    recipe_id: match.recipe_id,
    recipe_name: match.recipe_name,
    rank: 0,
    match_score: roundOne(matchScore),
    fridge_rescue_score: roundOne(fridgeRescueScore),
    tonight_score: tonightScore,
    active_time_minutes: Math.max(Math.round(activeTimeMinutes), 0),
    difficulty: recipe?.difficulty || "",
    leftover_score: roundOne(leftoverScore),
    reason_json: reasonJson,
    match_details_json: match,
    inventory_hash: inventoryHash,
    recipe_library_version: recipeLibraryVersion,
    algorithm_version: algorithmVersion
  };
}

function filterAndSortRows(rows, filters) {
  const cleanDifficulty = String(filters.difficulty || "").trim().toLowerCase();
  const minMatchScore = numberOrNull(filters.minMatchScore);
  const minLeftoverScore = numberOrNull(filters.minLeftoverScore);
  const filtered = rows.filter((row) => {
    if (minMatchScore !== null && row.match_score < minMatchScore) {
      return false;
    }
    if (minLeftoverScore !== null && row.leftover_score < minLeftoverScore) {
      return false;
    }
    if (cleanDifficulty && String(row.difficulty || "").toLowerCase() !== cleanDifficulty) {
      return false;
    }
    return true;
  });

  const sortKey = String(filters.sort || "tonight_score").trim();
  const sorted = [...filtered];
  if (sortKey === "active_time_minutes") {
    sorted.sort((left, right) => left.active_time_minutes - right.active_time_minutes || right.tonight_score - left.tonight_score);
  } else if (sortKey === "match_score") {
    sorted.sort((left, right) => right.match_score - left.match_score || right.tonight_score - left.tonight_score);
  } else if (sortKey === "fridge_rescue_score") {
    sorted.sort((left, right) => right.fridge_rescue_score - left.fridge_rescue_score || right.tonight_score - left.tonight_score);
  } else if (sortKey === "leftover_score") {
    sorted.sort((left, right) => right.leftover_score - left.leftover_score || right.tonight_score - left.tonight_score);
  } else {
    sorted.sort((left, right) => right.tonight_score - left.tonight_score || left.rank - right.rank);
  }
  return sorted;
}

async function fetchCachedRecommendationRows({
  userId,
  inventoryHash,
  recipeLibraryVersion,
  algorithmVersion,
  threshold
}) {
  const rows = await query(`
    select recipe_id,
           rank::text as rank,
           match_score::text as match_score,
           fridge_rescue_score::text as fridge_rescue_score,
           tonight_score::text as tonight_score,
           active_time_minutes::text as active_time_minutes,
           difficulty,
           leftover_score::text as leftover_score,
           reason_json::text as reason_json,
           match_details_json::text as match_details_json,
           inventory_hash,
           recipe_library_version,
           algorithm_version,
           calculated_at::text as calculated_at
    from user_recommendation_cache
    where user_id = ${sqlUuid(userId)}
      and inventory_hash = ${sqlString(inventoryHash)}
      and recipe_library_version = ${sqlString(recipeLibraryVersion)}
      and algorithm_version = ${sqlString(algorithmVersion)}
      and tonight_score >= ${sqlNumber(threshold, 80)}
    order by rank asc, tonight_score desc
  `);
  return rows.map(normalizeCachedRow);
}

async function replaceCachedRecommendations({
  userId,
  inventoryHash,
  recipeLibraryVersion,
  rows
}) {
  await query(`
    delete from user_recommendation_cache
    where user_id = ${sqlUuid(userId)}
  `);

  if (rows.length === 0) {
    return;
  }

  const values = rows.map((row) => `(
    ${sqlUuid(row.user_id)},
    ${sqlString(row.recipe_id)},
    ${sqlNumber(row.rank, 0)},
    ${sqlNumber(row.match_score, 0)},
    ${sqlNumber(row.fridge_rescue_score, 0)},
    ${sqlNumber(row.tonight_score, 0)},
    ${sqlNumber(row.active_time_minutes, 0)},
    ${sqlString(row.difficulty)},
    ${sqlNumber(row.leftover_score, 0)},
    ${sqlJson(row.reason_json)}::jsonb,
    ${sqlJson(row.match_details_json)}::jsonb,
    ${sqlString(inventoryHash)},
    ${sqlString(recipeLibraryVersion)},
    ${sqlString(row.algorithm_version)},
    now(),
    now()
  )`).join(",\n");

  await query(`
    insert into user_recommendation_cache (
      user_id,
      recipe_id,
      rank,
      match_score,
      fridge_rescue_score,
      tonight_score,
      active_time_minutes,
      difficulty,
      leftover_score,
      reason_json,
      match_details_json,
      inventory_hash,
      recipe_library_version,
      algorithm_version,
      calculated_at,
      updated_at
    )
    values ${values}
    on conflict (user_id, recipe_id, inventory_hash, recipe_library_version, algorithm_version)
    do update set
      rank = excluded.rank,
      match_score = excluded.match_score,
      fridge_rescue_score = excluded.fridge_rescue_score,
      tonight_score = excluded.tonight_score,
      active_time_minutes = excluded.active_time_minutes,
      difficulty = excluded.difficulty,
      leftover_score = excluded.leftover_score,
      reason_json = excluded.reason_json,
      match_details_json = excluded.match_details_json,
      calculated_at = excluded.calculated_at,
      updated_at = now()
  `);
}

function rowToRecommendation(row) {
  return {
    recipe_id: row.recipe_id,
    recipe_name: row.recipe_name,
    rank: row.rank,
    match_score: row.match_score,
    fridge_rescue_score: row.fridge_rescue_score,
    tonight_score: row.tonight_score,
    active_time_minutes: row.active_time_minutes,
    difficulty: row.difficulty,
    leftover_score: row.leftover_score,
    reason_json: row.reason_json,
    match: row.match_details_json
  };
}

function normalizeCachedRow(row) {
  const match = parseJson(row.match_details_json, {});
  return {
    recipe_id: row.recipe_id,
    recipe_name: match.recipe_name || "",
    rank: Number(row.rank || 0),
    match_score: Number(row.match_score || 0),
    fridge_rescue_score: Number(row.fridge_rescue_score || 0),
    tonight_score: Number(row.tonight_score || 0),
    active_time_minutes: Number(row.active_time_minutes || 0),
    difficulty: row.difficulty || "",
    leftover_score: Number(row.leftover_score || 0),
    reason_json: parseJson(row.reason_json, {}),
    match_details_json: match,
    inventory_hash: row.inventory_hash,
    recipe_library_version: row.recipe_library_version,
    algorithm_version: row.algorithm_version,
    calculated_at: row.calculated_at || ""
  };
}

function normalizeInventoryForHash(input) {
  const items = Array.isArray(input) ? input : [];
  return items
    .map((item) => ({
      ingredient_id: String(item?.ingredient_id || item?.canonicalIngredientId || item?.ingredientId || item?.name || "").trim().toLowerCase(),
      quantity: normalizedQuantity(item),
      unit: String(item?.canonical_unit || item?.canonicalUnit || item?.unit || "").trim().toLowerCase(),
      expire_date: normalizeDate(item?.expire_date || item?.expireDate)
    }))
    .filter((item) => item.ingredient_id)
    .sort((left, right) => {
      const leftKey = `${left.ingredient_id}|${left.expire_date}|${left.unit}|${left.quantity}`;
      const rightKey = `${right.ingredient_id}|${right.expire_date}|${right.unit}|${right.quantity}`;
      return leftKey.localeCompare(rightKey);
    });
}

function normalizedQuantity(item) {
  const canonicalQuantity = Number(item?.canonical_quantity ?? item?.canonicalQuantity);
  if (Number.isFinite(canonicalQuantity) && canonicalQuantity > 0) {
    return Math.round(canonicalQuantity * 1000) / 1000;
  }
  const quantity = Number(item?.quantity);
  return Number.isFinite(quantity) ? Math.round(quantity * 1000) / 1000 : 0;
}

function buildInventoryByIngredientId(inventoryInput) {
  const map = new Map();
  for (const item of Array.isArray(inventoryInput) ? inventoryInput : []) {
    const id = String(item?.ingredient_id || item?.canonicalIngredientId || item?.ingredientId || "").trim();
    if (id && !map.has(id)) {
      map.set(id, item);
    }
  }
  return map;
}

function fridgeRescueScoreForMatch(match, inventoryByIngredientId) {
  const matched = [
    ...(Array.isArray(match.matched_ingredients) ? match.matched_ingredients : []),
    ...(Array.isArray(match.substituted_ingredients) ? match.substituted_ingredients : [])
  ];
  let best = 0;
  for (const detail of matched) {
    const item = inventoryByIngredientId.get(String(detail.user_inventory_ingredient_id || ""));
    const days = daysUntil(item?.expire_date || item?.expireDate);
    if (days === null) {
      continue;
    }
    if (days <= 1) {
      best = Math.max(best, 100);
    } else if (days <= 3) {
      best = Math.max(best, 85);
    } else if (days <= 7) {
      best = Math.max(best, 70);
    } else if (days <= 14) {
      best = Math.max(best, 35);
    }
  }
  return best;
}

function activeTimeScore(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return 50;
  if (value <= 10) return 100;
  if (value <= 20) return 90;
  if (value <= 30) return 75;
  if (value <= 45) return 55;
  return 35;
}

function difficultyScoreForRecipe(difficulty) {
  const value = String(difficulty || "").trim().toLowerCase();
  if (["easy", "简单", "beginner"].includes(value)) return 100;
  if (["medium", "中等", "normal"].includes(value)) return 70;
  if (["hard", "困难", "advanced"].includes(value)) return 40;
  return 65;
}

function matchReason(score) {
  if (score >= 95) return "库存食材几乎完全匹配";
  if (score >= 85) return "库存食材匹配度很高";
  if (score >= 70) return "已有多数关键食材";
  return "需要补充部分食材";
}

function fridgeRescueReason(score) {
  if (score >= 100) return "包含今天或明天需要优先消耗的食材";
  if (score >= 85) return "可以消耗 3 天内即将过期的食材";
  if (score >= 70) return "可以帮助消耗一周内需要关注的食材";
  return "";
}

function daysUntil(value) {
  const date = normalizeDate(value);
  if (!date) return null;
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function normalizeDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseJson(value, fallback) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function sqlJson(value) {
  return sqlString(JSON.stringify(value ?? {}));
}

function sqlUuid(value) {
  const clean = String(value || "").trim();
  if (!isUUID(clean)) {
    throw new Error("Invalid UUID value.");
  }
  return `${sqlString(clean)}::uuid`;
}

function recommendationThreshold() {
  const value = Number(process.env.RECOMMENDATION_CACHE_MIN_TONIGHT_SCORE || 80);
  return Number.isFinite(value) ? value : 80;
}

function recommendationAlgorithmVersion() {
  return process.env.RECOMMENDATION_ALGORITHM_VERSION || "tableup-dinner-v1";
}

function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function roundOne(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : 0;
}
