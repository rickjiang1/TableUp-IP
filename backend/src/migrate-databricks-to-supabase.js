import { readFileSync, existsSync } from "node:fs";
import { fetchCloudRecipes as fetchDatabricksRecipes, readVolumeFile as readDatabricksVolumeFile } from "./databricks.js";
import { ensureSupabaseSchema, upsertCloudRecipe, upsertMediaFile, recipeCount } from "./supabase.js";

loadEnv();

const recipes = await fetchDatabricksRecipes();
await ensureSupabaseSchema();

let mediaCount = 0;
for (const recipe of recipes) {
  if (recipe.imageURL?.startsWith("/api/media/")) {
    const fileName = decodeURIComponent(recipe.imageURL.split("/").pop() || "");
    try {
      const file = await readDatabricksVolumeFile(fileName);
      await upsertMediaFile({
        fileName,
        data: file.data,
        mimeType: file.mimeType
      });
      mediaCount += 1;
    } catch (error) {
      console.warn(`Could not migrate media ${fileName}: ${error.message}`);
    }
  }

  await upsertCloudRecipe(recipe, recipe.id);
}

console.log(`Migrated ${recipes.length} recipe(s), ${mediaCount} media file(s). Supabase active recipes: ${await recipeCount()}.`);

function loadEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ||= value;
  }
}
