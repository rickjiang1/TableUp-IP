const directRules = [
  ["chicken_breast", "chicken_thigh", 0.78],
  ["chicken_breast", "chicken_tenderloin", 0.9],
  ["chicken_breast", "boneless_skinless_chicken_breast", 0.98],
  ["chicken_breast", "chicken_breast_fillet", 0.96],
  ["chicken_breast", "chicken_breast_bone_in", 0.82],
  ["chicken_thigh", "chicken_thigh_boneless_skinless", 0.96],
  ["chicken_thigh", "chicken_leg", 0.78],
  ["chicken_thigh", "chicken_drumstick", 0.7],
  ["chicken_leg", "chicken_leg_quarter", 0.9],
  ["chicken_leg", "chicken_quarters", 0.9],
  ["chicken_drumstick", "chicken_leg", 0.82],
  ["chicken_wing", "chicken_wing_whole", 0.96],
  ["chicken_wing", "chicken_wingette", 0.85],
  ["chicken_wing", "chicken_drumette", 0.85],
  ["chicken_drumette", "chicken_wing_drumette", 0.98],

  ["beef_filet_mignon", "beef_tenderloin", 0.96],
  ["beef_filet_mignon", "tenderloin_steak", 0.94],
  ["beef_tenderloin", "tenderloin_steak", 0.95],
  ["beef_strip_steak", "strip_loin", 0.92],
  ["beef_rib", "rib_eye", 0.84],
  ["beef_rib", "ribeye_steak", 0.86],
  ["beef_rib", "prime_rib", 0.82],
  ["rib_eye", "ribeye_steak", 0.96],
  ["rib_eye", "ribeye_filet", 0.9],
  ["ribeye_steak", "ribeye_filet", 0.9],
  ["beef_short_rib", "short_ribs", 0.96],
  ["beef_short_rib", "beef_rib", 0.86],
  ["beef_short_plate", "beef_plate", 0.92],
  ["beef_chuck_roast", "beef_chuck", 0.92],
  ["beef_chuck", "beef_stew_meat", 0.82],
  ["beef_brisket", "full_brisket", 0.96],
  ["beef_brisket", "beef_chuck", 0.72],
  ["beef_shank", "beef_oxtail", 0.68],
  ["beef_flank", "flank_steak", 0.96],
  ["beef_flank", "beef_skirt_steak", 0.78],
  ["beef_skirt_steak", "beef_hanger_steak", 0.76],
  ["beef_round", "eye_of_round", 0.85],
  ["beef_round", "inside_round", 0.85],
  ["beef_round", "outside_round", 0.85],
  ["beef_round", "bottom_blade_steak", 0.58],
  ["beef_tri_tip", "picanha", 0.7],
  ["beef_meatball", "beef_ball", 0.9],

  ["pork_belly", "pork_side", 0.86],
  ["pork_rib", "pork_spare_rib", 0.9],
  ["pork_rib", "pork_side_ribs", 0.9],
  ["pork_back_rib", "baby_back_ribs", 0.94],
  ["pork_spare_rib", "spare_ribs", 0.95],
  ["pork_chop", "pork_loin", 0.82],
  ["pork_chop", "pork_rib_chop", 0.9],
  ["pork_loin", "pork_loin_center", 0.9],
  ["pork_loin", "pork_tenderloin", 0.72],
  ["pork_shoulder", "pork_butt", 0.88],
  ["pork_shoulder", "pork_shoulder_blade", 0.9],
  ["pork_shoulder", "pork_shoulder_picnic", 0.86],
  ["pork_hock", "pork_shank", 0.9],
  ["pork_feet", "pork_foot", 0.98],
  ["pork_leg", "pork_leg_inside", 0.84],
  ["pork_leg", "pork_leg_outside", 0.84],

  ["lamb_chops", "lamb_rib_rack", 0.86],
  ["lamb_chops", "lamb_loin", 0.74],
  ["lamb_shank", "lamb_leg_shank_portion", 0.9],
  ["lamb_shoulder", "lamb_neck", 0.62],
  ["lamb_leg_butt_portion", "leg_of_lamb", 0.88],
  ["lamb_leg_shank_portion", "leg_of_lamb", 0.82],
  ["lamb_meat", "lamb", 0.95],

  ["shrimp", "prawns", 0.96],
  ["shrimp", "seafood_mix", 0.55],
  ["dried_shrimp", "dried_mini_shrimp", 0.9],
  ["crab", "crab_meat", 0.84],
  ["crab", "imitation_crab", 0.55],
  ["clam", "mussel", 0.72],
  ["cod", "alaskan_pollock", 0.84],
  ["cod", "tilapia", 0.72],
  ["tilapia", "swai", 0.82],
  ["swai", "pangasius", 0.92],
  ["tuna", "canned_tuna", 0.62],
  ["fish_ball", "fish_cake", 0.7],

  ["tofu", "soft_tofu", 0.72],
  ["tofu", "fish_tofu", 0.45],
  ["egg", "quail_egg", 0.55],

  ["onion", "red_onions", 0.9],
  ["onion", "white_onions", 0.9],
  ["onion", "shallot", 0.78],
  ["onion", "leek", 0.62],
  ["scallion", "chives", 0.82],
  ["scallion", "mexican_green_onions", 0.9],
  ["scallion", "leek", 0.58],
  ["garlic", "garlic_paste", 0.82],
  ["garlic", "granulated_garlic", 0.48],
  ["garlic", "garlic_powder", 0.48],
  ["ginger", "ginger_paste", 0.86],
  ["ginger", "ground_ginger", 0.45],

  ["tomato", "roma_tomato", 0.9],
  ["tomato", "cherry_tomato", 0.78],
  ["tomato", "tomato_paste", 0.42],
  ["bell_pepper", "peppers", 0.88],
  ["bell_pepper", "roasted_red_peppers", 0.68],
  ["cucumber", "japanese_cucumber", 0.9],
  ["cucumber", "persian_cucumber", 0.9],
  ["daikon", "radish", 0.86],
  ["potato", "sweet_potato", 0.5],
  ["sweet_potato", "yam", 0.82],
  ["yam", "yam_root", 0.94],
  ["gabi", "taro_root", 0.96],
  ["chayote", "sayote", 0.98],
  ["snow_pea", "snap_peas", 0.82],
  ["green_bean", "long_beans", 0.72],
  ["pea", "snap_peas", 0.56],
  ["bok_choy", "baby_bok_choy", 0.92],
  ["bok_choy", "shanghai_bok_choy", 0.9],
  ["bok_choy", "pechay", 0.9],
  ["cabbage", "green_cabbage", 0.94],
  ["cabbage", "taiwan_cabbage", 0.86],
  ["cabbage", "napa_cabbage", 0.72],
  ["broccoli", "chinese_broccoli", 0.66],
  ["broccoli", "romanesco", 0.72],
  ["cauliflower", "romanesco", 0.78],
  ["spinach", "water_spinach", 0.62],
  ["spinach", "swiss_chard", 0.72],
  ["spinach", "collard_greens", 0.56],
  ["mustard_greens", "collard_greens", 0.68],
  ["mustard_greens", "yu_choy", 0.64],
  ["lettuce", "romaine_lettuce", 0.9],
  ["lettuce", "endive", 0.62],
  ["mushroom", "shiitake_mushroom", 0.74],
  ["mushroom", "king_oyster_mushroom", 0.68],
  ["mushroom", "enoki_mushroom", 0.55],
  ["mushroom", "wood_ear_mushroom", 0.45],
  ["pumpkin", "kabocha", 0.82],
  ["pumpkin", "kalabasa", 0.86],
  ["squash", "acorn_squash", 0.82],
  ["squash", "delicata_squash", 0.82],
  ["squash", "kabocha", 0.78],
  ["zucchini", "squash", 0.62],
  ["jalapeno_chiles", "serrano_chiles", 0.74],
  ["thai_chilies", "serrano_chiles", 0.62],
  ["habanero_chiles", "ata_rodo", 0.86],
  ["poblano_chiles", "peppers", 0.58],

  ["cilantro", "parsley", 0.7],
  ["cilantro", "ngo_gai", 0.72],
  ["cilantro", "rau_ram", 0.58],
  ["parsley", "cilantro", 0.68],
  ["basil", "thai_basil", 0.76],
  ["basil", "holy_basil", 0.68],
  ["thai_basil", "holy_basil", 0.72],
  ["oregano", "thyme", 0.64],
  ["oregano", "marjoram", 0.76],
  ["thyme", "rosemary", 0.58],
  ["mint", "basil", 0.45],
  ["bay_leaf", "bay_leaves", 0.98],

  ["milk", "evaporated_milk", 0.68],
  ["milk", "coconut_milk", 0.45],
  ["heavy_cream", "cream", 0.9],
  ["heavy_cream", "milk", 0.62],
  ["cream", "milk", 0.6],
  ["sour_cream", "plain_yogurt", 0.82],
  ["sour_cream", "yogurt", 0.76],
  ["cream_cheese", "goat_cheese", 0.55],
  ["cheddar", "cheddar_cheese", 0.98],
  ["mozzarella", "mozzarella_cheese", 0.98],
  ["parmesan", "parmesan_cheese", 0.98],
  ["butter", "unsalted_butter", 0.96],
  ["butter", "olive_oil", 0.52],
  ["butter", "oil", 0.5],

  ["rice", "jasmine_rice", 0.88],
  ["rice", "calrose_rice", 0.86],
  ["rice", "brown_rice", 0.72],
  ["rice", "sona_masoori_rice", 0.82],
  ["rice", "glutinous_rice", 0.55],
  ["noodle", "egg_noodle", 0.78],
  ["noodle", "ramen", 0.74],
  ["noodle", "udon", 0.68],
  ["noodle", "rice_noodle", 0.58],
  ["rice_noodle", "vermicelli", 0.68],
  ["pasta", "spaghetti", 0.88],
  ["bread", "sandwich_bread", 0.82],
  ["bread", "baguette", 0.72],
  ["bread_crumb", "breadcrumbs", 0.98],
  ["bread_crumb", "crackers", 0.55],
  ["flour", "maida_flour", 0.86],
  ["flour", "whole_wheat_flour", 0.62],
  ["flour", "besan_flour", 0.48],
  ["cornstarch", "flour", 0.45],

  ["oil", "vegetable_oil", 0.9],
  ["oil", "canola_oil", 0.88],
  ["oil", "sunflower_oil", 0.86],
  ["oil", "avocado_oil", 0.82],
  ["oil", "olive_oil", 0.78],
  ["oil", "peanut_oil", 0.78],
  ["sesame_oil", "toasted_sesame_oil", 0.9],
  ["soy_sauce", "soy_sauce_light", 0.9],
  ["soy_sauce", "soy_sauce_dark", 0.74],
  ["soy_sauce", "tamari", 0.9],
  ["soy_sauce", "golden_mountain_sauce", 0.72],
  ["soy_sauce_light", "thai_light_soy_sauce", 0.9],
  ["soy_sauce_dark", "thai_dark_soy_sauce", 0.9],
  ["vinegar", "white_vinegar", 0.88],
  ["vinegar", "rice_vinegar", 0.82],
  ["vinegar", "apple_cider_vinegar", 0.72],
  ["vinegar", "red_wine_vinegar", 0.72],
  ["vinegar", "balsamic_vinegar", 0.55],
  ["chicken_stock", "chicken_broth", 0.96],
  ["chicken_stock", "vegetable_stock", 0.66],
  ["beef_stock", "vegetable_stock", 0.58],
  ["sugar", "granulated_sugar", 0.96],
  ["sugar", "brown_sugar", 0.72],
  ["sugar", "honey", 0.56],
  ["sugar", "maple_syrup", 0.52],
  ["brown_sugar", "palm_sugar", 0.72],
  ["salt", "fine_salt", 0.96],
  ["salt", "kosher_salt", 0.92],
  ["black_pepper", "black_peppercorns", 0.82],
  ["black_pepper", "peppercorns", 0.78],
  ["black_pepper", "white_pepper", 0.66],
  ["cumin", "cumin_powder", 0.96],
  ["cumin", "ground_cumin", 0.96],
  ["cumin", "cumin_seeds", 0.72],
  ["coriander", "coriander_powder", 0.92],
  ["coriander", "coriander_chutney", 0.45],
  ["paprika", "sweet_paprika", 0.92],
  ["paprika", "smoked_paprika", 0.78],
  ["paprika", "cayenne_pepper", 0.44],
  ["chili_powder", "cayenne_pepper", 0.58],
  ["chili_powder", "red_pepper_flake", 0.56],
  ["red_pepper_flake", "crushed_red_pepper", 0.96],
  ["curry_block", "curry_powder", 0.7],
  ["curry_paste", "red_curry_paste", 0.72],
  ["curry_paste", "green_curry_paste", 0.68],
  ["curry_paste", "panang_curry_paste", 0.66],
  ["curry_paste", "massaman_curry_paste", 0.6],
  ["gochujang", "sriracha", 0.5],
  ["sriracha", "sambal", 0.66],
  ["sriracha", "tabasco_sauce", 0.58],
  ["doubanjiang", "gochujang", 0.45],
  ["miso", "fermented_soybean_paste_tao_jiew", 0.5],
  ["oyster_sauce", "hoisin_sauce", 0.48],
  ["fish_sauce", "fermented_fish_sauce_plara", 0.68],
  ["shaoxing_wine", "mirin", 0.52],
  ["mustard", "dijon_mustard", 0.82],
  ["mustard", "whole_grain_mustard", 0.78],
  ["mustard", "mustard_powder", 0.58],
  ["mayonnaise", "plain_yogurt", 0.48],
  ["ketchup", "tomato_paste", 0.52]
];

