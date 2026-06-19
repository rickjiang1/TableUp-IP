const defaultMinimumCandidateScore = 0.6;

export function buildIngredientResolver(rules = {}) {
  const index = buildIngredientIndex(rules);
  return {
    resolve(name) {
      return resolveIngredientName(name, index);
    },
    rank(query, limit = 10) {
      return rankIngredientCandidates(query, index, limit);
    },
    isKnownIngredientId(ingredientId) {
      return index.byId.has(String(ingredientId || "").trim());
    }
  };
}

export function rankIngredientCandidatesFromRules({ query, rules, limit = 10 }) {
  return buildIngredientResolver(rules).rank(query, limit);
}

export function resolveIngredientName(name, indexOrRules = {}) {
  const index = indexOrRules.aliasesByNormalized ? indexOrRules : buildIngredientIndex(indexOrRules);
  const rawName = String(name || "").trim();
  const normalizedInput = normalizeIngredientName(rawName);
  if (!normalizedInput) {
    return emptyResolution(rawName);
  }

  if (index.byId.has(rawName)) {
    return knownResolution({
      rawName,
      ingredient: index.byId.get(rawName),
      matchType: "exact",
      scorePercent: 100,
      matchedAlias: "",
      normalizedInput,
      normalizedCandidate: normalizedInput,
      modifiers: []
    });
  }

  const modifierResult = extractIngredientModifiers(rawName, index.modifiers);
  const aliasMatches = findAliasMatches(modifierResult.candidateTexts, index);
  if (aliasMatches.length > 0) {
    const best = aliasMatches[0];
    const hasRemovedWeakModifier = modifierResult.removedWeakModifiers.length > 0;
    const hasModifier = modifierResult.modifiers.length > 0;
    const matchedNormalizedRaw = best.normalizedAlias === normalizedInput;
    const scorePercent = hasRemovedWeakModifier && matchedNormalizedRaw
      ? 90
      : hasModifier && !matchedNormalizedRaw
      ? 93
      : best.reason === "exact_alias"
      ? 100
      : hasRemovedWeakModifier || hasModifier
        ? 93
        : 95;
    return knownResolution({
      rawName,
      ingredient: best.ingredient,
      matchType: "alias",
      scorePercent,
      matchedAlias: best.aliasName,
      normalizedInput,
      normalizedCandidate: best.normalizedAlias,
      modifiers: modifierResult.modifiers,
      reason: hasModifier ? "alias_modifier_match" : best.reason
    });
  }

  const fuzzyMatches = rankFuzzyMatches(normalizedInput, index, 5);
  const fuzzy = fuzzyMatches[0];
  if (fuzzy && fuzzy.matchScore >= defaultMinimumCandidateScore) {
    return knownResolution({
      rawName,
      ingredient: fuzzy.ingredient,
      matchType: "fuzzy_alias",
      scorePercent: Math.round(fuzzy.matchScore * 100),
      matchedAlias: fuzzy.matchedAlias,
      normalizedInput,
      normalizedCandidate: fuzzy.normalizedAlias,
      modifiers: modifierResult.modifiers,
      reason: fuzzy.reason
    });
  }

  return {
    ...emptyResolution(rawName),
    normalizedInput,
    modifiers: modifierResult.modifiers,
    candidateTexts: modifierResult.candidateTexts
  };
}

