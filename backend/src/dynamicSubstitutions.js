const categoryWeight = 0.45;
const tagWeight = 0.40;
const contextWeight = 0.15;
const automaticSubstitutionCapsBySubcategory = new Map([
  ["allium", 0.69],
  ["rhizome_aromatic", 0.69]
]);

export function getSubstituteCandidates({
  ingredientId,
  context = "general",
  rules,
  limit = 10,
  minimumScore = 0.55,
  candidateIngredientIds = null
}) {
  const sourceId = String(ingredientId || "").trim();
  if (!sourceId || !rules) {
    return [];
  }

  const normalizedContext = normalizeContext(context);
  const ingredientsById = new Map((rules.ingredients || []).map((ingredient) => [ingredient.ingredient_id, ingredient]));
  const source = ingredientsById.get(sourceId);
  if (!source) {
    return [];
  }

  const allowedCandidateIds = normalizeCandidateIngredientIds(candidateIngredientIds);
  const verified = verifiedSubstituteCandidates({ source, context: normalizedContext, rules, ingredientsById, allowedCandidateIds });
  const verifiedTargetIds = new Set(verified.map((candidate) => candidate.substituteIngredientId).filter(Boolean));
  const dynamic = dynamicSubstituteCandidates({ source, context: normalizedContext, rules, ingredientsById, allowedCandidateIds })
    .filter((candidate) => !verifiedTargetIds.has(candidate.substituteIngredientId));

  return [...verified, ...dynamic]
    .filter((candidate) => candidate.score >= minimumScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.substituteName.localeCompare(right.substituteName);
    })
    .slice(0, Math.max(1, Number(limit) || 10));
}

export function scoreDynamicSubstitute({ source, candidate, context = "general", rules }) {
  if (!source || !candidate) {
    return null;
  }

  const normalizedContext = normalizeContext(context);
  const categoryScore = scoreCategorySimilarity(source, candidate, rules.categories || []);
  if (categoryScore <= 0) {
    return null;
  }

  const tagSimilarityScore = scoreTagSimilarity(source.ingredient_id, candidate.ingredient_id, rules.functionalProfiles || []);
  const contextScore = scoreContext(source, candidate, normalizedContext, rules.substitutionRules || []);
  const rawScore = categoryScore * categoryWeight + tagSimilarityScore * tagWeight + contextScore * contextWeight;
  const score = capRiskyDynamicSubstitutionScore(rawScore, source, candidate, rules.categories || []);

  return {
    score: roundScore(score),
    categoryScore: roundScore(categoryScore),
    tagSimilarityScore: roundScore(tagSimilarityScore),
    contextScore: roundScore(contextScore),
    source: "dynamic_rule",
    context: normalizedContext
  };
}

function capRiskyDynamicSubstitutionScore(score, source, candidate, categories) {
  const sourceSubcategory = categorySlug(source.subcategory_id, categories);
  const candidateSubcategory = categorySlug(candidate.subcategory_id, categories);
  if (!sourceSubcategory || sourceSubcategory !== candidateSubcategory) {
    return clampScore(score);
  }

  const cap = automaticSubstitutionCapsBySubcategory.get(sourceSubcategory);
  return clampScore(cap === undefined ? score : Math.min(score, cap));
}

function verifiedSubstituteCandidates({ source, context, rules, ingredientsById, allowedCandidateIds }) {
  return (rules.verifiedSubstitutions || [])
    .filter((row) => String(row.ingredient_id || "") === source.ingredient_id)
    .filter((row) => contextMatches(row.context, context))
    .filter((row) => !allowedCandidateIds || allowedCandidateIds.has(String(row.substitute_ingredient_id || "")))
    .map((row) => {
      const substitute = ingredientsById.get(row.substitute_ingredient_id);
      const comboSlug = String(row.substitute_combo_slug || "").trim();
      return {
        ingredientId: source.ingredient_id,
        substituteIngredientId: substitute?.ingredient_id || "",
        substituteComboSlug: comboSlug,
        substituteName: substitute?.canonical_name || comboSlug,
        score: roundScore(row.confidence_score),
        matchType: "verified_substitute",
        source: "verified_substitutions",
        context: normalizeContext(row.context),
        replacementRatio: row.replacement_ratio || "",
        notes: row.notes || "",
        sourceName: row.source_name || "",
        sourceURL: row.source_url || "",
        categoryScore: 1,
        tagSimilarityScore: 1,
        contextScore: roundScore(row.confidence_score)
      };
    });
}