const genericFamilies = [
  {
    base: "chicken",
    members: [
      "chicken_breast", "boneless_skinless_chicken_breast", "chicken_breast_fillet",
      "chicken_thigh", "chicken_thigh_boneless_skinless", "chicken_drumstick",
      "chicken_leg", "chicken_leg_quarter", "chicken_quarters", "chicken_wing",
      "chicken_wing_whole", "chicken_tenderloin"
    ],
    baseToMember: 0.84,
    memberToBase: 0.68
  },
  {
    base: "beef",
    members: [
      "beef_brisket", "beef_chuck", "beef_chuck_roast", "beef_flank", "flank_steak",
      "beef_round", "beef_shank", "beef_short_rib", "short_ribs", "beef_rib",
      "beef_plate", "beef_short_plate", "beef_stew_meat", "ground_beef", "hot_pot_beef",
      "steak", "rib_eye", "ribeye_steak", "beef_strip_steak", "beef_tenderloin"
    ],
    baseToMember: 0.82,
    memberToBase: 0.68
  },
  {
    base: "pork",
    members: [
      "pork_belly", "pork_rib", "pork_spare_rib", "spare_ribs", "pork_back_rib",
      "pork_chop", "pork_loin", "pork_tenderloin", "pork_shoulder", "pork_butt",
      "pork_hock", "pork_shank", "pork_leg", "ground_pork"
    ],
    baseToMember: 0.82,
    memberToBase: 0.68
  },
  {
    base: "lamb",
    members: [
      "lamb_meat", "lamb_chops", "lamb_shank", "lamb_shoulder", "lamb_leg_butt_portion",
      "lamb_leg_shank_portion", "leg_of_lamb", "lamb_loin", "lamb_rib_rack"
    ],
    baseToMember: 0.8,
    memberToBase: 0.66
  },
  {
    base: "fish",
    members: [
      "cod", "tilapia", "swai", "pangasius", "catfish", "sea_bass", "alaskan_pollock",
      "mackerel", "salmon", "tuna", "fish_fillet", "fish_pieces", "fish_steak"
    ],
    baseToMember: 0.8,
    memberToBase: 0.65
  }
];

