import { randomUUID } from "node:crypto";

export async function ensureSupabaseSchema() {
  // Tables are created by the migration/bootstrap step. REST mode keeps Render off Postgres TCP.
}

export async function fetchCloudRecipes() {
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    restSelectAll("pantry_recipes", "select=recipe_id,name,image_url,video_url,updated_at,total_time_minutes,active_time_minutes,primary_cooking_method,difficulty,leftover_score,cleanup_score&active=eq.true&order=updated_at.desc,name.asc"),
    restSelectAll("pantry_recipe_ingredients", "select=recipe_id,ingredient_id,canonical_ingredient_id,role,name,quantity,unit,sort_order,required_flag,optional_flag,pantry_flag&order=recipe_id.asc,sort_order.asc,ingredient_id.asc"),
    restSelectAll("pantry_recipe_steps", "select=recipe_id,step_id,step_order,instruction&order=recipe_id.asc,step_order.asc,step_id.asc")
  ]);

  const activeRecipeIds = new Set(recipeRows.map((recipe) => recipe.recipe_id));
  const ingredientsByRecipe = groupBy(
    ingredientRows.filter((ingredient) => activeRecipeIds.has(ingredient.recipe_id)),
    "recipe_id"
  );
  const stepsByRecipe = groupBy(
    stepRows.filter((step) => activeRecipeIds.has(step.recipe_id)),
    "recipe_id"
  );

  return recipeRows.map((recipe) => ({
    id: recipe.recipe_id,
    name: recipe.name,
    imageURL: recipe.image_url || "",
    videoURL: recipe.video_url || "",
    updatedAt: recipe.updated_at,
    totalTimeMinutes: Number(recipe.total_time_minutes || 0),
    activeTimeMinutes: Number(recipe.active_time_minutes || 0),
    primaryCookingMethod: recipe.primary_cooking_method || "",
    difficulty: recipe.difficulty || "",
    leftoverScore: Number(recipe.leftover_score || 0),
    cleanupScore: Number(recipe.cleanup_score || 0),
    ingredients: (ingredientsByRecipe.get(recipe.recipe_id) || []).map((ingredient) => ({
      id: ingredient.ingredient_id,
      canonicalIngredientId: ingredient.canonical_ingredient_id || "",
      role: normalizeRole(ingredient.role),
      name: ingredient.name,
      quantity: Number(ingredient.quantity || 1),
      unit: ingredient.unit || "piece",
      sortOrder: Number(ingredient.sort_order || 0),
      requiredFlag: ingredient.required_flag ?? normalizeRole(ingredient.role) === "main",
      optionalFlag: ingredient.optional_flag ?? normalizeRole(ingredient.role) === "secondary",
      pantryFlag: ingredient.pantry_flag ?? normalizeRole(ingredient.role) === "seasoning"
    })),
    steps: (stepsByRecipe.get(recipe.recipe_id) || []).map((step) => normalizeStoredRecipeStep(step))
  }));
}

