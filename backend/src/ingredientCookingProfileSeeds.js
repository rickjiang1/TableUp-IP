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
