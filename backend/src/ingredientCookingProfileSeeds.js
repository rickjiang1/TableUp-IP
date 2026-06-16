const profileRules = [
  profile("chicken", ["stir_fry", "pan_fry", "roast", "grill", "soup", "braise"], "medium", "versatile", "medium", "poultry_general"),
  profile("chicken_breast", ["stir_fry", "pan_fry", "grill", "bake", "poach"], "short", "lean_tender", "low", "poultry_breast"),
  profile("boneless_skinless_chicken_breast", ["stir_fry", "pan_fry", "grill", "bake", "poach"], "short", "lean_tender", "low", "poultry_breast"),
  profile("chicken_breast_fillet", ["stir_fry", "pan_fry", "grill", "bake"], "short", "lean_tender", "low", "poultry_breast"),
  profile("chicken_tenderloin", ["stir_fry", "pan_fry", "grill", "bake"], "short", "lean_tender", "low", "poultry_breast"),
  profile("chicken_thigh", ["stir_fry", "pan_fry", "grill", "bake", "braise"], "medium", "juicy_tender", "medium_high", "poultry_dark_meat"),
  profile("chicken_thigh_boneless_skinless", ["stir_fry", "pan_fry", "grill", "bake", "braise"], "medium", "juicy_tender", "medium", "poultry_dark_meat"),
  profile("chicken_drumstick", ["bake", "roast", "braise", "soup", "grill"], "medium", "bone_in_juicy", "medium", "poultry_dark_meat"),
  profile("chicken_leg", ["bake", "roast", "braise", "soup", "grill"], "medium", "bone_in_juicy", "medium", "poultry_dark_meat"),
  profile("chicken_leg_quarter", ["bake", "roast", "braise", "soup", "grill"], "medium_long", "bone_in_juicy", "medium_high", "poultry_dark_meat"),
  profile("chicken_wing", ["bake", "roast", "air_fry", "deep_fry", "grill"], "medium", "bone_in_skin", "medium_high", "poultry_wing"),
  profile("chicken_wingette", ["bake", "air_fry", "deep_fry", "grill"], "medium", "bone_in_skin", "medium_high", "poultry_wing"),
  profile("chicken_drumette", ["bake", "air_fry", "deep_fry", "grill"], "medium", "bone_in_skin", "medium_high", "poultry_wing"),

  profile("beef", ["stir_fry", "pan_fry", "grill", "braise", "stew", "hot_pot"], "medium", "versatile", "medium", "beef_general"),
  profile("beef_brisket", ["braise", "stew", "slow_cook", "smoke"], "long", "tough_to_tender", "medium_high", "beef_braising"),
  profile("full_brisket", ["braise", "stew", "slow_cook", "smoke"], "long", "tough_to_tender", "medium_high", "beef_braising"),
  profile("beef_chuck", ["braise", "stew", "slow_cook", "grind"], "long", "tough_to_tender", "medium", "beef_braising"),
  profile("beef_chuck_roast", ["braise", "stew", "slow_cook", "roast"], "long", "tough_to_tender", "medium", "beef_braising"),
  profile("beef_stew_meat", ["braise", "stew", "slow_cook"], "long", "tough_to_tender", "medium", "beef_braising"),
  profile("beef_shank", ["braise", "stew", "soup", "slow_cook"], "long", "gelatin_rich", "medium", "beef_braising"),
  profile("beef_oxtail", ["braise", "stew", "soup", "slow_cook"], "long", "gelatin_rich", "medium_high", "beef_braising"),
  profile("beef_short_rib", ["braise", "stew", "grill", "slow_cook"], "long", "rich_tender", "high", "beef_braising"),
  profile("short_ribs", ["braise", "stew", "grill", "slow_cook"], "long", "rich_tender", "high", "beef_braising"),
  profile("beef_rib", ["roast", "grill", "braise"], "medium_long", "rich_tender", "high", "beef_steak_roast"),
  profile("rib_eye", ["pan_fry", "grill", "roast"], "short", "tender_steak", "high", "beef_steak"),
  profile("ribeye_steak", ["pan_fry", "grill"], "short", "tender_steak", "high", "beef_steak"),
  profile("prime_rib", ["roast", "grill"], "medium_long", "tender_roast", "high", "beef_steak_roast"),
  profile("beef_tenderloin", ["pan_fry", "grill", "roast"], "short", "very_tender", "low_medium", "beef_steak"),
  profile("beef_filet_mignon", ["pan_fry", "grill"], "short", "very_tender", "low_medium", "beef_steak"),
  profile("tenderloin_steak", ["pan_fry", "grill"], "short", "very_tender", "low_medium", "beef_steak"),
  profile("beef_strip_steak", ["pan_fry", "grill"], "short", "tender_steak", "medium", "beef_steak"),
  profile("strip_loin", ["pan_fry", "grill", "roast"], "short", "tender_steak", "medium", "beef_steak"),
  profile("beef_flank", ["stir_fry", "grill", "pan_fry"], "short", "lean_fibrous", "low", "beef_quick_cook"),
  profile("flank_steak", ["stir_fry", "grill", "pan_fry"], "short", "lean_fibrous", "low", "beef_quick_cook"),
  profile("beef_skirt_steak", ["stir_fry", "grill", "pan_fry"], "short", "loose_grain", "medium", "beef_quick_cook"),
  profile("beef_hanger_steak", ["pan_fry", "grill"], "short", "tender_steak", "medium", "beef_steak"),
  profile("beef_round", ["stir_fry", "roast", "braise"], "medium", "lean_firm", "low", "beef_lean"),
  profile("hot_pot_beef", ["hot_pot", "quick_boil", "stir_fry"], "short", "thin_sliced", "medium", "beef_quick_cook"),
  profile("ground_beef", ["stir_fry", "pan_fry", "sauce", "stuffing"], "short", "ground", "medium", "ground_meat"),

  profile("pork", ["stir_fry", "pan_fry", "grill", "braise", "stew", "roast"], "medium", "versatile", "medium", "pork_general"),
  profile("pork_belly", ["braise", "stew", "roast", "grill", "stir_fry"], "medium_long", "fatty_rich", "high", "pork_fatty"),
  profile("pork_shoulder", ["braise", "stew", "slow_cook", "roast"], "long", "tough_to_tender", "medium_high", "pork_braising"),
  profile("pork_butt", ["braise", "stew", "slow_cook", "roast"], "long", "tough_to_tender", "medium_high", "pork_braising"),
  profile("pork_rib", ["braise", "stew", "roast", "grill"], "medium_long", "bone_in_rich", "medium_high", "pork_rib"),
  profile("pork_spare_rib", ["braise", "stew", "roast", "grill"], "medium_long", "bone_in_rich", "medium_high", "pork_rib"),
  profile("pork_back_rib", ["roast", "grill", "braise"], "medium_long", "bone_in_rich", "medium", "pork_rib"),
  profile("baby_back_ribs", ["roast", "grill", "braise"], "medium_long", "bone_in_rich", "medium", "pork_rib"),
  profile("pork_chop", ["pan_fry", "grill", "bake"], "short", "lean_tender", "medium", "pork_quick_cook"),
  profile("pork_loin", ["pan_fry", "grill", "roast"], "medium", "lean_tender", "low_medium", "pork_quick_cook"),
  profile("pork_tenderloin", ["pan_fry", "grill", "roast"], "short", "very_tender", "low", "pork_quick_cook"),
  profile("pork_hock", ["braise", "stew", "soup", "slow_cook"], "long", "gelatin_rich", "medium_high", "pork_braising"),
  profile("pork_shank", ["braise", "stew", "soup", "slow_cook"], "long", "gelatin_rich", "medium_high", "pork_braising"),
  profile("ground_pork", ["stir_fry", "pan_fry", "sauce", "stuffing"], "short", "ground", "medium", "ground_meat"),

  profile("lamb", ["grill", "roast", "braise", "stew"], "medium", "versatile", "medium", "lamb_general"),
  profile("lamb_chops", ["pan_fry", "grill"], "short", "tender_chop", "medium", "lamb_quick_cook"),
  profile("lamb_loin", ["pan_fry", "grill", "roast"], "short", "tender", "medium", "lamb_quick_cook"),
  profile("lamb_shank", ["braise", "stew", "slow_cook"], "long", "gelatin_rich", "medium", "lamb_braising"),
  profile("lamb_shoulder", ["braise", "stew", "slow_cook", "roast"], "long", "tough_to_tender", "medium_high", "lamb_braising"),
  profile("leg_of_lamb", ["roast", "braise"], "medium_long", "roast_tender", "medium", "lamb_roast"),

  profile("fish", ["pan_fry", "steam", "bake", "soup"], "short", "delicate", "low_medium", "fish_general"),
  profile("cod", ["pan_fry", "steam", "bake", "soup"], "short", "flaky_white_fish", "low", "white_fish"),
  profile("tilapia", ["pan_fry", "steam", "bake"], "short", "mild_white_fish", "low", "white_fish"),
  profile("swai", ["pan_fry", "steam", "bake"], "short", "mild_white_fish", "low", "white_fish"),
  profile("pangasius", ["pan_fry", "steam", "bake"], "short", "mild_white_fish", "low", "white_fish"),
  profile("salmon", ["pan_fry", "grill", "bake", "steam"], "short", "fatty_fish", "high", "fatty_fish"),
  profile("tuna", ["pan_fry", "grill", "raw"], "short", "meaty_fish", "low_medium", "meaty_fish"),
  profile("shrimp", ["stir_fry", "pan_fry", "boil", "steam"], "short", "shellfish_bouncy", "low", "shellfish"),
  profile("prawns", ["stir_fry", "pan_fry", "boil", "steam"], "short", "shellfish_bouncy", "low", "shellfish"),
  profile("scallop", ["pan_fry", "steam"], "short", "shellfish_tender", "low", "shellfish"),
  profile("squid", ["stir_fry", "deep_fry", "grill"], "short", "chewy", "low", "shellfish"),
  profile("clam", ["steam", "soup", "stir_fry"], "short", "shellfish_briny", "low", "shellfish"),
  profile("mussel", ["steam", "soup"], "short", "shellfish_briny", "low", "shellfish"),

  profile("tofu", ["stir_fry", "braise", "soup", "pan_fry"], "short", "soft_absorbent", "low", "plant_protein"),
  profile("soft_tofu", ["soup", "braise", "steam"], "short", "very_soft", "low", "plant_protein"),
  profile("egg", ["pan_fry", "boil", "steam", "bake"], "short", "egg", "medium", "egg")
];