export async function upsertCloudRecipe(input, recipeId = randomUUID()) {
  const recipe = normalizeRecipeInput(input, recipeId);
  const now = new Date().toISOString();

  await restWrite(
    "pantry_recipes?on_conflict=recipe_id",
    "POST",
    [{
      recipe_id: recipe.id,
      name: recipe.name,
      image_url: recipe.imageURL,
      video_url: recipe.videoURL,
      total_time_minutes: recipe.totalTimeMinutes,
      active_time_minutes: recipe.activeTimeMinutes,
      primary_cooking_method: recipe.primaryCookingMethod,
      difficulty: recipe.difficulty,
      leftover_score: recipe.leftoverScore,
      cleanup_score: recipe.cleanupScore,
      updated_at: now,
      active: true
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  await restWrite(`pantry_recipe_ingredients?recipe_id=eq.${encodeURIComponent(recipe.id)}`, "DELETE");
  await restWrite(`pantry_recipe_steps?recipe_id=eq.${encodeURIComponent(recipe.id)}`, "DELETE");

  if (recipe.ingredients.length > 0) {
    await restWrite(
      "pantry_recipe_ingredients",
      "POST",
      recipe.ingredients.map((ingredient, index) => ({
        ingredient_id: ingredient.id || randomUUID(),
        recipe_id: recipe.id,
        role: normalizeRole(ingredient.role),
        name: ingredient.name,
        canonical_ingredient_id: ingredient.canonicalIngredientId || "",
        quantity: Number.isFinite(Number(ingredient.quantity)) ? Number(ingredient.quantity) : 1,
        unit: ingredient.unit || "piece",
        sort_order: Number.isFinite(Number(ingredient.sortOrder)) ? Number(ingredient.sortOrder) : index + 1,
        required_flag: ingredient.requiredFlag ?? normalizeRole(ingredient.role) === "main",
        optional_flag: ingredient.optionalFlag ?? normalizeRole(ingredient.role) === "secondary",
        pantry_flag: ingredient.pantryFlag ?? normalizeRole(ingredient.role) === "seasoning"
      }))
    );
  }

  if (recipe.steps.length > 0) {
    await restWrite(
      "pantry_recipe_steps",
      "POST",
      recipe.steps.map((step, index) => ({
        step_id: step.id || randomUUID(),
        recipe_id: recipe.id,
        step_order: Number.isFinite(Number(step.order)) ? Number(step.order) : index + 1,
        instruction: JSON.stringify({
          text: step.text,
          phase: normalizeStepPhase(step.phase),
          imageURLs: Array.isArray(step.imageURLs) ? step.imageURLs : []
        })
      }))
    );
  }

  return (await fetchCloudRecipes()).find((cloudRecipe) => cloudRecipe.id === recipe.id);
}

export async function deleteCloudRecipe(recipeId) {
  if (!recipeId || typeof recipeId !== "string") {
    throw new Error("recipe id is required");
  }

  await restWrite(
    `pantry_recipes?recipe_id=eq.${encodeURIComponent(recipeId)}`,
    "PATCH",
    {
      active: false,
      updated_at: new Date().toISOString()
    }
  );
}

export async function uploadVolumeFile({ data, mimeType = "application/octet-stream", extension = "bin" }) {
  const safeExtension = String(extension || "bin").replace(/[^A-Za-z0-9]/g, "") || "bin";
  const fileName = `${randomUUID()}.${safeExtension}`;

  await restWrite(
    "pantry_media?on_conflict=file_name",
    "POST",
    [{
      file_name: fileName,
      mime_type: mimeType,
      data_base64: Buffer.from(data).toString("base64")
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  return {
    fileName,
    path: `pantry_media/${fileName}`,
    url: `/api/media/${encodeURIComponent(fileName)}`
  };
}

export async function readVolumeFile(fileName) {
  const safeFileName = sanitizeFileName(fileName);
  const rows = await restSelect(
    "pantry_media",
    `select=mime_type,data_base64&file_name=eq.${encodeURIComponent(safeFileName)}&limit=1`
  );

  if (rows.length === 0 || !rows[0].data_base64) {
    throw new Error("Media file was not found.");
  }

  return {
    data: Buffer.from(rows[0].data_base64, "base64"),
    mimeType: rows[0].mime_type || mimeTypeForFileName(safeFileName)
  };
}

export async function upsertMediaFile({ fileName, data, mimeType = "application/octet-stream" }) {
  const safeFileName = sanitizeFileName(fileName);
  await restWrite(
    "pantry_media?on_conflict=file_name",
    "POST",
    [{
      file_name: safeFileName,
      mime_type: mimeType,
      data_base64: Buffer.from(data).toString("base64")
    }],
    { prefer: "resolution=merge-duplicates" }
  );
}

export async function recipeCount() {
  const rows = await restSelect("pantry_recipes", "select=recipe_id&active=eq.true");
  return rows.length;
}

export async function fetchMatchingRules() {
  const [ingredients, aliases, substitutions, substitutionContexts] = await Promise.all([
    restSelectAll("ingredients", "select=ingredient_id,canonical_name,category,canonical_unit&order=ingredient_id.asc"),
    restSelectAll("ingredient_aliases", "select=alias_name,ingredient_id&order=alias_name.asc"),
    restSelectAll("ingredient_substitutions", "select=ingredient_id,substitute_ingredient_id,confidence_score&order=ingredient_id.asc,substitute_ingredient_id.asc"),
    fetchSubstitutionContexts()
  ]);

  return { ingredients, aliases, substitutions, substitutionContexts };
}

async function fetchSubstitutionContexts() {
  try {
    return await restSelectAll(
      "ingredient_substitution_contexts",
      "select=ingredient_id,substitute_ingredient_id,compatible_methods,time_adjustment,texture_impact,fat_impact,notes&order=ingredient_id.asc,substitute_ingredient_id.asc"
    );
  } catch (error) {
    if (String(error?.message || "").includes("ingredient_substitution_contexts")) {
      return [];
    }
    throw error;
  }
}

export async function fetchIngredientUnitConversions(ingredientId) {
  const id = String(ingredientId || "").trim();
  if (!id) {
    return [];
  }
  return await restSelectAll(
    "ingredient_unit_conversion",
    `select=ingredient_id,from_unit,to_unit,ratio,conversion_type,is_default,notes&ingredient_id=eq.${encodeURIComponent(id)}&order=from_unit.asc`
  );
}

export async function fetchIngredientDictionary(language = "en") {
  const ingredients = await restSelectAll(
    "ingredients",
    "select=ingredient_id,canonical_name,category,canonical_unit&order=category.asc,canonical_name.asc"
  );
  const normalizedLanguage = String(language || "en").trim().toLowerCase();
  if (normalizedLanguage !== "zh") {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      display_name: ingredient.canonical_name
    }));
  }

  const aliases = await restSelectAll(
    "ingredient_aliases",
    "select=alias_name,ingredient_id&language=eq.zh&verified=eq.true&order=alias_name.asc"
  );
  const aliasByIngredientId = new Map();
  for (const alias of aliases) {
    if (!aliasByIngredientId.has(alias.ingredient_id)) {
      aliasByIngredientId.set(alias.ingredient_id, alias.alias_name);
    }
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    display_name: aliasByIngredientId.get(ingredient.ingredient_id) || ingredient.canonical_name
  }));
}

export async function fetchIngredientStorageLifeRules() {
  return await restSelectAll(
    "ingredient_storage_life_rules",
    "select=ingredient_id,category,storage_approach,storage_location,default_days,condition_state,aliases,priority,notes,source_name,source_url,source_priority,safety_note,active&active=eq.true&condition_state=eq.default&order=priority.asc,ingredient_id.asc,storage_approach.asc"
  );
}

export async function upsertUnknownIngredients(items) {
  const normalized = Array.isArray(items)
    ? items
        .map((item) => ({
          raw_name: typeof item.rawName === "string" ? item.rawName.trim() : "",
          normalized_name: canonicalIngredientId(item.rawName),
          source: typeof item.source === "string" ? item.source : "inventory",
          status: "pending",
          occurrence_count: Number.isFinite(Number(item.occurrenceCount)) ? Number(item.occurrenceCount) : 1,
          last_seen_at: new Date().toISOString()
        }))
        .filter((item) => item.raw_name && item.normalized_name)
    : [];

  if (normalized.length === 0) {
    return;
  }

  await Promise.all(normalized.map(async (item) => {
    try {
      const existing = await restSelect(
        "unknown_ingredients",
        `select=id,occurrence_count&normalized_name=eq.${encodeURIComponent(item.normalized_name)}&source=eq.${encodeURIComponent(item.source)}&status=eq.pending&limit=1`
      );

      if (existing.length > 0) {
        await restWrite(
          `unknown_ingredients?id=eq.${encodeURIComponent(existing[0].id)}`,
          "PATCH",
          {
            raw_name: item.raw_name,
            occurrence_count: Number(existing[0].occurrence_count || 0) + item.occurrence_count,
            last_seen_at: item.last_seen_at
          }
        );
        return;
      }

      await restWrite("unknown_ingredients", "POST", [{
        raw_name: item.raw_name,
        normalized_name: item.normalized_name,
        source: item.source,
        status: item.status,
        occurrence_count: item.occurrence_count,
        first_seen_at: item.last_seen_at,
        last_seen_at: item.last_seen_at
      }]);
    } catch (error) {
      console.warn(`Unable to record unknown ingredient "${item.raw_name}": ${error.message}`);
    }
  }));
}

export async function fetchPendingUnknownIngredients(limit = 25, source = "") {
  try {
    const normalizedSource = String(source || "").trim();
    const sourceFilter = normalizedSource ? `&source=eq.${encodeURIComponent(normalizedSource)}` : "";
    return await restSelect(
      "unknown_ingredients",
      `select=id,raw_name,normalized_name,source,suggested_canonical_name,ai_confidence,status,occurrence_count,first_seen_at,last_seen_at&status=eq.pending${sourceFilter}&order=last_seen_at.desc&limit=${Math.max(1, Math.min(Number(limit) || 25, 100))}`
    );
  } catch (error) {
    console.warn(`Unable to fetch pending unknown ingredients: ${error.message}`);
    return [];
  }
}

export async function upsertIngredientAliasSuggestion({ aliasName, ingredientId, canonicalName, category = "other", confidenceScore = 0.7, verified = false, language = "mixed", unknownIngredientId = "" }) {
  const alias = String(aliasName || "").trim();
  const canonical = String(canonicalName || ingredientId || "").trim();
  const id = String(ingredientId || canonicalIngredientId(canonical)).trim();
  if (!alias || !id || !canonical) {
    throw new Error("aliasName and canonicalName are required.");
  }

  await restWrite(
    "ingredients?on_conflict=ingredient_id",
    "POST",
    [{
      ingredient_id: id,
      canonical_name: canonical,
      category
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  await restWrite(
    "ingredient_aliases?on_conflict=alias_name",
    "POST",
    [{
      alias_name: alias,
      ingredient_id: id,
      canonical_name: canonical,
      category,
      language,
      confidence_score: confidenceScore,
      verified
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  if (unknownIngredientId) {
    await restWrite(
      `unknown_ingredients?id=eq.${encodeURIComponent(unknownIngredientId)}`,
      "PATCH",
      {
        suggested_canonical_name: canonical,
        suggested_ingredient_id: id,
        ai_confidence: confidenceScore,
        status: "resolved",
        last_seen_at: new Date().toISOString()
      }
    );
  }
}

export async function markUnknownIngredientResolved({ unknownIngredientId = "", ingredientId = "", canonicalName = "", confidenceScore = 1 }) {
  const id = String(unknownIngredientId || "").trim();
  const canonicalId = String(ingredientId || "").trim();
  const canonical = String(canonicalName || canonicalId).trim();

  if (!id || !canonicalId) {
    throw new Error("unknownIngredientId and ingredientId are required.");
  }

  await restWrite(
    `unknown_ingredients?id=eq.${encodeURIComponent(id)}`,
    "PATCH",
    {
      suggested_canonical_name: canonical,
      suggested_ingredient_id: canonicalId,
      ai_confidence: Number(confidenceScore || 1),
      status: "resolved",
      last_seen_at: new Date().toISOString()
    }
  );
}

export async function restSelect(table, queryString) {
  return restRequest(`${table}?${queryString}`, { method: "GET" });
}

export async function restSelectAll(table, queryString, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await restRequest(`${table}?${queryString}`, {
      method: "GET",
      range: `${offset}-${offset + pageSize - 1}`
    });
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
  }
}

export async function restWrite(path, method, body, options = {}) {
  return restRequest(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    prefer: options.prefer
  });
}

async function restRequest(path, { method, body, prefer, range }) {
  const config = supabaseRestConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(range ? { Range: range } : {}),
      ...(prefer ? { Prefer: prefer } : {})
    },
    body
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Supabase REST failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : [];
}

function supabaseRestConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    throw new Error("Supabase REST is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, key };
}

function normalizeRecipeInput(input, recipeId) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) {
    throw new Error("Recipe name is required.");
  }

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : recipeId,
    name,
    imageURL: typeof input.imageURL === "string" ? input.imageURL.trim() : "",
    videoURL: typeof input.videoURL === "string" ? input.videoURL.trim() : "",
    totalTimeMinutes: Number(input.totalTimeMinutes || 0),
    activeTimeMinutes: Number(input.activeTimeMinutes || 0),
    primaryCookingMethod: normalizeCookingMethods(input.primaryCookingMethod),
    difficulty: typeof input.difficulty === "string" ? input.difficulty.trim() : "",
    leftoverScore: Number(input.leftoverScore || 0),
    cleanupScore: Number(input.cleanupScore || 0),
    ingredients: Array.isArray(input.ingredients)
      ? input.ingredients
          .map((ingredient) => ({
            id: typeof ingredient.id === "string" ? ingredient.id : "",
            canonicalIngredientId: typeof ingredient.canonicalIngredientId === "string" ? ingredient.canonicalIngredientId : "",
            role: ingredient.role,
            name: typeof ingredient.name === "string" ? ingredient.name.trim() : "",
            quantity: Number(ingredient.quantity || 1),
            unit: typeof ingredient.unit === "string" ? ingredient.unit.trim() : "piece",
            sortOrder: Number(ingredient.sortOrder || 0),
            requiredFlag: typeof ingredient.requiredFlag === "boolean" ? ingredient.requiredFlag : undefined,
            optionalFlag: typeof ingredient.optionalFlag === "boolean" ? ingredient.optionalFlag : undefined,
            pantryFlag: typeof ingredient.pantryFlag === "boolean" ? ingredient.pantryFlag : undefined
          }))
          .filter((ingredient) => ingredient.name)
      : [],
    steps: Array.isArray(input.steps)
      ? input.steps
          .map((step, index) => ({
            id: typeof step.id === "string" ? step.id : "",
            order: Number(step.order || index + 1),
            phase: normalizeStepPhase(step.phase),
            text: typeof step.text === "string" ? step.text.trim() : "",
            imageURLs: Array.isArray(step.imageURLs)
              ? step.imageURLs.map((url) => String(url || "").trim()).filter(Boolean)
              : []
          }))
          .filter((step) => step.text || step.imageURLs.length > 0)
      : []
  };
}

function normalizeStoredRecipeStep(step) {
  const parsed = parseStepInstruction(step.instruction);
  return {
    id: step.step_id,
    order: Number(step.step_order || 0),
    phase: normalizeStepPhase(parsed.phase),
    text: parsed.text,
    imageURLs: parsed.imageURLs
  };
}

function parseStepInstruction(instruction) {
  const value = String(instruction || "").trim();
  if (!value.startsWith("{")) {
    return { text: value, phase: "COOK", imageURLs: [] };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      text: typeof parsed.text === "string" ? parsed.text : value,
      phase: normalizeStepPhase(parsed.phase),
      imageURLs: Array.isArray(parsed.imageURLs)
        ? parsed.imageURLs.map((url) => String(url || "").trim()).filter(Boolean)
        : []
    };
  } catch {
    return { text: value, phase: "COOK", imageURLs: [] };
  }
}