const symmetricGroups = [
  { items: ["ground_beef", "ground_pork", "ground_turkey"], score: 0.58 },
  { items: ["bacon", "ham", "sausage", "italian_sausage"], score: 0.52 },
  { items: ["black_beans", "kidney_beans", "pinto_beans", "navy_beans", "cannellini_beans", "great_northern_beans"], score: 0.72 },
  { items: ["lentils", "red_lentils", "brown_lentils", "orange_masoor_dal"], score: 0.72 },
  { items: ["mung_beans", "green_moong_beans", "yellow_moong_dal"], score: 0.76 },
  { items: ["chickpeas", "kala_chana"], score: 0.76 },
  { items: ["almond", "cashew", "cashew_nuts", "peanut", "walnut", "pecans"], score: 0.56 },
  { items: ["pumpkin_seeds", "sunflower_seeds", "sesame_seed", "white_sesame_seeds"], score: 0.52 },
  { items: ["quinoa", "bulgur", "barley", "farro", "millet", "couscous"], score: 0.6 },
  { items: ["cheddar", "cheddar_cheese", "gouda_cheese", "swiss_cheese"], score: 0.68 },
  { items: ["brie_cheese", "camembert_cheese"], score: 0.82 },
  { items: ["feta_cheese", "goat_cheese"], score: 0.7 },
  { items: ["lemon", "lime"], score: 0.84 },
  { items: ["orange", "mandarins", "tangerines", "tangelos"], score: 0.78 },
  { items: ["apple", "fuji_apple", "pears", "asian_pear"], score: 0.66 },
  { items: ["strawberry", "blueberry", "berries"], score: 0.62 },
  { items: ["grapefruit", "orange"], score: 0.6 },
  { items: ["mangoes", "green_mango"], score: 0.58 },
  { items: ["water_spinach", "yu_choy", "chinese_broccoli", "pea_shoots"], score: 0.58 },
  { items: ["arugula", "lettuce", "romaine_lettuce", "endive"], score: 0.58 },
  { items: ["shiitake_mushroom", "king_oyster_mushroom", "enoki_mushroom"], score: 0.55 },
  { items: ["jalapeno_chiles", "serrano_chiles", "thai_chilies", "habanero_chiles"], score: 0.5 },
  { items: ["red_curry_paste", "green_curry_paste", "panang_curry_paste", "massaman_curry_paste"], score: 0.58 },
  { items: ["olive_oil", "extra_virgin_olive_oil", "avocado_oil", "canola_oil", "vegetable_oil", "sunflower_oil", "peanut_oil"], score: 0.78 },
  { items: ["rice_vinegar", "white_vinegar", "apple_cider_vinegar", "red_wine_vinegar"], score: 0.7 },
  { items: ["cajun_seasoning", "chili_powder", "paprika", "smoked_paprika", "cayenne_pepper"], score: 0.42 },
  { items: ["thyme", "oregano", "marjoram", "rosemary"], score: 0.58 },
  { items: ["mint", "basil", "thai_basil", "shiso"], score: 0.45 }
];