const substitutionContextRules = [
  context("chicken_breast", "chicken_thigh", ["stir_fry", "pan_fry", "bake", "grill"], "slightly_longer", "juicier_dark_meat", "higher_fat", "Thigh works in many breast recipes but may need a little more cooking time."),
  context("chicken_thigh", "chicken_breast", ["stir_fry", "pan_fry", "bake", "grill"], "slightly_shorter", "leaner_drier", "lower_fat", "Breast works for thigh in quick recipes; avoid overcooking."),
  context("chicken_breast", "chicken_tenderloin", ["stir_fry", "pan_fry", "grill"], "slightly_shorter", "similar_lean_tender", "same", "Tenderloin is close to breast and cooks quickly."),
  context("chicken_leg", "chicken_drumstick", ["bake", "roast", "braise", "soup"], "same", "similar_dark_meat", "same", "Drumsticks can replace legs when bone-in dark meat is acceptable."),
  context("chicken_wing", "chicken_wingette", ["bake", "air_fry", "deep_fry", "grill"], "same", "similar", "same", "Wing pieces are interchangeable in wing recipes."),
  context("chicken_wing", "chicken_drumette", ["bake", "air_fry", "deep_fry", "grill"], "same", "similar", "same", "Wing pieces are interchangeable in wing recipes."),

  context("beef_brisket", "beef_chuck", ["braise", "stew", "slow_cook"], "same", "similar_braising_cut", "slightly_lower_fat", "Chuck is one of the best brisket substitutes for stew/braise."),
  context("beef_chuck", "beef_brisket", ["braise", "stew", "slow_cook"], "same", "similar_braising_cut", "slightly_higher_fat", "Brisket can replace chuck in slow cooking."),
  context("beef_brisket", "full_brisket", ["braise", "stew", "slow_cook", "smoke"], "same", "same_cut", "same", "Same cut family."),
  context("beef_chuck", "beef_stew_meat", ["braise", "stew", "slow_cook"], "same", "similar_braising_cut", "same", "Stew meat often comes from chuck or similar braising cuts."),
  context("beef_shank", "beef_oxtail", ["braise", "stew", "soup", "slow_cook"], "same", "gelatin_rich", "slightly_higher_fat", "Both work in gelatin-rich soups and braises."),
  context("beef_short_rib", "beef_rib", ["braise", "stew", "grill"], "same", "rich_bone_in", "same", "Rib cuts can overlap for braise/grill but texture differs."),
  context("beef_rib", "ribeye_steak", ["grill", "pan_fry", "roast"], "shorter", "more_tender_steak", "same", "Good for steak/roast methods, not stew."),
  context("ribeye_steak", "rib_eye", ["pan_fry", "grill"], "same", "same_cut", "same", "Same cut family."),
  context("beef_tenderloin", "beef_filet_mignon", ["pan_fry", "grill", "roast"], "same", "same_cut_family", "same", "Filet is a tenderloin portion."),
  context("beef_flank", "beef_skirt_steak", ["stir_fry", "grill", "pan_fry"], "same", "similar_grain", "slightly_higher_fat", "Good quick-cook substitute when sliced against the grain."),
  context("beef_round", "eye_of_round", ["roast", "stir_fry", "braise"], "same", "similar_lean", "same", "Round subcut with similar lean profile."),
  context("ground_beef", "ground_pork", ["stir_fry", "pan_fry", "sauce", "stuffing"], "same", "ground_meat", "slightly_higher_fat", "Works when the recipe can accept pork flavor."),

  context("pork_shoulder", "pork_butt", ["braise", "stew", "slow_cook", "roast"], "same", "same_cut_family", "same", "Very close substitutes."),
  context("pork_rib", "pork_spare_rib", ["braise", "stew", "roast", "grill"], "same", "similar_rib", "same", "Good rib substitute."),
  context("pork_back_rib", "baby_back_ribs", ["roast", "grill", "braise"], "same", "similar_rib", "same", "Same rib family."),
  context("pork_chop", "pork_loin", ["pan_fry", "grill", "bake"], "same", "lean_larger_cut", "same", "Loin can be cut into chop-like portions."),
  context("pork_loin", "pork_tenderloin", ["pan_fry", "grill", "roast"], "shorter", "more_tender_lean", "lower_fat", "Tenderloin cooks faster and dries out faster."),
  context("pork_hock", "pork_shank", ["braise", "stew", "soup", "slow_cook"], "same", "gelatin_rich", "same", "Similar slow-cooking pork cuts."),

  context("lamb_chops", "lamb_rib_rack", ["pan_fry", "grill", "roast"], "same", "similar_rib_cut", "same", "Rack can be portioned into chops."),
  context("lamb_shank", "lamb_leg_shank_portion", ["braise", "stew", "slow_cook"], "same", "gelatin_rich", "same", "Same slow-cooking shank family."),
  context("lamb_shoulder", "lamb_neck", ["braise", "stew", "slow_cook"], "same", "tough_to_tender", "same", "Both need long cooking."),

  context("cod", "alaskan_pollock", ["pan_fry", "steam", "bake", "soup"], "same", "flaky_white_fish", "same", "Mild flaky white fish substitute."),
  context("tilapia", "swai", ["pan_fry", "steam", "bake"], "same", "mild_white_fish", "same", "Mild white fish substitute."),
  context("shrimp", "prawns", ["stir_fry", "pan_fry", "boil", "steam"], "same", "very_similar_shellfish", "same", "Shrimp and prawns are close for most recipes."),
  context("clam", "mussel", ["steam", "soup"], "same", "briny_shellfish", "same", "Works in soups or steamed shellfish dishes."),
  context("tofu", "soft_tofu", ["soup", "braise"], "same", "softer_more_delicate", "same", "Soft tofu breaks more easily; avoid firm tofu preparations.")
];

