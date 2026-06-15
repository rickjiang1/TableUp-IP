import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import {
  deleteCloudRecipe,
  fetchCloudRecipes,
  fetchIngredientDictionary,
  fetchMatchingRules,
  fetchPendingUnknownIngredients,
  markUnknownIngredientResolved,
  readVolumeFile,
  uploadVolumeFile,
  upsertCloudRecipe,
  upsertIngredientAliasSuggestion,
  upsertUnknownIngredients
} from "./supabase.js";
import { matchRecipesForInventory } from "./recipeMatching.js";
import { groceryExtractionSchema, recipeExtractionSchema } from "./schemas.js";

loadEnv();

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const appEnv = process.env.APP_ENV || "dev";
const matchingRulesCacheTtlMs = Number(process.env.MATCHING_RULES_CACHE_TTL_MS || 60_000);
const ingredientDictionaryCacheTtlMs = Number(process.env.INGREDIENT_DICTIONARY_CACHE_TTL_MS || 60_000);
const openAIExtractionMaxOutputTokens = Number(process.env.OPENAI_EXTRACTION_MAX_OUTPUT_TOKENS || 2500);
let matchingRulesCache = { expiresAt: 0, value: null, promise: null };
const ingredientDictionaryCache = new Map();

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
      sendJson(response, 200, { ok: true, env: appEnv });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/recipes") {
      const recipes = await fetchCloudRecipes();
      sendJson(response, 200, { recipes });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/ingredients") {
      const ingredients = await getCachedIngredientDictionary(url.searchParams.get("language") || "en");
      sendJson(response, 200, { ingredients });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/ingredient-candidates") {
      const candidates = await findIngredientCandidates({
        query: url.searchParams.get("q") || "",
        language: url.searchParams.get("language") || "en",
        limit: Number(url.searchParams.get("limit") || 10)
      });
      sendJson(response, 200, { candidates });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/resolve-ingredients") {
      const body = await readJsonRequest(request, 1024 * 1024);
      const resolved = await resolveIngredientItems(body.items);
      sendJson(response, 200, { items: resolved });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/recipe-matches") {
      const body = await readJsonRequest(request, 1024 * 1024);
      const matches = await matchRecipesForInventory(body.inventory);
      sendJson(response, 200, { matches });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/unknown-ingredients") {
      const limit = Number(url.searchParams.get("limit") || 25);
      const source = url.searchParams.get("source") || "";
      const unknownIngredients = await fetchPendingUnknownIngredients(limit, source);
      sendJson(response, 200, { unknownIngredients });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ingredient-aliases") {
      const body = await readJsonRequest(request, 1024 * 1024);
      await upsertIngredientAliasSuggestion(body);
      sendJson(response, 201, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/unknown-ingredients/resolve") {
      const body = await readJsonRequest(request, 1024 * 1024);
      await markUnknownIngredientResolved(body);
      sendJson(response, 200, { ok: true });
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

      const startedAt = Date.now();
      const body = await readRequestBody(request, 12 * 1024 * 1024);
      const photos = parseMultipartFiles(request.headers["content-type"], body, ["photo", "photos", "images"]);
      const language = parseMultipartField(request.headers["content-type"], body, "language") || "en";

      if (photos.length === 0) {
        sendJson(response, 400, { error: "photo is required" });
        return;
      }

      const imageContent = photos.map((photo) => ({
        type: "input_image",
        image_url: `data:${photo.mimeType};base64,${photo.data.toString("base64")}`,
        detail: process.env.OPENAI_VISION_DETAIL || "low"
      }));
      const result = await createOpenAIResponse({
        schemaName: "grocery_extraction",
        schema: groceryExtractionSchema,
        maxOutputTokens: openAIExtractionMaxOutputTokens,
        content: [
          {
            type: "input_text",
            text: [
              "Extract grocery inventory items from the image(s).",
              "Use name for the core food only, not brand, origin, grade, packaging, or preparation adjectives.",
              "Put the full visible product name and modifiers in rawName and description.",
              "Example: 美国和牛 无骨牛肋条 => name: 牛肋条, rawName: 美国和牛 无骨牛肋条, description: 美国和牛; 无骨.",
              "Return item name, rawName, description, quantity, unit, category, storage location, confidence, and source text when visible.",
              "Always infer quantity and unit from visible package text when possible.",
              "Use only these unit values: piece, g, kg, lb, oz, ml, l, tsp, tbsp, cup, clove, bunch, bottle, can, bag, pack.",
              "Convert Chinese units to supported units: 克=>g, 千克/公斤=>kg, 毫升=>ml, 升=>l, 磅=>lb, 盎司=>oz, 瓶=>bottle, 罐=>can, 袋=>bag, 包=>pack, 斤=>500 g.",
              "If the image shows package count but no weight or volume, use quantity 1 and unit pack/bag/bottle/can as appropriate.",
              "If quantity is unclear, estimate conservatively and lower confidence."
            ].join(" ")
          },
          ...imageContent
        ]
      });

      const openAICompletedAt = Date.now();
      const normalized = await normalizeGroceryExtraction(parseStructuredOutput(result), language);
      console.log(JSON.stringify({
        event: "grocery_photo_extraction_timing",
        photoCount: photos.length,
        bodyBytes: body.length,
        openAIMs: openAICompletedAt - startedAt,
        normalizeMs: Date.now() - openAICompletedAt,
        totalMs: Date.now() - startedAt
      }));
      sendJson(response, 200, normalized);
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

async function getCachedMatchingRules() {
  const now = Date.now();
  if (matchingRulesCache.value && matchingRulesCache.expiresAt > now) {
    return matchingRulesCache.value;
  }
  if (matchingRulesCache.promise) {
    return matchingRulesCache.promise;
  }

  matchingRulesCache.promise = fetchMatchingRules()
    .then((rules) => {
      matchingRulesCache = {
        value: rules,
        expiresAt: Date.now() + matchingRulesCacheTtlMs,
        promise: null
      };
      return rules;
    })
    .catch((error) => {
      matchingRulesCache.promise = null;
      throw error;
    });

  return matchingRulesCache.promise;
}

async function getCachedIngredientDictionary(language = "en") {
  const normalizedLanguage = String(language || "en").trim().toLowerCase() || "en";
  const now = Date.now();
  const cached = ingredientDictionaryCache.get(normalizedLanguage);
  if (cached?.value && cached.expiresAt > now) {
    return cached.value;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetchIngredientDictionary(normalizedLanguage)
    .then((dictionary) => {
      ingredientDictionaryCache.set(normalizedLanguage, {
        value: dictionary,
        expiresAt: Date.now() + ingredientDictionaryCacheTtlMs,
        promise: null
      });
      return dictionary;
    })
    .catch((error) => {
      ingredientDictionaryCache.delete(normalizedLanguage);
      throw error;
    });

  ingredientDictionaryCache.set(normalizedLanguage, {
    value: cached?.value || null,
    expiresAt: cached?.expiresAt || 0,
    promise
  });

  return promise;
}

async function normalizeGroceryExtraction(output, language = "en") {
  return {
    items: (output.items || []).map((item) => {
      const name = String(item.name || "").trim();
      const rawName = String(item.rawName || item.sourceText || name).trim();
      const sourceText = String(item.sourceText || "").trim();
      const normalizedAmount = normalizeExtractedAmount(item.quantity, item.unit);
      return {
        ...item,
        name,
        rawName,
        sourceText,
        description: String(item.description || "").trim(),
        quantity: normalizedAmount.quantity,
        unit: normalizedAmount.unit,
        canonicalIngredientId: "",
        canonicalIngredientDisplayName: "",
        matchedToIngredientLibrary: false,
        ingredientMatchType: "",
        ingredientMatchScore: 0,
        matchedAlias: "",
        suggestedCanonicalIngredientId: "",
        suggestedCanonicalName: "",
        suggestedCanonicalDisplayName: "",
        suggestedMatchType: "",
        suggestedMatchScore: 0,
        suggestedMatchedAlias: ""
      };
    })
  };
}

function displayNameForIngredient(dictionaryById, ingredientId, fallbackName) {
  return dictionaryById.get(ingredientId)?.display_name || fallbackName || ingredientId;
}

function resolveExtractedIngredient({ names, rules, resolver }) {
  for (const name of names) {
    const resolved = resolver.resolve(name);
    if (resolved.known) {
      return {
        ingredientId: resolved.ingredientId,
        canonicalName: canonicalNameForIngredient(rules, resolved.ingredientId),
        matchType: resolved.aliasMatched ? "alias" : "exact",
        matchScore: 1,
        matchedAlias: resolved.aliasMatched ? String(name || "").trim() : "",
        autoMatched: true
      };
    }
  }

  return {
    ingredientId: "",
    canonicalName: "",
    matchType: "",
    matchScore: 0,
    matchedAlias: "",
    autoMatched: false
  };
}

function bestIngredientCandidateFromRules({ queries, rules }) {
  let best = null;
  for (const query of queries) {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      continue;
    }
    for (const candidate of rankIngredientCandidatesFromRules({ query: trimmedQuery, rules, limit: 1 })) {
      if (!best || candidate.matchScore > best.matchScore) {
        best = candidate;
      }
    }
  }
  return best && best.matchScore >= 0.6 ? best : null;
}

function canonicalNameForIngredient(rules, ingredientId) {
  return (rules.ingredients || []).find((ingredient) => ingredient.ingredient_id === ingredientId)?.canonical_name || ingredientId;
}

function normalizeExtractedAmount(quantity, unit) {
  const numericQuantity = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : 1;
  const cleanUnit = String(unit || "piece").trim().toLowerCase();
  const compact = cleanUnit.replace(/\s+/g, "");
  const aliases = new Map([
    ["pieces", "piece"],
    ["piece", "piece"],
    ["pcs", "piece"],
    ["pc", "piece"],
    ["个", "piece"],
    ["根", "piece"],
    ["颗", "piece"],
    ["只", "piece"],
    ["条", "piece"],
    ["片", "piece"],
    ["g", "g"],
    ["gram", "g"],
    ["grams", "g"],
    ["克", "g"],
    ["kg", "kg"],
    ["kilogram", "kg"],
    ["kilograms", "kg"],
    ["千克", "kg"],
    ["公斤", "kg"],
    ["lb", "lb"],
    ["lbs", "lb"],
    ["pound", "lb"],
    ["pounds", "lb"],
    ["磅", "lb"],
    ["oz", "oz"],
    ["ounce", "oz"],
    ["ounces", "oz"],
    ["盎司", "oz"],
    ["ml", "ml"],
    ["milliliter", "ml"],
    ["milliliters", "ml"],
    ["毫升", "ml"],
    ["l", "l"],
    ["liter", "l"],
    ["liters", "l"],
    ["升", "l"],
    ["tsp", "tsp"],
    ["teaspoon", "tsp"],
    ["teaspoons", "tsp"],
    ["茶匙", "tsp"],
    ["tbsp", "tbsp"],
    ["tablespoon", "tbsp"],
    ["tablespoons", "tbsp"],
    ["汤匙", "tbsp"],
    ["cup", "cup"],
    ["cups", "cup"],
    ["杯", "cup"],
    ["clove", "clove"],
    ["cloves", "clove"],
    ["瓣", "clove"],
    ["bunch", "bunch"],
    ["bunches", "bunch"],
    ["把", "bunch"],
    ["bottle", "bottle"],
    ["bottles", "bottle"],
    ["瓶", "bottle"],
    ["can", "can"],
    ["cans", "can"],
    ["罐", "can"],
    ["bag", "bag"],
    ["bags", "bag"],
    ["袋", "bag"],
    ["pack", "pack"],
    ["packs", "pack"],
    ["package", "pack"],
    ["packages", "pack"],
    ["包", "pack"],
    ["盒", "pack"],
    ["盒装", "pack"],
    ["tray", "pack"],
    ["trays", "pack"]
  ]);

  if (compact === "斤") {
    return { quantity: numericQuantity * 500, unit: "g" };
  }

  return { quantity: numericQuantity, unit: aliases.get(compact) || aliases.get(cleanUnit) || "piece" };
}

async function resolveIngredientItems(inputItems) {
  const rules = await getCachedMatchingRules();
  const resolver = buildIngredientResolver(rules);
  const items = Array.isArray(inputItems) ? inputItems : [];

  const resolvedItems = items
    .map((item) => {
      const name = String(item?.name || "").trim();
      const source = String(item?.source || "inventory").trim() || "inventory";
      const resolved = resolver.resolve(name);
      return {
        name,
        source,
        ingredientId: resolved.ingredientId,
        known: resolved.known,
        aliasMatched: Boolean(resolved.aliasMatched)
      };
    })
    .filter((item) => item.name);

  await upsertUnknownIngredients(
    resolvedItems
      .filter((item) => !item.known)
      .map((item) => ({ rawName: item.name, source: item.source }))
  );

  return resolvedItems;
}

async function findIngredientCandidates({ query, language = "en", limit = 10 }) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    return [];
  }

  const resultLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const [rules, dictionary] = await Promise.all([
    getCachedMatchingRules(),
    getCachedIngredientDictionary(language)
  ]);
  const dictionaryById = new Map(dictionary.map((ingredient) => [ingredient.ingredient_id, ingredient]));
  const ingredientsById = new Map((rules.ingredients || []).map((ingredient) => [ingredient.ingredient_id, ingredient]));
  return rankIngredientCandidatesFromRules({ query: trimmedQuery, rules, limit: resultLimit })
    .map((candidate) => {
      const localized = dictionaryById.get(candidate.ingredientId);
      const ingredient = ingredientsById.get(candidate.ingredientId);
      const canonicalName = ingredient?.canonical_name || localized?.canonical_name || candidate.ingredientId;
      return {
        ingredient_id: candidate.ingredientId,
        canonical_name: canonicalName,
        display_name: localized?.display_name || canonicalName,
        category: localized?.category || ingredient?.category || "other",
        canonical_unit: localized?.canonical_unit || ingredient?.canonical_unit || "",
        matched_alias: candidate.matchedAlias,
        score: Number(candidate.matchScore.toFixed(3)),
        reason: candidate.reason
      };
    })
}

