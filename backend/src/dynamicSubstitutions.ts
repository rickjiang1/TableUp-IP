export type DynamicSubstitutionContext =
  | "general"
  | "baking"
  | "soup"
  | "sauce"
  | "salad"
  | "stir_fry"
  | "marinade"
  | string;

export type IngredientForSubstitution = {
  ingredient_id: string;
  ingredient_slug?: string;
  canonical_name?: string;
  category_id?: string;
  subcategory_id?: string;
};

export type IngredientFunctionalProfile = {
  ingredient_id: string;
  tag_id: string;
  weight?: number;
};

export type SubstitutionRule = {
  source_category_id: string;
  target_category_id: string;
  context: string;
  base_score: number;
  notes?: string;
};

export type VerifiedSubstitution = {
  ingredient_id: string;
  substitute_ingredient_id?: string;
  substitute_combo_slug?: string;
  context: string;
  confidence_score: number;
  replacement_ratio?: string;
  notes?: string;
  source_name?: string;
  source_url?: string;
};

export type DynamicSubstitutionRules = {
  ingredients: IngredientForSubstitution[];
  categories: Array<{ id: string; slug: string; name: string; parent_category_id?: string }>;
  functionalProfiles: IngredientFunctionalProfile[];
  substitutionRules: SubstitutionRule[];
  verifiedSubstitutions: VerifiedSubstitution[];
};

export type SubstituteCandidate = {
  ingredientId: string;
  substituteIngredientId: string;
  substituteComboSlug: string;
  substituteName: string;
  score: number;
  matchType: "verified_substitute" | "dynamic_substitute";
  source: "verified_substitutions" | "dynamic_rule";
  context: string;
  replacementRatio: string;
  notes: string;
  sourceName: string;
  sourceURL: string;
  categoryScore: number;
  tagSimilarityScore: number;
  contextScore: number;
};

export function getSubstituteCandidates(input: {
  ingredientId: string;
  context?: DynamicSubstitutionContext;
  rules: DynamicSubstitutionRules;
  limit?: number;
  minimumScore?: number;
}): SubstituteCandidate[] {
  return getSubstituteCandidatesJS(input) as SubstituteCandidate[];
}

export function scoreDynamicSubstitute(input: {
  source: IngredientForSubstitution;
  candidate: IngredientForSubstitution;
  context?: DynamicSubstitutionContext;
  rules: DynamicSubstitutionRules;
}): null | {
  score: number;
  categoryScore: number;
  tagSimilarityScore: number;
  contextScore: number;
  source: "dynamic_rule";
  context: string;
} {
  return scoreDynamicSubstituteJS(input) as null | {
    score: number;
    categoryScore: number;
    tagSimilarityScore: number;
    contextScore: number;
    source: "dynamic_rule";
    context: string;
  };
}
import {
  getSubstituteCandidates as getSubstituteCandidatesJS,
  scoreDynamicSubstitute as scoreDynamicSubstituteJS
} from "./dynamicSubstitutions.js";