function dynamicSubstituteCandidates({ source, context, rules, ingredientsById, allowedCandidateIds }) {
  const candidates = [];
  const candidatePool = allowedCandidateIds
    ? [...allowedCandidateIds].map((id) => ingredientsById.get(id)).filter(Boolean)
    : [...ingredientsById.values()];

  for (const candidate of candidatePool) {
    if (candidate.ingredient_id === source.ingredient_id) {
      continue;
    }
    const scored = scoreDynamicSubstitute({ source, candidate, context, rules });
    if (!scored) {
      continue;
    }
    candidates.push({
      ingredientId: source.ingredient_id,
      substituteIngredientId: candidate.ingredient_id,
      substituteComboSlug: "",
      substituteName: candidate.canonical_name || candidate.ingredient_slug || candidate.ingredient_id,
      score: scored.score,
      matchType: "dynamic_substitute",
      source: scored.source,
      context: scored.context,
      replacementRatio: "",
      notes: "",
      sourceName: "",
      sourceURL: "",
      categoryScore: scored.categoryScore,
      tagSimilarityScore: scored.tagSimilarityScore,
      contextScore: scored.contextScore
    });
  }
  return candidates;
}

function normalizeCandidateIngredientIds(candidateIngredientIds) {
  if (!candidateIngredientIds) {
    return null;
  }
  const values = candidateIngredientIds instanceof Set
    ? [...candidateIngredientIds]
    : Array.isArray(candidateIngredientIds)
      ? candidateIngredientIds
      : [];
  const normalized = values
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return normalized.length > 0 ? new Set(normalized) : null;
}

function scoreCategorySimilarity(source, candidate, categories) {
  const sourceSubcategoryId = String(source.subcategory_id || "");
  const candidateSubcategoryId = String(candidate.subcategory_id || "");
  const sourceCategoryId = String(source.category_id || "");
  const candidateCategoryId = String(candidate.category_id || "");

  if (sourceSubcategoryId && sourceSubcategoryId === candidateSubcategoryId) {
    return 0.95;
  }
  if (sourceCategoryId && sourceCategoryId === candidateCategoryId) {
    return 0.78;
  }

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const sourceParentId = categoriesById.get(sourceSubcategoryId)?.parent_category_id || "";
  const candidateParentId = categoriesById.get(candidateSubcategoryId)?.parent_category_id || "";
  if (sourceParentId && sourceParentId === candidateParentId) {
    return 0.72;
  }

  return 0;
}

function categorySlug(categoryId, categories) {
  const category = categories.find((item) => item.id === categoryId);
  return category?.slug || "";
}

function scoreTagSimilarity(sourceIngredientId, candidateIngredientId, profiles) {
  const sourceProfiles = profiles
    .filter((profile) => profile.ingredient_id === sourceIngredientId)
    .map((profile) => ({ tagId: profile.tag_id, weight: Number(profile.weight || 1) }));
  if (sourceProfiles.length === 0) {
    return 0;
  }

  const candidateByTag = new Map(
    profiles
      .filter((profile) => profile.ingredient_id === candidateIngredientId)
      .map((profile) => [profile.tag_id, Number(profile.weight || 1)])
  );

  const sourceWeight = sourceProfiles.reduce((sum, profile) => sum + profile.weight, 0);
  const overlapWeight = sourceProfiles.reduce((sum, profile) => {
    const candidateWeight = candidateByTag.get(profile.tagId);
    return candidateWeight ? sum + Math.min(profile.weight, candidateWeight) : sum;
  }, 0);

  return sourceWeight > 0 ? clampScore(overlapWeight / sourceWeight) : 0;
}

function scoreContext(source, candidate, context, substitutionRules) {
  const sourceCategoryIds = [source.subcategory_id, source.category_id].filter(Boolean);
  const candidateCategoryIds = [candidate.subcategory_id, candidate.category_id].filter(Boolean);

  let best = 0;
  for (const rule of substitutionRules) {
    const sourceMatches = sourceCategoryIds.includes(rule.source_category_id);
    const targetMatches = candidateCategoryIds.includes(rule.target_category_id);
    if (!sourceMatches || !targetMatches) {
      continue;
    }
    if (normalizeContext(rule.context) === context || normalizeContext(rule.context) === "general") {
      best = Math.max(best, Number(rule.base_score || 0));
    }
  }

  return clampScore(best);
}

function contextMatches(rowContext, requestedContext) {
  const normalizedRowContext = normalizeContext(rowContext);
  return normalizedRowContext === "general" || normalizedRowContext === requestedContext;
}

function normalizeContext(context) {
  const value = String(context || "general").trim().toLowerCase();
  return value || "general";
}

function clampScore(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

function roundScore(value) {
  return Math.round(clampScore(value) * 1000) / 1000;
}