function normalizeStepPhase(phase) {
  const value = String(phase || "").trim().toUpperCase();
  if (value === "CLEANUP") {
    return "FINISH";
  }
  return ["PLANNING", "PREP", "COOK", "FINISH"].includes(value) ? value : "COOK";
}

function normalizeCookingMethod(method) {
  const value = String(method || "").trim().toLowerCase();
  const allowed = new Set([
    "",
    "stir_fry",
    "pan_fry",
    "grill",
    "bake",
    "roast",
    "braise",
    "stew",
    "slow_cook",
    "soup",
    "steam",
    "boil",
    "hot_pot",
    "air_fry",
    "deep_fry",
    "poach",
    "smoke",
    "quick_boil",
    "sauce",
    "stuffing",
    "raw"
  ]);
  return allowed.has(value) ? value : "";
}

function normalizeCookingMethods(methods) {
  const normalized = String(methods || "")
    .split(",")
    .map(normalizeCookingMethod)
    .filter(Boolean);
  return [...new Set(normalized)].join(",");
}

function sanitizeFileName(fileName) {
  const safeFileName = String(fileName || "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(safeFileName)) {
    throw new Error("Invalid media file name.");
  }
  return safeFileName;
}

function mimeTypeForFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".heic")) {
    return "image/heic";
  }
  if (lower.endsWith(".mov")) {
    return "video/quicktime";
  }
  if (lower.endsWith(".mp4")) {
    return "video/mp4";
  }
  return "application/octet-stream";
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) {
      grouped.set(value, []);
    }
    grouped.get(value).push(row);
  }
  return grouped;
}

function normalizeRole(role) {
  if (role === "secondary" || role === "seasoning") {
    return role;
  }
  return "main";
}

function canonicalIngredientId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