export function buildCookingProfileSeedRows(ingredients) {
  const available = new Set((ingredients || []).map((item) => item.ingredient_id));
  const rows = new Map();
  for (const row of profileRules) {
    if (!available.has(row.ingredient_id)) continue;
    rows.set(row.ingredient_id, row);
  }
  for (const ingredient of ingredients || []) {
    if (rows.has(ingredient.ingredient_id)) continue;
    rows.set(ingredient.ingredient_id, fallbackProfile(ingredient));
  }
  return [...rows.values()].sort((a, b) => a.ingredient_id.localeCompare(b.ingredient_id));
}

export function buildSubstitutionContextSeedRows(ingredients, substitutions) {
  const availableIngredients = new Set((ingredients || []).map((item) => item.ingredient_id));
  const availableSubstitutions = new Set((substitutions || []).map((item) => `${item.ingredient_id}|${item.substitute_ingredient_id}`));
  const profiles = new Map(buildCookingProfileSeedRows(ingredients).map((item) => [item.ingredient_id, item]));
  const rows = new Map();

  const add = (row) => {
    if (!row) return;
    if (!availableIngredients.has(row.ingredient_id) || !availableIngredients.has(row.substitute_ingredient_id)) return;
    if (!availableSubstitutions.has(`${row.ingredient_id}|${row.substitute_ingredient_id}`)) return;
    if (rows.has(`${row.ingredient_id}|${row.substitute_ingredient_id}`)) return;
    rows.set(`${row.ingredient_id}|${row.substitute_ingredient_id}`, row);
  };

  for (const row of substitutionContextRules) {
    add(row);
    add(reverseContext(row));
  }
  for (const substitution of substitutions || []) {
    add(inferContext(substitution, profiles));
  }

  return [...rows.values()].sort((a, b) =>
    a.ingredient_id.localeCompare(b.ingredient_id) ||
    a.substitute_ingredient_id.localeCompare(b.substitute_ingredient_id)
  );
}

