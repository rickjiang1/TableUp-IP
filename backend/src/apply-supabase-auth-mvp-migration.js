import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { query } from "./postgres.js";

loadEnv();

const sql = readFileSync(new URL("../migrations/20260621_supabase_auth_mvp.sql", import.meta.url), "utf8");
await query(sql);
console.log("Applied Supabase Auth MVP migration.");

function loadEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
