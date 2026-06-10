const statementPath = "/api/2.0/sql/statements";

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
  if (!response.ok || payload.status?.state === "FAILED") {
    const message = payload.status?.error?.message || payload.message || `Databricks SQL failed with ${response.status}`;
    throw new Error(message);
  }

  if (payload.status?.state && payload.status.state !== "SUCCEEDED") {
    throw new Error(`Databricks statement did not finish: ${payload.status.state}`);
  }

  const columns = payload.manifest?.schema?.columns?.map((column) => column.name) || [];
  const rows = payload.result?.data_array || [];
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])));
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
    schema: process.env.DATABRICKS_SCHEMA || "default"
  };
}

function tableName(name) {
  const catalog = quoteIdentifier(process.env.DATABRICKS_CATALOG || "workspace");
  const schema = quoteIdentifier(process.env.DATABRICKS_SCHEMA || "default");
  return `${catalog}.${schema}.${quoteIdentifier(name)}`;
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
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
