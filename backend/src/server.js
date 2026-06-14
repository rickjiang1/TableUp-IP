import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { deleteCloudRecipe, fetchCloudRecipes, readVolumeFile, uploadVolumeFile, upsertCloudRecipe } from "./supabase.js";
import { matchRecipesForInventory } from "./recipeMatching.js";
import { groceryExtractionSchema, recipeExtractionSchema } from "./schemas.js";

loadEnv();

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/recipes") {
      const recipes = await fetchCloudRecipes();
      sendJson(response, 200, { recipes });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/recipe-matches") {
      const body = await readJsonRequest(request, 1024 * 1024);
      const matches = await matchRecipesForInventory(body.inventory);
      sendJson(response, 200, { matches });
      return;
    }

    const mediaMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/);
    if (mediaMatch && request.method === "GET") {
      const file = await readVolumeFile(decodeURIComponent(mediaMatch[1]));
      response.writeHead(200, {
        "Content-Type": file.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      response.end(file.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/media/image") {
      const body = await readRequestBody(request, 8 * 1024 * 1024);
      const file = parseMultipartFile(request.headers["content-type"], body, ["file", "photo", "image"]);

      if (!file) {
        sendJson(response, 400, { error: "file is required" });
        return;
      }

      const uploaded = await uploadVolumeFile({
        data: file.data,
        mimeType: file.mimeType,
        extension: extensionForMimeType(file.mimeType)
      });
      sendJson(response, 201, uploaded);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/recipes") {
      const recipe = await readJsonRequest(request, 1024 * 1024);
      const savedRecipe = await upsertCloudRecipe(recipe);
      sendJson(response, 201, { recipe: savedRecipe });
      return;
    }

    const recipeMatch = url.pathname.match(/^\/api\/recipes\/([^/]+)$/);
    if (recipeMatch && request.method === "PUT") {
      const recipe = await readJsonRequest(request, 1024 * 1024);
      const savedRecipe = await upsertCloudRecipe(recipe, decodeURIComponent(recipeMatch[1]));
      sendJson(response, 200, { recipe: savedRecipe });
      return;
    }

    if (recipeMatch && request.method === "DELETE") {
      await deleteCloudRecipe(decodeURIComponent(recipeMatch[1]));
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/extract-grocery-photo") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed", message: "Use POST multipart/form-data with photo=<image>." });
        return;
      }

      const body = await readRequestBody(request, 8 * 1024 * 1024);
      const photo = parseMultipartFile(request.headers["content-type"], body, ["photo"]);

      if (!photo) {
        sendJson(response, 400, { error: "photo is required" });
        return;
      }

      const imageUrl = `data:${photo.mimeType};base64,${photo.data.toString("base64")}`;
      const result = await createOpenAIResponse({
        schemaName: "grocery_extraction",
        schema: groceryExtractionSchema,
        content: [
          {
            type: "input_text",
            text: [
              "Extract grocery inventory items from this image.",
              "Return item name, quantity, unit, category, storage location, confidence, and source text when visible.",
              "If quantity is unclear, estimate conservatively and lower confidence."
            ].join(" ")
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "auto"
          }
        ]
      });

      sendJson(response, 200, parseStructuredOutput(result));
      return;
    }

    if (url.pathname === "/api/parse-recipe") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed", message: "Use POST application/json." });
        return;
      }

      const body = await readRequestBody(request, 1024 * 1024);
      const parsed = JSON.parse(body.toString("utf8"));
      const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
      const sourceUrl = typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : "";

      if (!text) {
        sendJson(response, 400, { error: "invalid_request", details: "text is required" });
        return;
      }

      const result = await createOpenAIResponse({
        schemaName: "recipe_extraction",
        schema: recipeExtractionSchema,
        content: [
          {
            type: "input_text",
            text: [
              "Parse this recipe into structured data for a cooking inventory app.",
              "Normalize ingredient names and units where possible.",
              sourceUrl ? `Source URL: ${sourceUrl}` : "",
              `Recipe text:\n${text}`
            ].join("\n")
          }
        ]
      });

      sendJson(response, 200, parseStructuredOutput(result));
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_error", message: error.message });
  }
});

server.listen(port, () => {
  console.log(`TableUp backend listening on http://127.0.0.1:${port}`);
});

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

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJsonRequest(request, maxBytes) {
  const body = await readRequestBody(request, maxBytes);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function parseMultipartFile(contentType, body, fieldNames) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "")?.slice(1).find(Boolean);
  if (!boundary) {
    return null;
  }

  const fieldPattern = new RegExp(`name="(?:${fieldNames.map(escapeRegExp).join("|")})"`);

  const marker = Buffer.from(`--${boundary}`);
  let offset = 0;

  while (offset < body.length) {
    const partStart = body.indexOf(marker, offset);
    if (partStart === -1) {
      break;
    }

    let contentStart = body.indexOf(Buffer.from("\r\n\r\n"), partStart);
    if (contentStart === -1) {
      break;
    }
    contentStart += 4;

    const nextPart = body.indexOf(marker, contentStart);
    if (nextPart === -1) {
      break;
    }

    const headerText = body.slice(partStart, contentStart).toString("latin1");
    if (fieldPattern.test(headerText)) {
      const mimeType = /content-type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || "image/jpeg";
      let dataEnd = nextPart;
      if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) {
        dataEnd -= 2;
      }

      return {
        mimeType,
        data: body.slice(contentStart, dataEnd)
      };
    }

    offset = nextPart + marker.length;
  }

  return null;
}

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("heic")) {
    return "heic";
  }
  return "jpg";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createOpenAIResponse({ schemaName, schema, content }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "replace_with_a_new_key") {
    throw new Error("OPENAI_API_KEY is missing. Add it to backend/.env.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
          strict: true
        }
      }
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error?.message || `OpenAI request failed with ${response.status}`);
  }

  return json;
}

function parseStructuredOutput(result) {
  const text = result.output_text || result.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text" && typeof content.text === "string")
    ?.text;

  if (!text) {
    throw new Error("Model returned no output_text");
  }
  return JSON.parse(text);
}
