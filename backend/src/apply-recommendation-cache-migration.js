import { readFileSync } from "node:fs";
import { query } from "./postgres.js";

loadEnv();

const migrations = [
  "../migrations/20260622_user_recommendation_cache.sql",
  "../migrations/20260622_recommendation_inventory_version.sql"
];

for (const migration of migrations) {
  const sql = readFileSync(new URL(migration, import.meta.url), "utf8");
  await query(sql);
}
console.log("Applied recommendation cache migration.");

function loadEnv() {
  const envPath = new URL("../.env", import.meta.url);
  try {
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
  } catch {
    // Render injects environment variables in deployed environments.
  }
}