function rankIngredientCandidatesFromRules({ query, rules, limit = 10 }) {
  const queryCandidates = ingredientNameCandidates(query);
  const normalizedQuery = queryCandidates[0] || normalizeIngredientName(query);
  const bestByIngredientId = new Map();

  function consider(entry) {
    const scored = scoreIngredientCandidate(entry, queryCandidates, normalizedQuery);
    if (!scored || scored.score < 0.42) {
      return;
    }
    const previous = bestByIngredientId.get(entry.ingredientId);
    if (!previous || scored.score > previous.matchScore) {
      bestByIngredientId.set(entry.ingredientId, {
        ingredientId: entry.ingredientId,
        canonicalName: canonicalNameForIngredient(rules, entry.ingredientId),
        matchedAlias: entry.kind === "alias" ? entry.term : "",
        matchType: matchTypeForCandidate(entry.kind, scored.reason),
        matchScore: scored.score,
        reason: scored.reason
      });
    }
  }

  for (const ingredient of rules.ingredients || []) {
    consider({ ingredientId: ingredient.ingredient_id, term: ingredient.ingredient_id, kind: "id" });
    consider({ ingredientId: ingredient.ingredient_id, term: ingredient.canonical_name, kind: "canonical" });
  }

  for (const alias of rules.aliases || []) {
    consider({ ingredientId: alias.ingredient_id, term: alias.alias_name, kind: "alias" });
  }

  return [...bestByIngredientId.values()]
    .sort((a, b) => b.matchScore - a.matchScore || a.ingredientId.localeCompare(b.ingredientId))
    .slice(0, limit);
}