export function buildIngredientSubstitutionSeedRows(ingredients) {
  const available = new Set((ingredients || []).map((item) => item.ingredient_id));
  const rows = new Map();

  const add = (ingredientId, substituteIngredientId, confidenceScore) => {
    if (!ingredientId || !substituteIngredientId || ingredientId === substituteIngredientId) return;
    if (!available.has(ingredientId) || !available.has(substituteIngredientId)) return;
    const score = Math.max(0, Math.min(1, Number(confidenceScore)));
    if (!Number.isFinite(score) || score <= 0) return;
    const key = `${ingredientId}|${substituteIngredientId}`;
    const existing = rows.get(key);
    if (!existing || existing.confidence_score < score) {
      rows.set(key, {
        ingredient_id: ingredientId,
        substitute_ingredient_id: substituteIngredientId,
        confidence_score: Number(score.toFixed(2))
      });
    }
  };

  for (const [ingredientId, substituteIngredientId, score] of directRules) {
    add(ingredientId, substituteIngredientId, score);
    add(substituteIngredientId, ingredientId, Math.max(0.35, score - 0.03));
  }

  for (const family of genericFamilies) {
    for (const member of family.members) {
      add(family.base, member, family.baseToMember);
      add(member, family.base, family.memberToBase);
    }
  }

  for (const group of symmetricGroups) {
    for (const ingredientId of group.items) {
      for (const substituteIngredientId of group.items) {
        add(ingredientId, substituteIngredientId, group.score);
      }
    }
  }

  return [...rows.values()].sort((a, b) =>
    a.ingredient_id.localeCompare(b.ingredient_id) ||
    a.substitute_ingredient_id.localeCompare(b.substitute_ingredient_id)
  );
}