function profile(ingredientId, primaryMethods, cookingTimeClass, textureClass, fatLevel, cutGroup, notes = "") {
  return {
    ingredient_id: ingredientId,
    primary_methods: primaryMethods,
    cooking_time_class: cookingTimeClass,
    texture_class: textureClass,
    fat_level: fatLevel,
    cut_group: cutGroup,
    notes
  };
}

function context(ingredientId, substituteIngredientId, compatibleMethods, timeAdjustment, textureImpact, fatImpact, notes = "") {
  return {
    ingredient_id: ingredientId,
    substitute_ingredient_id: substituteIngredientId,
    compatible_methods: compatibleMethods,
    time_adjustment: timeAdjustment,
    texture_impact: textureImpact,
    fat_impact: fatImpact,
    notes
  };
}

function fallbackProfile(ingredient) {
  const ingredientId = ingredient.ingredient_id;
  const category = normalizeCategory(ingredient.category);
  const lowerId = ingredientId.toLowerCase();

  if (category === "protein" || category === "meat") {
    if (lowerId.includes("ground")) {
      return profile(ingredientId, ["stir_fry", "pan_fry", "sauce", "stuffing"], "short", "ground", "medium", "ground_meat", "Auto-generated from ingredient category.");
    }
    if (lowerId.includes("rib") || lowerId.includes("shank") || lowerId.includes("brisket") || lowerId.includes("oxtail")) {
      return profile(ingredientId, ["braise", "stew", "slow_cook", "roast"], "long", "tough_to_tender", "medium_high", `${proteinPrefix(lowerId)}_braising`, "Auto-generated from ingredient category.");
    }
    return profile(ingredientId, ["stir_fry", "pan_fry", "grill", "bake", "braise"], "medium", "protein", "medium", `${proteinPrefix(lowerId)}_general`, "Auto-generated from ingredient category.");
  }

  if (category === "seafood") {
    return profile(ingredientId, ["pan_fry", "steam", "bake", "soup"], "short", "seafood", "low_medium", "seafood_general", "Auto-generated from ingredient category.");
  }

  if (category === "vegetable" || category === "aromatic" || category === "herb" || category === "mushroom") {
    if (category === "herb" || lowerId.includes("cilantro") || lowerId.includes("parsley") || lowerId.includes("basil") || lowerId.includes("mint")) {
      return profile(ingredientId, ["raw", "finish", "sauce"], "none", "fresh_herb", "low", "fresh_herb", "Auto-generated from ingredient category.");
    }
    return profile(ingredientId, ["stir_fry", "roast", "steam", "soup", "braise"], "short_medium", "vegetable", "low", "vegetable_general", "Auto-generated from ingredient category.");
  }

  if (category === "fruit") {
    return profile(ingredientId, ["raw", "bake", "sauce"], "short", "fruit", "low", "fruit_general", "Auto-generated from ingredient category.");
  }

  if (category === "dairy") {
    return profile(ingredientId, ["baking", "sauce", "finish"], "none", "dairy", "medium", "dairy_general", "Auto-generated from ingredient category.");
  }

  if (category === "grain" || category === "bakery") {
    return profile(ingredientId, ["baking", "boil", "steam"], "medium", "grain", "low", "grain_general", "Auto-generated from ingredient category.");
  }

  if (category === "pantry" || category === "sauce" || category === "spice" || category === "seasoning" || category === "other") {
    return profile(ingredientId, ["season", "sauce", "baking", "finish"], "none", "pantry", "varies", "pantry_general", "Auto-generated from ingredient category.");
  }

  return profile(ingredientId, ["general"], "medium", "general", "varies", "general", "Auto-generated from ingredient category.");
}