function matchTypeForCandidate(kind, reason) {
  if (kind === "alias") {
    return reason === "alias_exact" ? "alias" : "fuzzy_alias";
  }
  if (reason === "exact") {
    return "exact";
  }
  return "fuzzy";
}

function scoreIngredientCandidate(entry, queryCandidates, normalizedQuery) {
  const normalizedTerm = normalizeIngredientName(entry.term);
  if (!normalizedTerm) {
    return null;
  }

  if (normalizedTerm === normalizedQuery) {
    return { score: entry.kind === "alias" ? 0.99 : 1, reason: entry.kind === "alias" ? "alias_exact" : "exact" };
  }

  if (queryCandidates.includes(normalizedTerm)) {
    return { score: entry.kind === "alias" ? 0.97 : 0.96, reason: "normalized_exact" };
  }

  if (normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm)) {
    const shorter = Math.min(normalizedTerm.length, normalizedQuery.length);
    const longer = Math.max(normalizedTerm.length, normalizedQuery.length);
    return { score: 0.78 + 0.14 * (shorter / longer), reason: entry.kind === "alias" ? "alias_contains" : "contains" };
  }

  const tokenScore = tokenOverlapScore(normalizedTerm, normalizedQuery);
  if (tokenScore >= 0.5) {
    return { score: 0.54 + 0.22 * tokenScore, reason: "token_overlap" };
  }

  const similarity = stringSimilarity(normalizedTerm, normalizedQuery);
  if (similarity >= 0.68) {
    return { score: 0.42 + 0.25 * similarity, reason: "spelling_close" };
  }

  return null;
}

