import { randomUUID } from "node:crypto";

export async function ensureSupabaseSchema() {
  // Tables are created by the migration/bootstrap step. REST mode keeps Render off Postgres TCP.
}

export async function fetchCloudRecipes() {
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    restSelect("pantry_recipes", "select=recipe_id,name,image_url,video_url,updated_at&active=eq.true&order=updated_at.desc,name.asc"),
    restSelect("pantry_recipe_ingredients", "select=recipe_id,ingredient_id,role,name,quantity,unit,sort_order&order=recipe_id.asc,sort_order.asc,ingredient_id.asc"),
    restSelect("pantry_recipe_steps", "select=recipe_id,step_id,step_order,instruction&order=recipe_id.asc,step_order.asc,step_id.asc")
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
    ingredients: (ingredientsByRecipe.get(recipe.recipe_id) || []).map((ingredient) => ({
      id: ingredient.ingredient_id,
      role: normalizeRole(ingredient.role),
      name: ingredient.name,
      quantity: Number(ingredient.quantity || 1),
      unit: ingredient.unit || "piece",
      sortOrder: Number(ingredient.sort_order || 0)
    })),
    steps: (stepsByRecipe.get(recipe.recipe_id) || []).map((step) => ({
      id: step.step_id,
      order: Number(step.step_order || 0),
      text: step.instruction
    }))
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
        quantity: Number.isFinite(Number(ingredient.quantity)) ? Number(ingredient.quantity) : 1,
        unit: ingredient.unit || "piece",
        sort_order: Number.isFinite(Number(ingredient.sortOrder)) ? Number(ingredient.sortOrder) : index + 1
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
        instruction: step.text
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

async function restSelect(table, queryString) {
  return restRequest(`${table}?${queryString}`, { method: "GET" });
}

async function restWrite(path, method, body, options = {}) {
  return restRequest(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    prefer: options.prefer
  });
}

async function restRequest(path, { method, body, prefer }) {
  const config = supabaseRestConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
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
    ingredients: Array.isArray(input.ingredients)
      ? input.ingredients
          .map((ingredient) => ({
            id: typeof ingredient.id === "string" ? ingredient.id : "",
            role: ingredient.role,
            name: typeof ingredient.name === "string" ? ingredient.name.trim() : "",
            quantity: Number(ingredient.quantity || 1),
            unit: typeof ingredient.unit === "string" ? ingredient.unit.trim() : "piece",
            sortOrder: Number(ingredient.sortOrder || 0)
          }))
          .filter((ingredient) => ingredient.name)
      : [],
    steps: Array.isArray(input.steps)
      ? input.steps
          .map((step, index) => ({
            id: typeof step.id === "string" ? step.id : "",
            order: Number(step.order || index + 1),
            text: typeof step.text === "string" ? step.text.trim() : ""
          }))
          .filter((step) => step.text)
      : []
  };
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