function inferContext(substitution, profiles) {
  const source = profiles.get(substitution.ingredient_id);
  const substitute = profiles.get(substitution.substitute_ingredient_id);
  if (!source || !substitute) return null;

  const compatibleMethods = intersect(source.primary_methods, substitute.primary_methods);
  return context(
    substitution.ingredient_id,
    substitution.substitute_ingredient_id,
    compatibleMethods.length ? compatibleMethods : ["general"],
    compareTime(source.cooking_time_class, substitute.cooking_time_class),
    compareTexture(source, substitute),
    compareFat(source.fat_level, substitute.fat_level),
    "Auto-generated from ingredient cooking profiles and verified substitution pair; review for recipe-specific precision."
  );
}

function reverseContext(row) {
  if (!row) return null;
  return {
    ingredient_id: row.substitute_ingredient_id,
    substitute_ingredient_id: row.ingredient_id,
    compatible_methods: row.compatible_methods,
    time_adjustment: reverseTimeAdjustment(row.time_adjustment),
    texture_impact: row.texture_impact,
    fat_impact: reverseFatImpact(row.fat_impact),
    notes: row.notes
  };
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function proteinPrefix(ingredientId) {
  if (ingredientId.includes("beef")) return "beef";
  if (ingredientId.includes("pork")) return "pork";
  if (ingredientId.includes("chicken")) return "poultry";
  if (ingredientId.includes("turkey")) return "poultry";
  if (ingredientId.includes("lamb")) return "lamb";
  return "protein";
}

function intersect(left, right) {
  const rightSet = new Set(right || []);
  return (left || []).filter((item) => rightSet.has(item));
}

function compareTime(sourceClass, substituteClass) {
  const sourceRank = timeRank(sourceClass);
  const substituteRank = timeRank(substituteClass);
  if (substituteRank === sourceRank) return "same";
  if (Math.abs(substituteRank - sourceRank) === 1) {
    return substituteRank > sourceRank ? "slightly_longer" : "slightly_shorter";
  }
  return substituteRank > sourceRank ? "longer" : "shorter";
}

function timeRank(value) {
  switch (value) {
    case "none": return 0;
    case "short": return 1;
    case "short_medium": return 2;
    case "medium": return 3;
    case "medium_long": return 4;
    case "long": return 5;
    default: return 3;
  }
}

function compareTexture(source, substitute) {
  if (source.cut_group && source.cut_group === substitute.cut_group) return "same_cut_group";
  if (source.texture_class === substitute.texture_class) return "similar";
  return `${source.texture_class || "unknown"}_to_${substitute.texture_class || "unknown"}`.slice(0, 120);
}

function compareFat(sourceFat, substituteFat) {
  const sourceRank = fatRank(sourceFat);
  const substituteRank = fatRank(substituteFat);
  if (substituteRank === sourceRank) return "same";
  if (Math.abs(substituteRank - sourceRank) === 1) {
    return substituteRank > sourceRank ? "slightly_higher_fat" : "slightly_lower_fat";
  }
  return substituteRank > sourceRank ? "higher_fat" : "lower_fat";
}

function fatRank(value) {
  switch (value) {
    case "low": return 1;
    case "low_medium": return 2;
    case "medium": return 3;
    case "medium_high": return 4;
    case "high": return 5;
    default: return 3;
  }
}

function reverseTimeAdjustment(value) {
  switch (value) {
    case "shorter": return "longer";
    case "longer": return "shorter";
    case "slightly_shorter": return "slightly_longer";
    case "slightly_longer": return "slightly_shorter";
    default: return value;
  }
}

function reverseFatImpact(value) {
  switch (value) {
    case "higher_fat": return "lower_fat";
    case "lower_fat": return "higher_fat";
    case "slightly_higher_fat": return "slightly_lower_fat";
    case "slightly_lower_fat": return "slightly_higher_fat";
    default: return value;
  }
}
