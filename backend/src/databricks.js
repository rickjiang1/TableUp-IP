import { randomUUID } from "node:crypto";

const statementPath = "/api/2.0/sql/statements";
const filesPath = "/api/2.0/fs/files";

export async function fetchCloudRecipes() {
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    runSql(`
      SELECT
        recipe_id,
        name,
        COALESCE(image_url, '') AS image_url,
        COALESCE(video_url, '') AS video_url,
        CAST(updated_at AS STRING) AS updated_at
      FROM ${tableName("pantry_recipes")}
      WHERE COALESCE(active, true) = true
      ORDER BY updated_at DESC, name ASC
    `),
    runSql(`
      SELECT
        i.recipe_id,
        i.ingredient_id,
        i.role,
        i.name,
        COALESCE(i.quantity, 1) AS quantity,
        COALESCE(i.unit, 'piece') AS unit,
        COALESCE(i.sort_order, 0) AS sort_order
      FROM ${tableName("pantry_recipe_ingredients")} i
      INNER JOIN ${tableName("pantry_recipes")} r
        ON r.recipe_id = i.recipe_id
      WHERE COALESCE(r.active, true) = true
      ORDER BY i.recipe_id, sort_order ASC, ingredient_id ASC
    `),
    runSql(`
      SELECT
        s.recipe_id,
        s.step_id,
        s.step_order,
        s.instruction
      FROM ${tableName("pantry_recipe_steps")} s
      INNER JOIN ${tableName("pantry_recipes")} r
        ON r.recipe_id = s.recipe_id
      WHERE COALESCE(r.active, true) = true
      ORDER BY s.recipe_id, step_order ASC, step_id ASC
    `)
  ]);

  const ingredientsByRecipe = groupBy(ingredientRows, "recipe_id");
  const stepsByRecipe = groupBy(stepRows, "recipe_id");

  return recipeRows.map((recipe) => ({
    id: recipe.recipe_id,
    name: recipe.name,
    imageURL: recipe.image_url,
    videoURL: recipe.video_url,
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
  await runSql(`
    MERGE INTO ${tableName("pantry_recipes")} AS target
    USING (
      SELECT
        ${sqlString(recipe.id)} AS recipe_id,
        ${sqlString(recipe.name)} AS name,
        ${sqlString(recipe.imageURL)} AS image_url,
        ${sqlString(recipe.videoURL)} AS video_url
    ) AS source
    ON target.recipe_id = source.recipe_id
    WHEN MATCHED THEN UPDATE SET
      name = source.name,
      image_url = source.image_url,
      video_url = source.video_url,
      updated_at = current_timestamp(),
      active = true
    WHEN NOT MATCHED THEN INSERT (
      recipe_id,
      name,
      image_url,
      video_url,
      updated_at,
      active
    ) VALUES (
      source.recipe_id,
      source.name,
      source.image_url,
      source.video_url,
      current_timestamp(),
      true
    )
  `);

  await runSql(`DELETE FROM ${tableName("pantry_recipe_ingredients")} WHERE recipe_id = ${sqlString(recipe.id)}`);
  await runSql(`DELETE FROM ${tableName("pantry_recipe_steps")} WHERE recipe_id = ${sqlString(recipe.id)}`);

  if (recipe.ingredients.length > 0) {
    await runSql(`
      INSERT INTO ${tableName("pantry_recipe_ingredients")}
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
    await runSql(`
      INSERT INTO ${tableName("pantry_recipe_steps")}
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
  if (!recipeId || typeof recipeId !== "string") {
    throw new Error("recipe id is required");
  }

  await runSql(`
    UPDATE ${tableName("pantry_recipes")}
    SET active = false, updated_at = current_timestamp()
    WHERE recipe_id = ${sqlString(recipeId)}
  `);
}

export async function uploadVolumeFile({ data, mimeType = "application/octet-stream", extension = "bin" }) {
  const config = databricksConfig();
  const volumePath = volumeConfig().path;
  const safeExtension = String(extension || "bin").replace(/[^A-Za-z0-9]/g, "") || "bin";
  const fileName = `${randomUUID()}.${safeExtension}`;
  const path = `${volumePath}/${fileName}`;

  const response = await fetch(`${config.host}${filesPath}${encodePath(path)}?overwrite=true`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": mimeType
    },
    body: data
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Databricks media upload failed with ${response.status}: ${text}`);
  }

  return {
    fileName,
    path,
    url: `/api/media/${encodeURIComponent(fileName)}`
  };
}

export async function readVolumeFile(fileName) {
  const config = databricksConfig();
  const volumePath = volumeConfig().path;
  const safeFileName = sanitizeFileName(fileName);
  const path = `${volumePath}/${safeFileName}`;
  const response = await fetch(`${config.host}${filesPath}${encodePath(path)}`, {
    headers: {
      Authorization: `Bearer ${config.token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Databricks media read failed with ${response.status}: ${text}`);
  }

  return {
    data: Buffer.from(await response.arrayBuffer()),
    mimeType: mimeTypeForFileName(safeFileName)
  };
}

async function runSql(statement) {
  const config = databricksConfig();
  const response = await fetch(`${config.host}${statementPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      warehouse_id: config.warehouseId,
      catalog: config.catalog,
      schema: config.schema,
      wait_timeout: "30s",
      statement
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload.status?.error?.message || payload.message || `Databricks SQL failed with ${response.status}`;
    throw new Error(message);
  }

  return rowsFromStatement(await waitForStatement(config, payload));
}

async function waitForStatement(config, payload) {
  let current = payload;
  const startedAt = Date.now();

  while (current.status?.state && current.status.state !== "SUCCEEDED") {
    if (current.status.state === "FAILED" || current.status.state === "CANCELED" || current.status.state === "CLOSED") {
      const message = current.status?.error?.message || `Databricks statement ended with ${current.status.state}`;
      throw new Error(message);
    }

    if (!current.statement_id) {
      throw new Error(`Databricks statement did not finish: ${current.status.state}`);
    }

    if (Date.now() - startedAt > 180_000) {
      throw new Error(`Databricks statement timed out: ${current.status.state}`);
    }

    await sleep(1_000);

    const response = await fetch(`${config.host}${statementPath}/${current.statement_id}`, {
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
    current = await response.json();
    if (!response.ok) {
      const message = current.status?.error?.message || current.message || `Databricks SQL status failed with ${response.status}`;
      throw new Error(message);
    }
  }

  return current;
}

function rowsFromStatement(payload) {
  const columns = payload.manifest?.schema?.columns?.map((column) => column.name) || [];
  const rows = payload.result?.data_array || [];
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])));
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

function sqlString(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function sqlNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(fallback);
}

function databricksConfig() {
  const host = (process.env.DATABRICKS_HOST || "").replace(/\/$/, "");
  const token = process.env.DATABRICKS_TOKEN || "";
  const httpPath = process.env.DATABRICKS_HTTP_PATH || "";
  const warehouseId = httpPath.match(/warehouses\/([^/]+)/)?.[1] || "";

  if (!host || !token || !warehouseId) {
    throw new Error("Databricks is not configured. Add DATABRICKS_HOST, DATABRICKS_TOKEN, and DATABRICKS_HTTP_PATH to backend/.env.");
  }

  return {
    host,
    token,
    warehouseId,
    catalog: process.env.DATABRICKS_CATALOG || "workspace",
    schema: process.env.DATABRICKS_SCHEMA || "foodmanagement"
  };
}

function volumeConfig() {
  const path = (process.env.DATABRICKS_VOLUME_PATH || "").replace(/\/$/, "");
  if (!path) {
    throw new Error("Databricks media volume is not configured. Add DATABRICKS_VOLUME_PATH to backend/.env.");
  }
  return { path };
}

function tableName(name) {
  const catalog = quoteIdentifier(process.env.DATABRICKS_CATALOG || "workspace");
  const schema = quoteIdentifier(process.env.DATABRICKS_SCHEMA || "foodmanagement");
  return `${catalog}.${schema}.${quoteIdentifier(name)}`;
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
}

function encodePath(path) {
  return path.split("/").map((part, index) => index === 0 ? "" : encodeURIComponent(part)).join("/");
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
