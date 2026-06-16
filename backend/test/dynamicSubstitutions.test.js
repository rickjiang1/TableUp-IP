import test from "node:test";
import assert from "node:assert/strict";
import { getSubstituteCandidates, scoreDynamicSubstitute } from "../src/dynamicSubstitutions.js";

const dairy = "category-dairy";
const poultry = "category-poultry";
const beef = "category-beef";
const vegetable = "category-vegetable";
const allium = "category-allium";

const milk = ingredient("milk-id", "milk", "milk", dairy);
const heavyCream = ingredient("heavy-cream-id", "heavy_cream", "heavy cream", dairy);
const greekYogurt = ingredient("greek-yogurt-id", "greek_yogurt", "Greek yogurt", dairy);
const chickenBreast = ingredient("chicken-breast-id", "chicken_breast", "chicken breast", poultry);
const chickenThigh = ingredient("chicken-thigh-id", "chicken_thigh", "chicken thigh", poultry);
const carrot = ingredient("carrot-id", "carrot", "carrot", vegetable);
const beefShortRib = ingredient("beef-short-rib-id", "beef_short_rib", "beef short rib", beef);
const garlic = ingredient("garlic-id", "garlic", "garlic", allium);
const scallion = ingredient("scallion-id", "scallion", "scallion", allium);

const rules = {
  ingredients: [milk, heavyCream, greekYogurt, chickenBreast, chickenThigh, carrot, beefShortRib, garlic, scallion],
  categories: [
    { id: dairy, slug: "dairy", name: "Dairy", parent_category_id: "" },
    { id: poultry, slug: "poultry", name: "Poultry", parent_category_id: "category-meat" },
    { id: beef, slug: "beef", name: "Beef", parent_category_id: "category-meat" },
    { id: vegetable, slug: "vegetable", name: "Vegetable", parent_category_id: "" },
    { id: allium, slug: "allium", name: "Allium", parent_category_id: "category-aromatic" }
  ],
  functionalProfiles: [
    profile(heavyCream, "dairy", 1),
    profile(heavyCream, "liquid", 1),
    profile(heavyCream, "creamy", 1),
    profile(heavyCream, "fatty", 1),
    profile(milk, "dairy", 1),
    profile(milk, "liquid", 1),
    profile(milk, "creamy", 0.4),
    profile(greekYogurt, "dairy", 1),
    profile(greekYogurt, "creamy", 1),
    profile(greekYogurt, "thick", 1),
    profile(chickenThigh, "meat", 1),
    profile(chickenThigh, "fatty", 0.8),
    profile(chickenThigh, "tender", 0.8),
    profile(chickenBreast, "meat", 1),
    profile(chickenBreast, "lean", 1),
    profile(beefShortRib, "meat", 1),
    profile(beefShortRib, "fatty", 0.9),
    profile(carrot, "crisp", 1),
    profile(garlic, "allium", 1),
    profile(garlic, "aromatic", 1),
    profile(scallion, "allium", 1),
    profile(scallion, "aromatic", 1)
  ],
  substitutionRules: [
    rule(dairy, dairy, "general", 0.78),
    rule(dairy, dairy, "sauce", 0.82),
    rule(poultry, poultry, "general", 0.78),
    rule(beef, beef, "general", 0.74),
    rule(allium, allium, "general", 0.84)
  ],
  verifiedSubstitutions: [
    {
      ingredient_id: chickenThigh.ingredient_id,
      substitute_ingredient_id: chickenBreast.ingredient_id,
      context: "general",
      confidence_score: 0.8,
      replacement_ratio: "1:1 by weight",
      notes: "Leaner; reduce cooking time.",
      source_name: "test",
      source_url: ""
    }
  ]
};

test("verified substitutions are returned before dynamic candidates", () => {
  const candidates = getSubstituteCandidates({
    ingredientId: chickenThigh.ingredient_id,
    context: "general",
    rules,
    minimumScore: 0.55
  });

  assert.equal(candidates[0].substituteIngredientId, chickenBreast.ingredient_id);
  assert.equal(candidates[0].matchType, "verified_substitute");
  assert.equal(candidates[0].score, 0.8);
});

test("risky aromatic family substitutes stay below automatic match threshold", () => {
  const score = scoreDynamicSubstitute({
    source: scallion,
    candidate: garlic,
    context: "general",
    rules
  });

  assert.ok(score);
  assert.equal(score.score, 0.69);
  assert.equal(getSubstituteCandidates({
    ingredientId: scallion.ingredient_id,
    context: "general",
    rules,
    minimumScore: 0.7
  }).length, 0);
});

test("dynamic scoring combines category, tag, and context scores", () => {
  const score = scoreDynamicSubstitute({
    source: heavyCream,
    candidate: milk,
    context: "sauce",
    rules
  });

  assert.ok(score);
  assert.equal(score.categoryScore, 0.95);
  assert.ok(score.tagSimilarityScore > 0.55);
  assert.ok(score.contextScore >= 0.82);
  assert.ok(score.score > 0.75);
});

test("context-specific rules affect candidate score", () => {
  const general = scoreDynamicSubstitute({ source: heavyCream, candidate: milk, context: "general", rules });
  const sauce = scoreDynamicSubstitute({ source: heavyCream, candidate: milk, context: "sauce", rules });

  assert.ok(general);
  assert.ok(sauce);
  assert.ok(sauce.score >= general.score);
});

test("cross-category candidates are not dynamically recommended", () => {
  const score = scoreDynamicSubstitute({
    source: heavyCream,
    candidate: carrot,
    context: "general",
    rules
  });

  assert.equal(score, null);
});

test("minimumScore filters weak dynamic candidates", () => {
  const candidates = getSubstituteCandidates({
    ingredientId: heavyCream.ingredient_id,
    context: "general",
    rules,
    minimumScore: 0.8
  });

  assert.ok(candidates.every((candidate) => candidate.score >= 0.8));
});

function ingredient(ingredient_id, ingredient_slug, canonical_name, subcategory_id) {
  return {
    ingredient_id,
    ingredient_slug,
    canonical_name,
    category_id: subcategory_id,
    subcategory_id
  };
}

function profile(ingredientRow, tag_id, weight) {
  return {
    ingredient_id: ingredientRow.ingredient_id,
    tag_id,
    weight
  };
}

function rule(source_category_id, target_category_id, context, base_score) {
  return {
    source_category_id,
    target_category_id,
    context,
    base_score
  };
}