export function buildIngredientIndex(rules = {}) {
  const byId = new Map();
  const byNormalizedName = new Map();
  const aliasesByNormalized = new Map();
  const aliasEntries = [];
  const modifiers = normalizeModifierRows(rules.modifiers || []);

  for (const ingredient of rules.ingredients || []) {
    const id = String(ingredient.ingredient_id || "").trim();
    if (!id) {
      continue;
    }
    byId.set(id, ingredient);
    addName(byNormalizedName, ingredient.canonical_name, ingredient);
    addName(byNormalizedName, ingredient.ingredient_slug, ingredient);
    addName(byNormalizedName, ingredient.ingredient_id, ingredient);
  }

  for (const alias of rules.aliases || []) {
    const ingredient = byId.get(String(alias.ingredient_id || "").trim());
    const normalizedAlias = normalizeIngredientName(alias.alias_name);
    if (!ingredient || !normalizedAlias) {
      continue;
    }
    const entry = {
      aliasName: String(alias.alias_name || "").trim(),
      normalizedAlias,
      ingredient,
      language: String(alias.language || "").trim().toLowerCase(),
      verified: Boolean(alias.verified ?? true),
      confidenceScore: Number(alias.confidence_score || 1)
    };
    aliasEntries.push(entry);
    if (!aliasesByNormalized.has(normalizedAlias) || entry.confidenceScore > aliasesByNormalized.get(normalizedAlias).confidenceScore) {
      aliasesByNormalized.set(normalizedAlias, entry);
    }
    addName(byNormalizedName, alias.ingredient_slug, ingredient);
  }

  for (const ingredient of byId.values()) {
    const slug = String(ingredient.ingredient_slug || "").replaceAll("_", " ");
    const canonical = String(ingredient.canonical_name || "");
    for (const name of [slug, canonical]) {
      const normalized = normalizeIngredientName(name);
      if (normalized && !aliasesByNormalized.has(normalized)) {
        aliasesByNormalized.set(normalized, {
          aliasName: name,
          normalizedAlias: normalized,
          ingredient,
          language: "",
          verified: true,
          confidenceScore: 1
        });
      }
    }
  }

  aliasEntries.push(...[...aliasesByNormalized.values()].filter((entry) => !aliasEntries.includes(entry)));
  aliasEntries.sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length || right.confidenceScore - left.confidenceScore);

  return {
    byId,
    byNormalizedName,
    aliasesByNormalized,
    aliasEntries,
    modifiers
  };
}

function addName(map, value, ingredient) {
  const normalized = normalizeIngredientName(value);
  if (normalized && !map.has(normalized)) {
    map.set(normalized, ingredient);
  }
}

function findAliasMatches(candidateTexts, index) {
  const matches = [];
  for (let candidateIndex = 0; candidateIndex < candidateTexts.length; candidateIndex += 1) {
    const text = candidateTexts[candidateIndex];
    const normalized = normalizeIngredientName(text);
    if (!normalized) {
      continue;
    }
    if (index.byNormalizedName.has(normalized)) {
      const ingredient = index.byNormalizedName.get(normalized);
      matches.push({
        ingredient,
        aliasName: text,
        normalizedAlias: normalized,
        reason: "exact",
        candidateIndex
      });
    }
    if (index.aliasesByNormalized.has(normalized)) {
      const entry = index.aliasesByNormalized.get(normalized);
      matches.push({
        ...entry,
        reason: "exact_alias",
        candidateIndex
      });
    }
    for (const entry of index.aliasEntries) {
      if (entry.normalizedAlias === normalized) {
        continue;
      }
      if (normalized.includes(entry.normalizedAlias)) {
        matches.push({
          ...entry,
          reason: "longest_alias_contains",
          candidateIndex
        });
        break;
      }
    }
  }

  return matches
    .sort((left, right) => {
      const leftLength = String(left.normalizedAlias || "").length;
      const rightLength = String(right.normalizedAlias || "").length;
      return left.candidateIndex - right.candidateIndex || rightLength - leftLength || confidence(right) - confidence(left);
    })
    .filter((match, index, all) => index === all.findIndex((item) => item.ingredient.ingredient_id === match.ingredient.ingredient_id));
}

function rankIngredientCandidates(query, index, limit) {
  const exact = resolveIngredientName(query, index);
  const candidates = [];
  if (exact.known) {
    candidates.push(candidateFromResolution(exact));
  }
  candidates.push(...rankFuzzyMatches(normalizeIngredientName(query), index, limit * 2));

  const bestByIngredientId = new Map();
  for (const candidate of candidates) {
    if (!candidate || candidate.matchScore < 0.42) {
      continue;
    }
    const id = candidate.ingredientId;
    const previous = bestByIngredientId.get(id);
    if (!previous || candidate.matchScore > previous.matchScore) {
      bestByIngredientId.set(id, candidate);
    }
  }

  return [...bestByIngredientId.values()]
    .sort((left, right) => right.matchScore - left.matchScore || left.ingredientId.localeCompare(right.ingredientId))
    .slice(0, limit);
}

