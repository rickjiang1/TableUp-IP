import { randomUUID } from "node:crypto";
import { query, sqlBytea, sqlNumber, sqlString } from "./postgres.js";

export async function ensureSupabaseSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS pantry_recipes (
      recipe_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      active BOOLEAN NOT NULL DEFAULT true
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS pantry_recipe_ingredients (
      ingredient_id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES pantry_recipes(recipe_id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'main',
      name TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'piece',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS pantry_recipe_steps (
      step_id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES pantry_recipes(recipe_id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 0,
      instruction TEXT NOT NULL
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS pantry_media (
      file_name TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function fetchCloudRecipes() {
  await ensureSupabaseSchema();
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    query(`
      SELECT
        recipe_id,
        name,
        COALESCE(image_url, '') AS image_url,
        COALESCE(video_url, '') AS video_url,
        updated_at::text AS updated_at
      FROM pantry_recipes
      WHERE COALESCE(active, true) = true
      ORDER BY updated_at DESC, name ASC
    `),
    query(`
      SELECT
        i.recipe_id,
        i.ingredient_id,
        i.role,
        i.name,
        COALESCE(i.quantity, 1)::text AS quantity,
        COALESCE(i.unit, 'piece') AS unit,
        COALESCE(i.sort_order, 0)::text AS sort_order
      FROM pantry_recipe_ingredients i
      INNER JOIN pantry_recipes r ON r.recipe_id = i.recipe_id
      WHERE COALESCE(r.active, true) = true
      ORDER BY i.recipe_id, sort_order ASC, ingredient_id ASC
    `),
    query(`
      SELECT
        s.recipe_id,
        s.step_id,
        s.step_order::text AS step_order,
        s.instruction
      FROM pantry_recipe_steps s
      INNER JOIN pantry_recipes r ON r.recipe_id = s.recipe_id
      WHERE COALESCE(r.active, true) = true
      ORDER BY s.recipe_id, step_order ASC, step_id ASC
    `)
  ]);

  const ingredientsByRecipe = groupBy(ingredientRows, "recipe_id");
  const stepsByRecipe = groupBy(stepRows, "recipe_id");

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
  await ensureSupabaseSchema();
  const recipe = normalizeRecipeInput(input, recipeId);

  await query(`
    INSERT INTO pantry_recipes (recipe_id, name, image_url, video_url, updated_at, active)
    VALUES (
      ${sqlString(recipe.id)},
      ${sqlString(recipe.name)},
      ${sqlString(recipe.imageURL)},
      ${sqlString(recipe.videoURL)},
      now(),
      true
    )
    ON CONFLICT (recipe_id) DO UPDATE SET
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      video_url = EXCLUDED.video_url,
      updated_at = now(),
      active = true
  `);

  await query(`DELETE FROM pantry_recipe_ingredients WHERE recipe_id = ${sqlString(recipe.id)}`);
  await query(`DELETE FROM pantry_recipe_steps WHERE recipe_id = ${sqlString(recipe.id)}`);

  if (recipe.ingredients.length > 0) {
    await query(`
      INSERT INTO pantry_recipe_ingredients
        (ingredient_id, recipe_id, role, name, quantity, unit, sort_order)
      VALUES ${recipe.ingredients.map((ingredient, index) => `(
        ${sqlString(ingredient.id || randomUUID())},
        ${sqlString(recipe.id)},
        ${sqlString(normalizeRole(ingredient.role))},
        ${sqlString(ingredient.name)},
        ${sqlNumber(ingredient.quantity, 1)},
        ${sqlString(ingredient.unit || "piece")},
        ${sqlNumber(ingredient.sortOrder, index + 1)}
      )`).join(",")}
    `);
  }

  if (recipe.steps.length > 0) {
    await query(`
      INSERT INTO pantry_recipe_steps
        (step_id, recipe_id, step_order, instruction)
      VALUES ${recipe.steps.map((step, index) => `(
        ${sqlString(step.id || randomUUID())},
        ${sqlString(recipe.id)},
        ${sqlNumber(step.order, index + 1)},
        ${sqlString(step.text)}
      )`).join(",")}
    `);
  }

  return (await fetchCloudRecipes()).find((cloudRecipe) => cloudRecipe.id === recipe.id);
}

export async function deleteCloudRecipe(recipeId) {
  await ensureSupabaseSchema();
  if (!recipeId || typeof recipeId !== "string") {
    throw new Error("recipe id is required");
  }

  await query(`
    UPDATE pantry_recipes
    SET active = false, updated_at = now()
    WHERE recipe_id = ${sqlString(recipeId)}
  `);
}

export async function uploadVolumeFile({ data, mimeType = "application/octet-stream", extension = "bin" }) {
  await ensureSupabaseSchema();
  const safeExtension = String(extension || "bin").replace(/[^A-Za-z0-9]/g, "") || "bin";
  const fileName = `${randomUUID()}.${safeExtension}`;

  await query(`
    INSERT INTO pantry_media (file_name, mime_type, data)
    VALUES (${sqlString(fileName)}, ${sqlString(mimeType)}, ${sqlBytea(data)})
  `);

  return {
    fileName,
    path: `pantry_media/${fileName}`,
    url: `/api/media/${encodeURIComponent(fileName)}`
  };
}

export async function readVolumeFile(fileName) {
  await ensureSupabaseSchema();
  const safeFileName = sanitizeFileName(fileName);
  const rows = await query(`
    SELECT mime_type, encode(data, 'base64') AS data
    FROM pantry_media
    WHERE file_name = ${sqlString(safeFileName)}
    LIMIT 1
  `);

  if (rows.length === 0) {
    throw new Error("Media file was not found.");
  }

  return {
    data: Buffer.from(rows[0].data, "base64"),
    mimeType: rows[0].mime_type || mimeTypeForFileName(safeFileName)
  };
}

export async function upsertMediaFile({ fileName, data, mimeType = "application/octet-stream" }) {
  await ensureSupabaseSchema();
  const safeFileName = sanitizeFileName(fileName);
  await query(`
    INSERT INTO pantry_media (file_name, mime_type, data)
    VALUES (${sqlString(safeFileName)}, ${sqlString(mimeType)}, ${sqlBytea(data)})
    ON CONFLICT (file_name) DO UPDATE SET
      mime_type = EXCLUDED.mime_type,
      data = EXCLUDED.data
  `);
}

export async function recipeCount() {
  await ensureSupabaseSchema();
  const rows = await query("SELECT COUNT(*)::text AS count FROM pantry_recipes WHERE active = true");
  return Number(rows[0]?.count || 0);
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