function tokenOverlapScore(a, b) {
  const aTokens = new Set(a.split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function stringSimilarity(a, b) {
  if (!a || !b) {
    return 0;
  }
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function levenshteinDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function buildIngredientResolver(rules) {
  const byId = new Map();
  const byName = new Map();
  const aliases = new Map();

  for (const ingredient of rules.ingredients || []) {
    byId.set(ingredient.ingredient_id, ingredient);
    byName.set(normalizeIngredientName(ingredient.canonical_name), ingredient.ingredient_id);
    byName.set(normalizeIngredientName(ingredient.ingredient_id), ingredient.ingredient_id);
  }

  for (const alias of rules.aliases || []) {
    aliases.set(normalizeIngredientName(alias.alias_name), alias.ingredient_id);
  }

  return {
    resolve(name) {
      const value = String(name || "").trim();
      const candidates = ingredientNameCandidates(value);
      if (candidates.length === 0) {
        return { ingredientId: "", aliasMatched: false, known: false };
      }
      if (byId.has(value)) {
        return { ingredientId: value, aliasMatched: false, known: true };
      }
      for (const candidate of candidates) {
        if (byName.has(candidate)) {
          return { ingredientId: byName.get(candidate), aliasMatched: candidate !== candidates[0], known: true };
        }
        if (aliases.has(candidate)) {
          return { ingredientId: aliases.get(candidate), aliasMatched: true, known: true };
        }
      }
      return { ingredientId: "", aliasMatched: false, known: false };
    }
  };
}

function ingredientNameCandidates(value) {
  const normalized = normalizeIngredientName(value);
  if (!normalized) {
    return [];
  }

  const candidates = new Set([normalized]);
  const withoutParentheses = normalized.replace(/\([^)]*\)/g, " ");
  candidates.add(normalizeIngredientName(withoutParentheses));

  const englishDescriptorPattern = /\b(american|usa?|usda|choice|prime|select|wagyu|angus|black angus|organic|grass fed|frozen|fresh|raw|cooked|boneless|bone in|bone-in|skinless|skin on|skin-on|thin sliced|thin-sliced|sliced|diced|cubed|whole|trimmed|tray|pack|package)\b/g;
  candidates.add(normalizeIngredientName(withoutParentheses.replace(englishDescriptorPattern, " ")));

  const chineseDescriptors = [
    "美国和牛",
    "黑安格斯",
    "美国",
    "澳洲",
    "日本",
    "加拿大",
    "和牛",
    "有机",
    "冷冻",
    "冰鲜",
    "新鲜",
    "无骨",
    "去骨",
    "带骨",
    "去皮",
    "带皮",
    "切片",
    "薄切",
    "片",
    "块",
    "丁",
    "火锅",
    "烧烤",
    "袋装",
    "盒装"
  ];
  let strippedChinese = normalized;
  for (const descriptor of chineseDescriptors) {
    strippedChinese = strippedChinese.replaceAll(descriptor, " ");
  }
  candidates.add(normalizeIngredientName(strippedChinese));

  return [...candidates].filter(Boolean);
}

function normalizeIngredientName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
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
  return parseMultipartFiles(contentType, body, fieldNames)[0] || null;
}

function parseMultipartFiles(contentType, body, fieldNames) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "")?.slice(1).find(Boolean);
  if (!boundary) {
    return [];
  }

  const fieldPattern = new RegExp(`name="(?:${fieldNames.map(escapeRegExp).join("|")})"`);

  const marker = Buffer.from(`--${boundary}`);
  let offset = 0;
  const files = [];

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

      files.push({
        mimeType,
        data: body.slice(contentStart, dataEnd)
      });
    }

    offset = nextPart;
  }

  return files;
}

function parseMultipartField(contentType, body, fieldName) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "")?.slice(1).find(Boolean);
  if (!boundary) {
    return "";
  }

  const fieldPattern = new RegExp(`name="${escapeRegExp(fieldName)}"`);
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
      let dataEnd = nextPart;
      if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) {
        dataEnd -= 2;
      }
      return body.slice(contentStart, dataEnd).toString("utf8").trim();
    }

    offset = nextPart;
  }

  return "";
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

async function createOpenAIResponse({ schemaName, schema, content, maxOutputTokens }) {
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
      ...(Number.isFinite(maxOutputTokens) && maxOutputTokens > 0 ? { max_output_tokens: maxOutputTokens } : {}),
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