function rankFuzzyMatches(normalizedQuery, index, limit) {
  if (!normalizedQuery) {
    return [];
  }
  return index.aliasEntries
    .map((entry) => {
      const scored = scoreIngredientCandidate(entry.normalizedAlias, normalizedQuery);
      if (!scored) {
        return null;
      }
      return {
        ingredientId: entry.ingredient.ingredient_id,
        canonicalName: entry.ingredient.canonical_name || entry.ingredient.ingredient_slug || entry.ingredient.ingredient_id,
        ingredient: entry.ingredient,
        matchedAlias: entry.aliasName,
        normalizedAlias: entry.normalizedAlias,
        matchType: scored.reason === "exact" ? "alias" : "fuzzy_alias",
        matchScore: scored.score,
        reason: scored.reason
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.matchScore - left.matchScore || right.normalizedAlias.length - left.normalizedAlias.length)
    .slice(0, limit);
}

function scoreIngredientCandidate(normalizedTerm, normalizedQuery) {
  if (!normalizedTerm || !normalizedQuery) {
    return null;
  }
  if (normalizedTerm === normalizedQuery) {
    return { score: 1, reason: "exact" };
  }
  if (normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm)) {
    const shorter = Math.min(normalizedTerm.length, normalizedQuery.length);
    const longer = Math.max(normalizedTerm.length, normalizedQuery.length);
    return { score: 0.78 + 0.14 * (shorter / longer), reason: "contains" };
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

export function extractIngredientModifiers(rawName, modifierRows = []) {
  const normalizedInput = normalizeIngredientName(rawName);
  const normalizedModifiers = normalizeModifierRows(modifierRows);
  const modifiers = [];
  let weakStripped = normalizedInput;

  for (const modifier of normalizedModifiers) {
    if (!modifier.normalizedText || !containsModifier(normalizedInput, modifier)) {
      continue;
    }
    if (modifiers.some((existing) => existing.normalizedText.includes(modifier.normalizedText))) {
      continue;
    }
    modifiers.push({
      text: modifier.modifierText,
      normalizedText: modifier.normalizedText,
      type: modifier.modifierType,
      value: modifier.normalizedValue,
      strength: modifier.strength,
      language: modifier.language
    });
    if (modifier.strength === "weak") {
      weakStripped = removeTokenLikeText(weakStripped, modifier.normalizedText);
    }
  }

  const candidateTexts = buildCandidateTexts(normalizedInput, weakStripped, modifiers);
  return {
    normalizedInput,
    modifiers,
    removedWeakModifiers: modifiers.filter((modifier) => modifier.strength === "weak"),
    candidateTexts
  };
}

function buildCandidateTexts(normalizedInput, weakStripped, modifiers) {
  const candidates = new Set();
  const strongModifiers = modifiers.filter((modifier) => modifier.strength === "strong");
  const weakModifiers = modifiers.filter((modifier) => modifier.strength === "weak");

  if (weakModifiers.length > 0 && weakStripped && weakStripped !== normalizedInput) {
    candidates.add(weakStripped);
    candidates.add(...chineseSuffixCandidates(weakStripped));
  }
  candidates.add(normalizedInput);
  candidates.add(weakStripped);

  for (const weak of weakModifiers) {
    candidates.add(removeTokenLikeText(normalizedInput, weak.normalizedText));
  }

  for (const strong of strongModifiers) {
    const withoutStrong = removeTokenLikeText(weakStripped, strong.normalizedText);
    if (withoutStrong && withoutStrong !== weakStripped) {
      candidates.add(withoutStrong);
    }
  }

  candidates.add(...chineseSuffixCandidates(weakStripped));
  return [...candidates].map(normalizeIngredientName).filter(Boolean);
}

function chineseSuffixCandidates(value) {
  const compact = normalizeIngredientName(value).replace(/\s+/g, "");
  const output = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    output.push(compact.slice(index));
  }
  return output;
}

function removeTokenLikeText(value, text) {
  const normalized = normalizeIngredientName(value);
  if (isLatinText(text)) {
    return normalizeIngredientName(normalized.replace(new RegExp(`(^|\\s)${escapeRegExp(text)}(?=\\s|$)`, "g"), " "));
  }
  return normalizeIngredientName(normalized.replaceAll(text, " "));
}

function containsModifier(value, modifier) {
  const text = modifier.normalizedText;
  if (!text) {
    return false;
  }
  if (modifier.strength === "weak" && !isLatinText(text) && text.length < 2) {
    return false;
  }
  if (isLatinText(text)) {
    return new RegExp(`(^|\\s)${escapeRegExp(text)}(?=\\s|$)`).test(value);
  }
  return value.includes(text);
}

function isLatinText(value) {
  return /^[a-z0-9\s.-]+$/i.test(String(value || ""));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeModifierRows(rows) {
  return rows
    .map((row) => ({
      modifierText: String(row.modifier_text || row.modifierText || "").trim(),
      normalizedText: normalizeIngredientName(row.normalized_text || row.normalizedText || row.modifier_text || row.modifierText),
      modifierType: String(row.modifier_type || row.modifierType || "other").trim().toLowerCase(),
      normalizedValue: String(row.normalized_value || row.normalizedValue || "").trim().toLowerCase(),
      language: String(row.language || "mixed").trim().toLowerCase(),
      strength: String(row.strength || "weak").trim().toLowerCase() === "strong" ? "strong" : "weak"
    }))
    .filter((row) => row.modifierText && row.normalizedText)
    .sort((left, right) => right.normalizedText.length - left.normalizedText.length);
}

function candidateFromResolution(resolution) {
  return {
    ingredientId: resolution.ingredientId,
    canonicalName: resolution.canonicalName,
    matchedAlias: resolution.matchedAlias,
    matchType: resolution.matchType,
    matchScore: resolution.matchScore,
    reason: resolution.reason || resolution.matchType,
    modifiers: resolution.modifiers || []
  };
}

function knownResolution({ rawName, ingredient, matchType, scorePercent, matchedAlias, normalizedInput, normalizedCandidate, modifiers, reason }) {
  const ingredientId = ingredient.ingredient_id || "";
  return {
    rawName,
    ingredientId,
    canonicalName: ingredient.canonical_name || ingredient.ingredient_slug || ingredientId,
    ingredientSlug: ingredient.ingredient_slug || "",
    known: true,
    aliasMatched: matchType === "alias" || matchType === "fuzzy_alias",
    matchType,
    matchScore: Math.max(0, Math.min(scorePercent, 100)) / 100,
    matchScorePercent: Math.max(0, Math.min(scorePercent, 100)),
    matchedAlias,
    normalizedInput,
    normalizedCandidate,
    modifiers: modifiers || [],
    reason: reason || matchType
  };
}

function emptyResolution(rawName) {
  return {
    rawName,
    ingredientId: "",
    canonicalName: "",
    ingredientSlug: "",
    known: false,
    aliasMatched: false,
    matchType: "",
    matchScore: 0,
    matchScorePercent: 0,
    matchedAlias: "",
    normalizedInput: normalizeIngredientName(rawName),
    normalizedCandidate: "",
    modifiers: [],
    reason: "missing"
  };
}

function confidence(entry) {
  return Number(entry.confidenceScore || 1);
}

export function normalizeIngredientName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[（）]/g, (character) => character === "（" ? "(" : ")")
    .replace(/_/g, " ")
    .replace(/[，,、/]+/g, " ")
    .replace(/\s+/g, " ");
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
