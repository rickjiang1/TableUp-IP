import { readFileSync } from "node:fs";
import { query } from "./postgres.js";

loadEnv();

const sql = readFileSync(new URL("../migrations/20260621_household_user_mvp.sql", import.meta.url), "utf8");
await query(sql);
console.log("Applied household user MVP migration.");

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
    // Running without a local env is fine when Render injects environment variables.
  }
}
