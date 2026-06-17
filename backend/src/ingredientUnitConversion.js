export const unitAliasRows = [
  alias("piece", "piece"), alias("pieces", "piece"), alias("pc", "piece"), alias("pcs", "piece"), alias("each", "piece"), alias("ea", "piece"), alias("count", "piece"), alias("ct", "piece"),
  alias("个", "piece", "zh"), alias("颗", "piece", "zh"), alias("只", "piece", "zh"), alias("根", "piece", "zh"),
  alias("whole", "whole"), alias("wholes", "whole"), alias("entire", "whole"), alias("完整", "whole", "zh"), alias("整", "whole", "zh"),
  alias("half", "half"), alias("halves", "half"), alias("1/2", "half"), alias("半", "half", "zh"),
  alias("head", "head"), alias("heads", "head"), alias("bulb", "bulb"), alias("bulbs", "bulb"), alias("头", "head", "zh"), alias("整头", "head", "zh"), alias("蒜头", "bulb", "zh"), alias("球茎", "bulb", "zh"),
  alias("clove", "clove"), alias("cloves", "clove"), alias("瓣", "clove", "zh"),
  alias("bunch", "bunch"), alias("bunches", "bunch"), alias("bundle", "bunch"), alias("把", "bunch", "zh"), alias("束", "bunch", "zh"),
  alias("fruit", "piece"), alias("fruits", "piece"), alias("berry", "piece"), alias("berries", "piece"), alias("pod", "piece"), alias("pods", "piece"),
  alias("ear", "piece"), alias("ears", "piece"), alias("stalk", "piece"), alias("stalks", "piece"), alias("stem", "piece"), alias("stems", "piece"),
  alias("spear", "piece"), alias("spears", "piece"), alias("floweret", "piece"), alias("flowerets", "piece"), alias("wedge", "piece"), alias("wedges", "piece"),
  alias("棵", "piece", "zh"), alias("株", "piece", "zh"), alias("粒", "piece", "zh"), alias("串", "bunch", "zh"), alias("穗", "piece", "zh"),
  alias("leaf", "leaf"), alias("leaves", "leaf"), alias("叶", "leaf", "zh"),
  alias("slice", "slice"), alias("slices", "slice"), alias("片", "slice", "zh"),
  alias("sprig", "sprig"), alias("sprigs", "sprig"),
  alias("stick", "stick"), alias("sticks", "stick"), alias("条", "stick", "zh"),
  alias("can", "can"), alias("cans", "can"), alias("tin", "can"), alias("tins", "can"), alias("罐", "can", "zh"),
  alias("jar", "jar"), alias("jars", "jar"), alias("玻璃罐", "jar", "zh"),
  alias("bottle", "bottle"), alias("bottles", "bottle"), alias("瓶", "bottle", "zh"),
  alias("bag", "bag"), alias("bags", "bag"), alias("袋", "bag", "zh"),
  alias("pack", "pack"), alias("packs", "pack"), alias("package", "pack"), alias("packages", "pack"), alias("pkg", "pack"), alias("pkgs", "pack"), alias("box", "pack"), alias("boxes", "pack"), alias("carton", "pack"), alias("cartons", "pack"), alias("包", "pack", "zh"), alias("盒", "pack", "zh"), alias("盒装", "pack", "zh"),
  alias("tray", "tray"), alias("trays", "tray"),
  alias("gram", "gram"), alias("grams", "gram"), alias("g", "gram"), alias("克", "gram", "zh"),
  alias("kilogram", "kg"), alias("kilograms", "kg"), alias("kg", "kg"), alias("kilo", "kg"), alias("kilos", "kg"), alias("千克", "kg", "zh"), alias("公斤", "kg", "zh"),
  alias("jin", "jin"), alias("斤", "jin", "zh"),
  alias("ounce", "oz"), alias("ounces", "oz"), alias("oz", "oz"), alias("盎司", "oz", "zh"),
  alias("pound", "lb"), alias("pounds", "lb"), alias("lb", "lb"), alias("lbs", "lb"), alias("磅", "lb", "zh"),
  alias("milliliter", "ml"), alias("milliliters", "ml"), alias("millilitre", "ml"), alias("millilitres", "ml"), alias("ml", "ml"), alias("毫升", "ml", "zh"),
  alias("liter", "l"), alias("liters", "l"), alias("litre", "l"), alias("litres", "l"), alias("l", "l"), alias("升", "l", "zh"),
  alias("cup", "cup"), alias("cups", "cup"), alias("c", "cup"), alias("杯", "cup", "zh"),
  alias("tablespoon", "tbsp"), alias("tablespoons", "tbsp"), alias("tbsp", "tbsp"), alias("tbs", "tbsp"), alias("tb", "tbsp"), alias("大勺", "tbsp", "zh"), alias("汤匙", "tbsp", "zh"),
  alias("teaspoon", "tsp"), alias("teaspoons", "tsp"), alias("tsp", "tsp"), alias("小勺", "tsp", "zh"), alias("茶匙", "tsp", "zh"),
  alias("pinch", "pinch"), alias("pinches", "pinch"), alias("少许", "pinch", "zh"),
  alias("dash", "dash"), alias("dashes", "dash"),
  alias("fluid ounce", "fl_oz"), alias("fluid ounces", "fl_oz"), alias("fl oz", "fl_oz"), alias("floz", "fl_oz")
];

const unitAliasMap = new Map(unitAliasRows.map((row) => [row.alias.toLowerCase(), row.unit]));

export const liquidIngredientIds = new Set([
  "milk", "heavy_cream", "cream", "sour_cream", "yogurt", "coconut_milk",
  "soy_sauce", "vinegar", "rice_vinegar", "white_vinegar", "balsamic_vinegar",
  "oil", "sesame_oil", "chili_oil", "olive_oil", "peanut_oil", "canola_oil",
  "fish_sauce", "oyster_sauce", "hoisin_sauce", "shaoxing_wine", "mirin",
  "chicken_stock", "beef_stock", "vegetable_stock", "sriracha", "ketchup", "mustard", "mayonnaise"
]);

export const canonicalUnitByIngredientId = {
  garlic: "clove",
  egg: "piece",
  milk: "ml",
  heavy_cream: "ml",
  cream: "ml",
  coconut_milk: "ml",
  soy_sauce: "ml",
  vinegar: "ml",
  rice_vinegar: "ml",
  white_vinegar: "ml",
  balsamic_vinegar: "ml",
  oil: "ml",
  sesame_oil: "ml",
  chili_oil: "ml",
  olive_oil: "ml",
  peanut_oil: "ml",
  canola_oil: "ml",
  fish_sauce: "ml",
  oyster_sauce: "ml",
  hoisin_sauce: "ml",
  shaoxing_wine: "ml",
  mirin: "ml",
  chicken_stock: "ml",
  beef_stock: "ml",
  vegetable_stock: "ml",
  butter: "gram"
};

export const averagePieceGrams = {
  onion: 150, carrot: 70, tomato: 123, potato: 170, sweet_potato: 130, yam: 150,
  bell_pepper: 150, cucumber: 300, zucchini: 200, eggplant: 300, broccoli: 300,
  mushroom: 18, shiitake_mushroom: 15, king_oyster_mushroom: 90, lemon: 58, lime: 67,
  apple: 182, banana: 118, orange: 131, avocado: 150, corn: 100, celery: 40,
  scallion: 15, green_onion: 15, mexican_green_onions: 18, chives: 1, cilantro: 2, parsley: 2,
  ginger: 5, napa_cabbage: 900, cabbage: 900, bok_choy: 170,
  daikon: 700, radish: 25, egg: 1, chicken_wing: 90, chicken_drumstick: 120,
  chicken_thigh: 170, chicken_breast: 200, chicken_leg: 250, tofu: 400, soft_tofu: 400
};

export const specificConversions = [
  ...rules("garlic", "clove", [
    ["clove", 1, "exact", "identity"],
    ["piece", 10, "average", "piece usually means one whole garlic bulb/head in Chinese inventory input"],
    ["head", 10, "average", "1 head garlic is about 10 cloves"],
    ["bulb", 10, "average", "1 bulb garlic is about 10 cloves"],
    ["whole", 10, "average", "1 whole garlic bulb is about 10 cloves"]
  ]),
  ...rules("onion", "gram", [["whole", 150], ["half", 75], ["piece", 150], ["cup", 160], ["slice", 15]]),
  ...rules("carrot", "gram", [["whole", 70], ["piece", 70], ["cup", 128], ["slice", 5]]),
  ...rules("egg", "piece", [["egg", 1], ["piece", 1], ["whole", 1]]),
  ...rules("milk", "ml", [["cup", 240], ["tbsp", 15], ["tsp", 5], ["ml", 1], ["l", 1000], ["fl_oz", 29.5735]]),
  ...rules("butter", "gram", [["tbsp", 14], ["tsp", 4.7], ["stick", 113], ["cup", 227], ["gram", 1], ["oz", 28.3495], ["lb", 453.592]]),
  ...liquidRules(["soy_sauce", "vinegar", "rice_vinegar", "white_vinegar", "balsamic_vinegar", "oil", "sesame_oil", "chili_oil", "olive_oil", "peanut_oil", "canola_oil"]),
  ...rules("rice", "gram", [["cup", 185], ["tbsp", 12], ["tsp", 4], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...dryPastaRules(["pasta", "spaghetti", "macaroni", "penne", "fettuccine", "linguine"]),
  ...rules("flour", "gram", [["cup", 120], ["tbsp", 8], ["tsp", 2.6], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...rules("sugar", "gram", [["cup", 200], ["tbsp", 12.5], ["tsp", 4.2], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]]),
  ...rules("salt", "gram", [["tsp", 6], ["tbsp", 18], ["pinch", 0.36], ["dash", 0.6], ["gram", 1], ["kg", 1000], ["oz", 28.3495], ["lb", 453.592], ["jin", 500]])
];

const bunchGramByIngredientId = {
  scallion: 100,
  green_onion: 100,
  mexican_green_onions: 120,
  chives: 30,
  cilantro: 50,
  cilantro_stem: 50,
  parsley: 50,
  basil_fresh: 30,
  mint: 30,
  dill: 30,
  thyme: 30,
  rosemary: 30,
  spinach: 280,
  water_spinach: 300,
  chinese_broccoli: 300,
  chrysanthemum_greens: 300,
  bok_choy: 300,
  baby_bok_choy: 250,
  asparagus: 450,
  celery: 450
};

// USDA FoodData Central SR Legacy household measures. Ratios convert the user's
// natural unit to the ingredient canonical gram unit.
const usdaNaturalConversionsByIngredientId = {
  apples: [["piece", 182, "USDA FDC SR Legacy: Apples, raw, with skin; 1 medium = 182 g"], ["whole", 182, "USDA FDC SR Legacy: Apples, raw, with skin; 1 medium = 182 g"], ["cup", 125, "USDA FDC SR Legacy: Apples, raw, with skin; 1 cup quartered/chopped = 125 g"]],
  fuji_apple: [["piece", 200, "USDA FDC SR Legacy: Apples, raw, fuji; 1 large = 200 g"], ["whole", 200, "USDA FDC SR Legacy: Apples, raw, fuji; 1 large = 200 g"], ["cup", 109, "USDA FDC SR Legacy: Apples, raw, fuji; 1 cup sliced = 109 g"]],
  apricots: [["piece", 35, "USDA FDC SR Legacy: Apricots, raw; 1 apricot = 35 g"], ["whole", 35, "USDA FDC SR Legacy: Apricots, raw; 1 apricot = 35 g"], ["cup", 155, "USDA FDC SR Legacy: Apricots, raw; 1 cup halves = 155 g"]],
  asian_pear: [["piece", 275, "USDA FDC SR Legacy: Pears, asian, raw; 1 large fruit = 275 g"], ["whole", 275, "USDA FDC SR Legacy: Pears, asian, raw; 1 large fruit = 275 g"]],
  avocados: [["piece", 201, "USDA FDC SR Legacy: Avocados, raw, all commercial varieties; 1 avocado = 201 g"], ["whole", 201, "USDA FDC SR Legacy: Avocados, raw, all commercial varieties; 1 avocado = 201 g"], ["cup", 150, "USDA FDC SR Legacy: Avocados, raw; 1 cup cubes = 150 g"]],
  bananas: [["piece", 118, "USDA FDC SR Legacy: Bananas, raw; 1 medium = 118 g"], ["whole", 118, "USDA FDC SR Legacy: Bananas, raw; 1 medium = 118 g"], ["cup", 150, "USDA FDC SR Legacy: Bananas, raw; 1 cup sliced = 150 g"]],
  saba_banana: [["piece", 118, "USDA FDC SR Legacy banana medium baseline; review cultivar/package weight when available"], ["whole", 118, "USDA FDC SR Legacy banana medium baseline; review cultivar/package weight when available"]],
  blueberries: [["cup", 148, "USDA FDC SR Legacy: Blueberries, raw; 1 cup = 148 g"], ["piece", 1.36, "USDA FDC SR Legacy: Blueberries, raw; 50 berries = 68 g"]],
  blueberry: [["cup", 148, "USDA FDC SR Legacy: Blueberries, raw; 1 cup = 148 g"], ["piece", 1.36, "USDA FDC SR Legacy: Blueberries, raw; 50 berries = 68 g"]],
  breadfruit: [["cup", 220, "USDA FDC SR Legacy: Breadfruit, raw; 1 cup = 220 g"], ["piece", 384, "USDA FDC SR Legacy: Breadfruit, raw; 1 small fruit estimated from 1/4 fruit = 96 g"]],
  cantaloupe: [["piece", 552, "USDA FDC SR Legacy: Melons, cantaloupe, raw; 1 medium melon = 552 g"], ["whole", 552, "USDA FDC SR Legacy: Melons, cantaloupe, raw; 1 medium melon = 552 g"], ["cup", 160, "USDA FDC SR Legacy: Melons, cantaloupe, raw; 1 cup cubes = 160 g"]],
  cherimoya: [["piece", 235, "USDA FDC SR Legacy: Cherimoya, raw; 1 fruit without skin/seeds = 235 g"], ["whole", 235, "USDA FDC SR Legacy: Cherimoya, raw; 1 fruit without skin/seeds = 235 g"], ["cup", 160, "USDA FDC SR Legacy: Cherimoya, raw; 1 cup pieces = 160 g"]],
  cherries: [["piece", 8.2, "USDA FDC SR Legacy: Cherries, sweet, raw; 1 cherry = 8.2 g"], ["cup", 154, "USDA FDC SR Legacy: Cherries, sweet, raw; 1 cup without pits = 154 g"]],
  coconut_shredded: [["cup", 93, "USDA FDC SR Legacy: Coconut meat, dried sweetened shredded; 1 cup = 93 g"]],
  coconuts_fresh: [["piece", 397, "USDA FDC SR Legacy: Coconut meat, raw; 1 medium = 397 g"], ["whole", 397, "USDA FDC SR Legacy: Coconut meat, raw; 1 medium = 397 g"], ["cup", 80, "USDA FDC SR Legacy: Coconut meat, raw; 1 cup shredded = 80 g"]],
  cranberries: [["cup", 100, "USDA FDC SR Legacy: Cranberries, raw; 1 cup whole = 100 g"]],
  dates: [["piece", 7.1, "USDA FDC SR Legacy: Dates, deglet noor; 1 pitted date = 7.1 g"], ["cup", 147, "USDA FDC SR Legacy: Dates, deglet noor; 1 cup chopped = 147 g"]],
  durian: [["piece", 602, "USDA FDC SR Legacy: Durian, raw or frozen; 1 fruit = 602 g"], ["whole", 602, "USDA FDC SR Legacy: Durian, raw or frozen; 1 fruit = 602 g"], ["cup", 243, "USDA FDC SR Legacy: Durian; 1 cup chopped/diced = 243 g"]],
  grapefruit: [["piece", 246, "USDA FDC SR Legacy: Grapefruit, raw; 1 whole fruit estimated from 1/2 fruit = 123 g"], ["whole", 246, "USDA FDC SR Legacy: Grapefruit, raw; 1 whole fruit estimated from 1/2 fruit = 123 g"], ["cup", 230, "USDA FDC SR Legacy: Grapefruit, raw; 1 cup sections with juice = 230 g"]],
  grapes: [["cup", 151, "USDA FDC SR Legacy: Grapes, red or green, raw; 1 cup = 151 g"], ["piece", 4.9, "USDA FDC SR Legacy: Grapes, raw; 10 grapes = 49 g"]],
  guava: [["piece", 55, "USDA FDC common raw guava medium estimate; review label weight when available"], ["whole", 55, "USDA FDC common raw guava medium estimate; review label weight when available"]],
  honeydew: [["piece", 1000, "USDA FDC SR Legacy: Honeydew, raw; 1 melon 5-1/4 in dia = 1000 g"], ["whole", 1000, "USDA FDC SR Legacy: Honeydew, raw; 1 melon 5-1/4 in dia = 1000 g"], ["cup", 170, "USDA FDC SR Legacy: Honeydew, raw; 1 cup diced = 170 g"]],
  horned_melon: [["piece", 209, "USDA FDC SR Legacy: Horned melon; 1 fruit = 209 g"], ["whole", 209, "USDA FDC SR Legacy: Horned melon; 1 fruit = 209 g"], ["cup", 233, "USDA FDC SR Legacy: Horned melon; 1 cup = 233 g"]],
  jackfruit: [["cup", 165, "USDA FDC SR Legacy: Jackfruit, raw; 1 cup sliced = 165 g"]],
  kiwi_fruit: [["piece", 69, "USDA FDC common kiwifruit medium estimate; review label weight when available"], ["whole", 69, "USDA FDC common kiwifruit medium estimate; review label weight when available"]],
  kiwis: [["piece", 69, "USDA FDC common kiwifruit medium estimate; review label weight when available"], ["whole", 69, "USDA FDC common kiwifruit medium estimate; review label weight when available"]],
  kumquats: [["piece", 19, "USDA FDC SR Legacy: Kumquats, raw; 1 fruit without refuse = 19 g"]],
  mandarins: [["piece", 88, "USDA FDC SR Legacy: Tangerines/mandarin oranges, raw; 1 medium = 88 g"], ["whole", 88, "USDA FDC SR Legacy: Tangerines/mandarin oranges, raw; 1 medium = 88 g"], ["cup", 195, "USDA FDC SR Legacy: Tangerines, raw; 1 cup sections = 195 g"]],
  mangosteen: [["cup", 196, "USDA FDC SR Legacy: Mangosteen, canned drained; 1 cup = 196 g; review fresh fruit label weight when available"]],
  melons: [["cup", 160, "USDA FDC SR Legacy melon baseline: cantaloupe cubes = 160 g/cup; use specific melon when known"]],
  passion_fruit: [["piece", 18, "USDA FDC SR Legacy: Passion-fruit, raw; 1 fruit without refuse = 18 g"], ["cup", 236, "USDA FDC SR Legacy: Passion-fruit, raw; 1 cup = 236 g"]],
  pears: [["piece", 178, "USDA FDC SR Legacy: Pears, raw; 1 medium = 178 g"], ["whole", 178, "USDA FDC SR Legacy: Pears, raw; 1 medium = 178 g"], ["cup", 140, "USDA FDC SR Legacy: Pears, raw; 1 cup slices = 140 g"]],
  peaches: [["piece", 150, "USDA FDC SR Legacy: Peaches, yellow, raw; 1 medium = 150 g"], ["whole", 150, "USDA FDC SR Legacy: Peaches, yellow, raw; 1 medium = 150 g"], ["cup", 154, "USDA FDC SR Legacy: Peaches, raw; 1 cup slices = 154 g"]],
  pineapple: [["piece", 905, "USDA FDC SR Legacy: Pineapple, raw; 1 fruit = 905 g"], ["whole", 905, "USDA FDC SR Legacy: Pineapple, raw; 1 fruit = 905 g"], ["cup", 165, "USDA FDC SR Legacy: Pineapple, raw; 1 cup chunks = 165 g"], ["slice", 84, "USDA FDC SR Legacy: Pineapple, raw; 1 smaller slice = 84 g"]],
  pomegranate: [["piece", 282, "USDA FDC SR Legacy: Pomegranates, raw; 1 pomegranate = 282 g"], ["whole", 282, "USDA FDC SR Legacy: Pomegranates, raw; 1 pomegranate = 282 g"], ["cup", 174, "USDA FDC SR Legacy: Pomegranate arils; 1 cup estimated from 1/2 cup = 87 g"]],
  pomegranates: [["piece", 282, "USDA FDC SR Legacy: Pomegranates, raw; 1 pomegranate = 282 g"], ["whole", 282, "USDA FDC SR Legacy: Pomegranates, raw; 1 pomegranate = 282 g"], ["cup", 174, "USDA FDC SR Legacy: Pomegranate arils; 1 cup estimated from 1/2 cup = 87 g"]],
  prickly_pear: [["piece", 103, "USDA FDC SR Legacy: Prickly pears, raw; 1 fruit without refuse = 103 g"], ["cup", 149, "USDA FDC SR Legacy: Prickly pears, raw; 1 cup = 149 g"]],
  raspberries: [["cup", 123, "USDA FDC SR Legacy: Raspberries, raw; 1 cup = 123 g"], ["piece", 1.9, "USDA FDC SR Legacy: Raspberries, raw; 10 raspberries = 19 g"]],
  star_fruit: [["piece", 91, "USDA FDC common starfruit medium estimate; review label weight when available"], ["whole", 91, "USDA FDC common starfruit medium estimate; review label weight when available"]],
  strawberries: [["piece", 12, "USDA FDC SR Legacy: Strawberries, raw; 1 medium = 12 g"], ["cup", 144, "USDA FDC SR Legacy: Strawberries, raw; 1 cup whole = 144 g"]],
  strawberry: [["piece", 12, "USDA FDC SR Legacy: Strawberries, raw; 1 medium = 12 g"], ["cup", 144, "USDA FDC SR Legacy: Strawberries, raw; 1 cup whole = 144 g"]],
  tangelos: [["piece", 109, "USDA FDC citrus/tangelo medium estimate; review label weight when available"], ["whole", 109, "USDA FDC citrus/tangelo medium estimate; review label weight when available"]],
  tangerines: [["piece", 88, "USDA FDC SR Legacy: Tangerines, raw; 1 medium = 88 g"], ["whole", 88, "USDA FDC SR Legacy: Tangerines, raw; 1 medium = 88 g"], ["cup", 195, "USDA FDC SR Legacy: Tangerines, raw; 1 cup sections = 195 g"]],
  watermelon: [["cup", 152, "USDA FDC SR Legacy: Watermelon, raw; 1 cup diced = 152 g"], ["piece", 286, "USDA FDC SR Legacy: Watermelon, raw; 1 wedge = 286 g"]],
  acorn_squash: [["piece", 431, "USDA FDC SR Legacy: Squash, winter, acorn, raw; 1 squash = 431 g"], ["whole", 431, "USDA FDC SR Legacy: Squash, winter, acorn, raw; 1 squash = 431 g"], ["cup", 140, "USDA FDC SR Legacy: Acorn squash, raw; 1 cup cubes = 140 g"]],
  alfalfa_sprouts: [["cup", 33, "USDA FDC SR Legacy: Alfalfa seeds, sprouted, raw; 1 cup = 33 g"], ["tbsp", 3, "USDA FDC SR Legacy: Alfalfa sprouts; 1 tbsp = 3 g"]],
  artichoke: [["piece", 128, "USDA FDC SR Legacy: Artichokes, raw; 1 medium = 128 g"], ["whole", 128, "USDA FDC SR Legacy: Artichokes, raw; 1 medium = 128 g"]],
  artichokes_whole: [["piece", 128, "USDA FDC SR Legacy: Artichokes, raw; 1 medium = 128 g"], ["whole", 128, "USDA FDC SR Legacy: Artichokes, raw; 1 medium = 128 g"]],
  arugula: [["cup", 20, "USDA FDC SR Legacy: Arugula, raw; 1 cup estimated from 1/2 cup = 10 g"], ["leaf", 2, "USDA FDC SR Legacy: Arugula, raw; 1 leaf = 2 g"]],
  baby_carrots: [["piece", 10, "USDA FDC SR Legacy: Carrots, baby, raw; 1 medium = 10 g"], ["whole", 10, "USDA FDC SR Legacy: Carrots, baby, raw; 1 medium = 10 g"]],
  bamboo_shoot: [["cup", 151, "USDA FDC SR Legacy: Bamboo shoots, raw; 1 cup slices = 151 g"]],
  bamboo_shoots: [["cup", 151, "USDA FDC SR Legacy: Bamboo shoots, raw; 1 cup slices = 151 g"]],
  basil_dried: [["tsp", 0.7, "USDA FDC SR Legacy: Dried basil leaves; 1 tsp = 0.7 g"], ["tbsp", 2.1, "USDA FDC SR Legacy: Dried basil leaves; 1 tbsp = 2.1 g"]],
  beets: [["piece", 82, "USDA FDC SR Legacy: Beets, raw; 1 beet = 82 g"], ["whole", 82, "USDA FDC SR Legacy: Beets, raw; 1 beet = 82 g"], ["cup", 136, "USDA FDC SR Legacy: Beets, raw; 1 cup = 136 g"]],
  bitter_melon: [["piece", 124, "USDA FDC SR Legacy: Balsam-pear/bitter gourd pods, raw; 1 fruit = 124 g"], ["whole", 124, "USDA FDC SR Legacy: Balsam-pear/bitter gourd pods, raw; 1 fruit = 124 g"], ["cup", 93, "USDA FDC SR Legacy: Bitter gourd pods; 1 cup pieces = 93 g"]],
  lauki: [["piece", 771, "USDA FDC SR Legacy: White-flowered gourd/calabash, raw; 1 gourd = 771 g"], ["whole", 771, "USDA FDC SR Legacy: White-flowered gourd/calabash, raw; 1 gourd = 771 g"], ["cup", 116, "USDA FDC SR Legacy: White-flowered gourd; 1/2 cup pieces = 58 g"]],
  broccoli_and_broccoli_raab_rapini: [["bunch", 608, "USDA FDC SR Legacy: Broccoli, raw; 1 bunch = 608 g"], ["cup", 91, "USDA FDC SR Legacy: Broccoli, raw; 1 cup chopped = 91 g"], ["piece", 31, "USDA FDC SR Legacy: Broccoli spear = 31 g"]],
  broccoli_sprouts: [["cup", 33, "USDA FDC alfalfa sprout baseline for small sprouts; review package label weight when available"]],
  brussels_sprout: [["piece", 19, "USDA FDC SR Legacy: Brussels sprouts, raw; 1 sprout = 19 g"], ["cup", 88, "USDA FDC SR Legacy: Brussels sprouts, raw; 1 cup = 88 g"]],
  brussels_sprouts: [["piece", 19, "USDA FDC SR Legacy: Brussels sprouts, raw; 1 sprout = 19 g"], ["cup", 88, "USDA FDC SR Legacy: Brussels sprouts, raw; 1 cup = 88 g"]],
  cassava: [["piece", 408, "USDA FDC SR Legacy: Cassava, raw; 1 root = 408 g"], ["whole", 408, "USDA FDC SR Legacy: Cassava, raw; 1 root = 408 g"], ["cup", 206, "USDA FDC SR Legacy: Cassava, raw; 1 cup = 206 g"]],
  cauliflower: [["head", 588, "USDA FDC SR Legacy: Cauliflower, raw; 1 medium head = 588 g"], ["cup", 107, "USDA FDC SR Legacy: Cauliflower, raw; 1 cup chopped = 107 g"], ["piece", 13, "USDA FDC SR Legacy: Cauliflower, raw; 1 floweret = 13 g"]],
  celeriac: [["cup", 156, "USDA FDC SR Legacy: Celeriac, raw; 1 cup = 156 g"]],
  celery_root: [["cup", 156, "USDA FDC SR Legacy celeriac baseline; review label weight when available"]],
  sayote: [["piece", 203, "USDA FDC SR Legacy: Chayote, raw; 1 chayote = 203 g"], ["whole", 203, "USDA FDC SR Legacy: Chayote, raw; 1 chayote = 203 g"], ["cup", 132, "USDA FDC SR Legacy: Chayote, raw; 1 cup pieces = 132 g"]],
  chayote: [["piece", 203, "USDA FDC SR Legacy: Chayote, raw; 1 chayote = 203 g"], ["whole", 203, "USDA FDC SR Legacy: Chayote, raw; 1 chayote = 203 g"], ["cup", 132, "USDA FDC SR Legacy: Chayote, raw; 1 cup pieces = 132 g"]],
  cherry_tomato: [["piece", 17, "USDA FDC SR Legacy: Tomatoes, raw; 1 cherry tomato = 17 g"], ["cup", 149, "USDA FDC SR Legacy: Tomatoes, raw; 1 cup cherry tomatoes = 149 g"]],
  cherry_tomatoes: [["piece", 17, "USDA FDC SR Legacy: Tomatoes, raw; 1 cherry tomato = 17 g"], ["cup", 149, "USDA FDC SR Legacy: Tomatoes, raw; 1 cup cherry tomatoes = 149 g"]],
  chervil: [["tsp", 0.6, "USDA FDC SR Legacy: Dried chervil; 1 tsp = 0.6 g"], ["tbsp", 1.9, "USDA FDC SR Legacy: Dried chervil; 1 tbsp = 1.9 g"]],
  collard_greens: [["cup", 36, "USDA FDC leafy greens baseline; review bunch/package weight when available"]],
  corn_on_the_cob: [["piece", 125, "USDA FDC SR Legacy: Corn on cob, frozen unprepared; 1 ear yields = 125 g"], ["cup", 165, "USDA FDC SR Legacy: Corn kernels; 1 cup = 165 g"]],
  cucumbers: [["piece", 301, "USDA FDC SR Legacy: Cucumber with peel, raw; 1 cucumber = 301 g"], ["whole", 301, "USDA FDC SR Legacy: Cucumber with peel, raw; 1 cucumber = 301 g"], ["cup", 104, "USDA FDC SR Legacy: Cucumber with peel, raw; 1 cup slices estimated from 1/2 cup = 52 g"], ["slice", 7, "USDA FDC SR Legacy: Cucumber peeled, raw; 1 slice = 7 g"]],
  dandelion_greens: [["cup", 55, "USDA FDC SR Legacy: Dandelion greens, raw; 1 cup chopped = 55 g"]],
  fennel: [["cup", 87, "USDA FDC SR Legacy: Fennel bulb, raw; 1 cup sliced = 87 g"], ["piece", 234, "USDA FDC fennel bulb medium estimate; review label weight when available"], ["whole", 234, "USDA FDC fennel bulb medium estimate; review label weight when available"]],
  ginger_root: [["tsp", 2, "USDA FDC SR Legacy: Ginger root, raw; 1 tsp = 2 g"], ["cup", 96, "USDA FDC SR Legacy: Ginger root, raw; 1 cup slices estimated from 1/4 cup = 24 g"], ["slice", 2.2, "USDA FDC SR Legacy: Ginger root, raw; 5 slices = 11 g"]],
  green_bean: [["cup", 100, "USDA FDC SR Legacy: Snap beans, green, raw; 1 cup 1/2 in pieces = 100 g"], ["piece", 4, "USDA FDC green bean average pod estimate; review label weight when available"]],
  habanero_chiles: [["piece", 14, "USDA FDC hot pepper small chile estimate; review chile variety when available"], ["cup", 150, "USDA FDC SR Legacy: Hot chiles, raw; 1 cup chopped estimated = 150 g"]],
  hot_peppers: [["piece", 14, "USDA FDC hot pepper small chile estimate; review chile variety when available"], ["cup", 150, "USDA FDC SR Legacy: Hot chiles, raw; 1 cup chopped estimated = 150 g"]],
  iceberg_lettuce: [["head", 539, "USDA FDC SR Legacy: Iceberg lettuce, raw; 1 medium head = 539 g"], ["cup", 72, "USDA FDC SR Legacy: Iceberg lettuce, raw; 1 cup shredded = 72 g"], ["leaf", 8, "USDA FDC SR Legacy: Iceberg lettuce, raw; 1 medium leaf = 8 g"]],
  jalapeno_chiles: [["piece", 14, "USDA FDC SR Legacy: Jalapeno pepper, raw; 1 pepper = 14 g"], ["cup", 90, "USDA FDC SR Legacy: Jalapeno pepper, raw; 1 cup sliced = 90 g"]],
  japanese_cucumber: [["piece", 301, "USDA FDC cucumber baseline; review Japanese cucumber label weight when available"], ["whole", 301, "USDA FDC cucumber baseline; review Japanese cucumber label weight when available"], ["cup", 104, "USDA FDC cucumber baseline; 1 cup slices = 104 g"]],
  japanese_sweet_potato: [["piece", 130, "USDA FDC SR Legacy: Sweet potato, raw; 1 sweet potato 5 in long = 130 g"], ["whole", 130, "USDA FDC SR Legacy: Sweet potato, raw; 1 sweet potato 5 in long = 130 g"], ["cup", 133, "USDA FDC SR Legacy: Sweet potato, raw; 1 cup cubes = 133 g"]],
  jicama: [["piece", 659, "USDA FDC SR Legacy: Yambean/jicama, raw; 1 medium = 659 g"], ["whole", 659, "USDA FDC SR Legacy: Yambean/jicama, raw; 1 medium = 659 g"], ["cup", 120, "USDA FDC SR Legacy: Jicama, raw; 1 cup slices = 120 g"], ["slice", 6, "USDA FDC SR Legacy: Jicama, raw; 1 slice = 6 g"]],
  jicama_fresh: [["piece", 659, "USDA FDC SR Legacy: Yambean/jicama, raw; 1 medium = 659 g"], ["whole", 659, "USDA FDC SR Legacy: Yambean/jicama, raw; 1 medium = 659 g"], ["cup", 120, "USDA FDC SR Legacy: Jicama, raw; 1 cup slices = 120 g"], ["slice", 6, "USDA FDC SR Legacy: Jicama, raw; 1 slice = 6 g"]],
  kale: [["cup", 21, "USDA FDC SR Legacy: Kale, raw; 1 cup = 21 g"], ["bunch", 200, "USDA FDC common bunch estimate; review package label weight when available"]],
  kimchi: [["cup", 150, "USDA FDC SR Legacy: Cabbage kimchi; 1 cup = 150 g"]],
  kohlrabi: [["cup", 135, "USDA FDC SR Legacy: Kohlrabi, raw; 1 cup = 135 g"], ["slice", 16, "USDA FDC SR Legacy: Kohlrabi, raw; 1 slice = 16 g"]],
  leek: [["piece", 89, "USDA FDC SR Legacy: Leeks, raw; 1 leek = 89 g"], ["whole", 89, "USDA FDC SR Legacy: Leeks, raw; 1 leek = 89 g"], ["cup", 89, "USDA FDC SR Legacy: Leeks, raw; 1 cup = 89 g"], ["slice", 6, "USDA FDC SR Legacy: Leeks, raw; 1 slice = 6 g"]],
  leeks: [["piece", 89, "USDA FDC SR Legacy: Leeks, raw; 1 leek = 89 g"], ["whole", 89, "USDA FDC SR Legacy: Leeks, raw; 1 leek = 89 g"], ["cup", 89, "USDA FDC SR Legacy: Leeks, raw; 1 cup = 89 g"], ["slice", 6, "USDA FDC SR Legacy: Leeks, raw; 1 slice = 6 g"]],
  lettuce: [["head", 626, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 head = 626 g"], ["cup", 47, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 cup shredded = 47 g"], ["leaf", 6, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 inner leaf = 6 g"]],
  lettuce_iceberg_romaine: [["head", 626, "USDA FDC SR Legacy: Romaine lettuce baseline; use specific lettuce if known"], ["cup", 47, "USDA FDC SR Legacy: Romaine lettuce; 1 cup shredded = 47 g"], ["leaf", 6, "USDA FDC SR Legacy: Romaine lettuce; 1 inner leaf = 6 g"]],
  lettuce_leaf_spinach: [["cup", 36, "USDA FDC leafy lettuce baseline; review package label weight when available"], ["leaf", 5, "USDA FDC leafy lettuce baseline; review variety when available"]],
  lotus_root: [["piece", 115, "USDA FDC SR Legacy: Lotus root, raw; 1 root = 115 g"], ["whole", 115, "USDA FDC SR Legacy: Lotus root, raw; 1 root = 115 g"], ["slice", 8.1, "USDA FDC SR Legacy: Lotus root, raw; 10 slices = 81 g"]],
  mushrooms: [["piece", 18, "USDA FDC SR Legacy: White mushrooms, raw; 1 medium = 18 g"], ["cup", 70, "USDA FDC SR Legacy: White mushrooms, raw; 1 cup pieces/slices = 70 g"], ["slice", 6, "USDA FDC SR Legacy: White mushrooms, raw; 1 slice = 6 g"]],
  mustard_greens: [["cup", 56, "USDA FDC SR Legacy: Mustard greens, raw; 1 cup chopped = 56 g"]],
  okra: [["piece", 11.875, "USDA FDC SR Legacy: Okra, raw; 8 pods = 95 g"], ["cup", 100, "USDA FDC SR Legacy: Okra, raw; 1 cup = 100 g"]],
  onions_spring_or_green: [["piece", 15, "USDA FDC SR Legacy: Spring onions/scallions, raw; 1 medium = 15 g"], ["whole", 15, "USDA FDC SR Legacy: Spring onions/scallions, raw; 1 medium = 15 g"], ["cup", 100, "USDA FDC SR Legacy: Spring onions/scallions; 1 cup chopped = 100 g"], ["tbsp", 6, "USDA FDC SR Legacy: Spring onions/scallions; 1 tbsp chopped = 6 g"], ["bunch", 100, "Average grocery bunch for green onions/scallions; review package label weight when available"]],
  onions_yellow_white_red_etc: [["piece", 110, "USDA FDC SR Legacy: Onions, raw; 1 medium = 110 g"], ["whole", 110, "USDA FDC SR Legacy: Onions, raw; 1 medium = 110 g"], ["cup", 160, "USDA FDC SR Legacy: Onions, raw; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC SR Legacy: Onions, raw; 1 medium slice = 14 g"]],
  parsley_fresh: [["cup", 60, "USDA FDC SR Legacy: Parsley, fresh; 1 cup chopped = 60 g"], ["tbsp", 3.8, "USDA FDC SR Legacy: Parsley, fresh; 1 tbsp = 3.8 g"], ["bunch", 50, "Average grocery bunch for parsley; review package label weight when available"]],
  pea_shoots: [["cup", 35, "USDA FDC tender leafy green baseline; review package label weight when available"], ["bunch", 100, "Average grocery bunch for pea shoots; review package label weight when available"]],
  pechay: [["piece", 170, "USDA FDC pak-choi/bok choy baseline; review variety/package weight when available"], ["bunch", 250, "Average small bunch for pechay/bok choy; review package label weight when available"]],
  peppers: [["piece", 119, "USDA FDC SR Legacy: Sweet peppers, green, raw; 1 medium = 119 g"], ["whole", 119, "USDA FDC SR Legacy: Sweet peppers, green, raw; 1 medium = 119 g"], ["cup", 149, "USDA FDC SR Legacy: Sweet peppers; 1 cup chopped = 149 g"]],
  persian_cucumber: [["piece", 120, "Average Persian cucumber; review package label weight when available"], ["whole", 120, "Average Persian cucumber; review package label weight when available"], ["cup", 104, "USDA FDC cucumber baseline; 1 cup slices = 104 g"]],
  plantains: [["piece", 179, "USDA FDC common plantain medium estimate; review label weight when available"], ["whole", 179, "USDA FDC common plantain medium estimate; review label weight when available"], ["cup", 154, "USDA FDC plantain sliced baseline; review preparation when available"]],
  potatoes: [["piece", 213, "USDA FDC SR Legacy: Potatoes, flesh and skin, raw; 1 medium potato = 213 g"], ["whole", 213, "USDA FDC SR Legacy: Potatoes, flesh and skin, raw; 1 medium potato = 213 g"], ["cup", 150, "USDA FDC SR Legacy: Potatoes, raw; 1 cup diced = 150 g"]],
  pumpkin: [["cup", 116, "USDA FDC SR Legacy winter squash raw baseline; 1 cup cubes = 116 g"], ["piece", 1000, "Conservative small pumpkin estimate; review label weight when available"]],
  pumpkins: [["cup", 116, "USDA FDC SR Legacy winter squash raw baseline; 1 cup cubes = 116 g"], ["piece", 1000, "Conservative small pumpkin estimate; review label weight when available"]],
  pumpkin_leaves: [["cup", 39, "USDA FDC SR Legacy: Pumpkin leaves, raw; 1 cup = 39 g"], ["leaf", 16, "USDA FDC sweet potato leaf baseline; review pumpkin leaf size when available"]],
  radishes: [["piece", 4.5, "USDA FDC radish medium estimate; review bunch/package weight when available"], ["cup", 116, "USDA FDC SR Legacy: Radishes, raw; 1 cup slices = 116 g"], ["slice", 1, "USDA FDC SR Legacy: Radishes, raw; 1 slice = 1 g"]],
  red_onion: [["piece", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["whole", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["cup", 160, "USDA FDC onion baseline; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC onion baseline; 1 medium slice = 14 g"]],
  red_onions: [["piece", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["whole", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["cup", 160, "USDA FDC onion baseline; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC onion baseline; 1 medium slice = 14 g"]],
  rhubarb: [["cup", 122, "USDA FDC common rhubarb diced cup estimate; review label weight when available"], ["piece", 51, "USDA FDC common rhubarb stalk estimate; review stalk size when available"]],
  roma_tomato: [["piece", 62, "USDA FDC SR Legacy: Tomatoes, raw; 1 Italian/plum tomato = 62 g"], ["whole", 62, "USDA FDC SR Legacy: Tomatoes, raw; 1 Italian/plum tomato = 62 g"], ["cup", 180, "USDA FDC SR Legacy: Tomatoes, raw; 1 cup chopped/sliced = 180 g"]],
  romaine_lettuce: [["head", 626, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 head = 626 g"], ["cup", 47, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 cup shredded = 47 g"], ["leaf", 6, "USDA FDC SR Legacy: Romaine lettuce, raw; 1 inner leaf = 6 g"]],
  romanesco: [["head", 500, "Cauliflower/romanesco head estimate; review label weight when available"], ["cup", 107, "USDA FDC cauliflower baseline; 1 cup chopped = 107 g"]],
  rutabaga: [["piece", 386, "USDA FDC common rutabaga medium estimate; review label weight when available"], ["whole", 386, "USDA FDC common rutabaga medium estimate; review label weight when available"], ["cup", 140, "USDA FDC common rutabaga cubes estimate; review preparation when available"]],
  rutabagas: [["piece", 386, "USDA FDC common rutabaga medium estimate; review label weight when available"], ["whole", 386, "USDA FDC common rutabaga medium estimate; review label weight when available"], ["cup", 140, "USDA FDC common rutabaga cubes estimate; review preparation when available"]],
  serrano_chiles: [["piece", 6.1, "USDA FDC SR Legacy: Serrano peppers, raw; 1 pepper = 6.1 g"], ["cup", 105, "USDA FDC SR Legacy: Serrano peppers; 1 cup chopped = 105 g"]],
  shallot: [["piece", 25, "USDA FDC common shallot medium estimate; review label weight when available"], ["tbsp", 10, "USDA FDC SR Legacy: Shallots, raw; 1 tbsp chopped = 10 g"]],
  snap_peas: [["piece", 4, "USDA FDC edible-pod pea baseline; review variety/package weight when available"], ["cup", 98, "USDA FDC edible-pod pea baseline; review preparation when available"]],
  snow_pea: [["piece", 4, "USDA FDC edible-pod pea baseline; review variety/package weight when available"], ["cup", 98, "USDA FDC edible-pod pea baseline; review preparation when available"]],
  spaghetti_squash_whole: [["piece", 958, "USDA FDC common spaghetti squash medium estimate; review label weight when available"], ["whole", 958, "USDA FDC common spaghetti squash medium estimate; review label weight when available"], ["cup", 101, "USDA FDC SR Legacy: Spaghetti squash, raw; 1 cup cubes = 101 g"]],
  spring_onion: [["piece", 15, "USDA FDC spring onion/scallion baseline; 1 medium = 15 g"], ["whole", 15, "USDA FDC spring onion/scallion baseline; 1 medium = 15 g"], ["cup", 100, "USDA FDC SR Legacy: Spring onions/scallions; 1 cup chopped = 100 g"], ["bunch", 100, "Average grocery bunch for spring onions; review package label weight when available"]],
  squash: [["cup", 116, "USDA FDC SR Legacy: Winter squash, raw; 1 cup cubes = 116 g"], ["piece", 431, "USDA FDC acorn/winter squash baseline; review variety when available"]],
  squash_summer_and_zucchini: [["piece", 196, "USDA FDC SR Legacy: Summer squash, raw; 1 medium = 196 g"], ["whole", 196, "USDA FDC SR Legacy: Summer squash, raw; 1 medium = 196 g"], ["cup", 113, "USDA FDC SR Legacy: Summer squash, raw; 1 cup sliced = 113 g"], ["slice", 9.9, "USDA FDC SR Legacy: Summer squash, raw; 1 slice = 9.9 g"]],
  squash_winter: [["cup", 116, "USDA FDC SR Legacy: Winter squash, raw; 1 cup cubes = 116 g"], ["piece", 431, "USDA FDC acorn/winter squash baseline; review variety when available"]],
  sunchokes: [["cup", 150, "USDA FDC SR Legacy: Jerusalem artichokes, raw; 1 cup slices = 150 g"]],
  sweet_onion: [["piece", 331, "USDA FDC SR Legacy: Sweet onions, raw; 1 onion = 331 g"], ["whole", 331, "USDA FDC SR Legacy: Sweet onions, raw; 1 onion = 331 g"]],
  swiss_chard: [["cup", 36, "USDA FDC common raw swiss chard chopped cup estimate; review bunch/package weight when available"], ["leaf", 48, "USDA FDC common swiss chard leaf estimate; review leaf size when available"]],
  thai_basil: [["bunch", 30, "Average grocery bunch for Thai basil; review package label weight when available"], ["cup", 24, "Fresh basil cup baseline; review leaf packing when available"]],
  thai_chilies: [["piece", 3, "Average Thai chile pepper; review variety/package weight when available"], ["cup", 150, "USDA FDC hot chile baseline; 1 cup chopped = 150 g"]],
  tomatillos: [["piece", 34, "USDA FDC common tomatillo medium estimate; review label weight when available"], ["whole", 34, "USDA FDC common tomatillo medium estimate; review label weight when available"], ["cup", 132, "USDA FDC common tomatillo chopped cup estimate; review preparation when available"]],
  tomatoes: [["piece", 123, "USDA FDC SR Legacy: Tomatoes, raw; 1 medium = 123 g"], ["whole", 123, "USDA FDC SR Legacy: Tomatoes, raw; 1 medium = 123 g"], ["cup", 180, "USDA FDC SR Legacy: Tomatoes, raw; 1 cup chopped/sliced = 180 g"], ["slice", 20, "USDA FDC SR Legacy: Tomatoes, raw; 1 medium slice = 20 g"]],
  turnips: [["piece", 122, "USDA FDC common turnip medium estimate; review label weight when available"], ["whole", 122, "USDA FDC common turnip medium estimate; review label weight when available"], ["cup", 130, "USDA FDC common turnip cubes estimate; review preparation when available"]],
  white_onion: [["piece", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["whole", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["cup", 160, "USDA FDC onion baseline; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC onion baseline; 1 medium slice = 14 g"]],
  white_onions: [["piece", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["whole", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["cup", 160, "USDA FDC onion baseline; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC onion baseline; 1 medium slice = 14 g"]],
  winter_melon: [["piece", 5700, "USDA FDC SR Legacy: Waxgourd/winter melon, raw; 1 waxgourd = 5700 g"], ["whole", 5700, "USDA FDC SR Legacy: Waxgourd/winter melon, raw; 1 waxgourd = 5700 g"], ["cup", 132, "USDA FDC SR Legacy: Waxgourd/winter melon, raw; 1 cup cubes = 132 g"]],
  yam_root: [["piece", 136, "USDA FDC common yam medium estimate; review label weight when available"], ["cup", 150, "USDA FDC SR Legacy: Yam, raw; 1 cup cubes = 150 g"]],
  yams_sweet_potatoes: [["piece", 130, "USDA FDC SR Legacy: Sweet potato, raw; 1 sweet potato = 130 g"], ["whole", 130, "USDA FDC SR Legacy: Sweet potato, raw; 1 sweet potato = 130 g"], ["cup", 133, "USDA FDC SR Legacy: Sweet potato, raw; 1 cup cubes = 133 g"]],
  yellow_onion: [["piece", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["whole", 110, "USDA FDC onion baseline; 1 medium = 110 g"], ["cup", 160, "USDA FDC onion baseline; 1 cup chopped = 160 g"], ["slice", 14, "USDA FDC onion baseline; 1 medium slice = 14 g"]],
  yuca_cassava: [["piece", 408, "USDA FDC SR Legacy: Cassava, raw; 1 root = 408 g"], ["whole", 408, "USDA FDC SR Legacy: Cassava, raw; 1 root = 408 g"], ["cup", 206, "USDA FDC SR Legacy: Cassava, raw; 1 cup = 206 g"]],
  zucchini_fresh_whole: [["piece", 196, "USDA FDC SR Legacy: Zucchini, raw; 1 medium = 196 g"], ["whole", 196, "USDA FDC SR Legacy: Zucchini, raw; 1 medium = 196 g"], ["cup", 124, "USDA FDC SR Legacy: Zucchini, raw; 1 cup chopped = 124 g"], ["slice", 9.9, "USDA FDC SR Legacy: Zucchini, raw; 1 slice = 9.9 g"]],
  acai: [["pack", 100, "Frozen acai puree is commonly sold as 100 g single-serve packs; review package label weight when available"]],
  applesauce_homemade: [["cup", 244, "USDA FDC applesauce baseline; 1 cup about 244 g"]],
  ata_rodo: [["piece", 10, "Market average for scotch bonnet/habanero pepper; review pepper size when available"], ["cup", 150, "USDA FDC hot chile baseline; 1 cup chopped about 150 g"]],
  bagged_greens_leaf_spinach_lettuce_etc: [["pack", 142, "Common bagged greens package is about 5 oz / 142 g; review package label weight when available"], ["cup", 36, "USDA FDC leafy lettuce/spinach baseline; review packed density when available"]],
  banana_blossom: [["piece", 500, "Market average for banana blossom; review label weight when available"], ["cup", 90, "Market average for sliced banana blossom; review preparation when available"]],
  banana_leaf: [["leaf", 10, "Market average for trimmed banana leaf sheet; review package label weight when available"], ["pack", 454, "Common frozen banana leaf package is about 1 lb / 454 g; review label weight when available"]],
  bean_sprout: [["cup", 104, "USDA FDC mung bean sprout baseline; 1 cup about 104 g"], ["pack", 454, "Common bean sprout package is about 1 lb / 454 g; review label weight when available"]],
  bean_sprouts: [["cup", 104, "USDA FDC mung bean sprout baseline; 1 cup about 104 g"], ["pack", 454, "Common bean sprout package is about 1 lb / 454 g; review label weight when available"]],
  beans_and_peas_green_fava_lima_soybean_wax_snow_sugar_snap: [["cup", 100, "USDA FDC green bean/pea pod baseline; use specific ingredient when known"]],
  berries: [["cup", 144, "USDA FDC mixed raw berry baseline; use specific berry when known"]],
  berries_blackberries_boysenberries_currant: [["cup", 144, "USDA FDC blackberry/currant-style berry baseline; use specific berry when known"]],
  berries_cherries_goose_berries_lychee: [["cup", 140, "USDA FDC small fruit/berry baseline; use specific fruit when known"]],
  buckwheat_sprouts: [["cup", 33, "Small sprout baseline from USDA FDC alfalfa sprouts; review package label weight when available"]],
  carrots_parsnips: [["cup", 128, "USDA FDC carrot cup baseline; use specific carrot/parsnip ingredient when known"], ["piece", 70, "USDA FDC carrot medium baseline; use specific ingredient when known"]],
  citrus_fruit_lemon_lime_orange_grapefruit_tangerines_clementines: [["piece", 131, "USDA FDC orange/citrus medium baseline; use specific citrus ingredient when known"], ["cup", 180, "USDA FDC citrus sections baseline; use specific citrus ingredient when known"]],
  culantro: [["bunch", 50, "Market average bunch for culantro; review package label weight when available"], ["leaf", 2, "Market average culantro leaf; review leaf size when available"]],
  ngo_gai: [["bunch", 50, "Market average bunch for culantro; review package label weight when available"], ["leaf", 2, "Market average culantro leaf; review leaf size when available"]],
  curry_leaves: [["leaf", 0.2, "Market average curry leaf; review sprig/package weight when available"], ["bunch", 25, "Market average curry leaves bunch; review package label weight when available"]],
  delicata_squash: [["piece", 400, "Market average delicata squash; review label weight when available"], ["whole", 400, "Market average delicata squash; review label weight when available"], ["cup", 116, "USDA FDC winter squash baseline; 1 cup cubes = 116 g"]],
  dragon_fruit: [["piece", 300, "Market average dragon fruit; review label weight when available"], ["whole", 300, "Market average dragon fruit; review label weight when available"], ["cup", 150, "Market average diced dragon fruit cup; review preparation when available"]],
  pitaya_dragon_fruit: [["piece", 300, "Market average dragon fruit; review label weight when available"], ["whole", 300, "Market average dragon fruit; review label weight when available"], ["cup", 150, "Market average diced dragon fruit cup; review preparation when available"]],
  drumsticks_moringa: [["piece", 30, "Market average moringa pod/drumstick; review pod size when available"], ["cup", 90, "Market average chopped moringa pods; review preparation when available"]],
  edamame_fresh: [["cup", 155, "USDA FDC cooked green soybean/edamame cup baseline; review shelled vs pod form"], ["pack", 454, "Common fresh/frozen edamame package is about 1 lb / 454 g; review label weight when available"]],
  endive: [["head", 513, "USDA FDC escarole/endive head baseline; review variety when available"], ["cup", 50, "USDA FDC chopped endive baseline; review packing density when available"]],
  enoki_mushroom: [["pack", 200, "Common enoki package is about 200 g; review package label weight when available"], ["bunch", 100, "Market average small enoki bunch; review package label weight when available"], ["cup", 64, "USDA FDC mushroom cup baseline; review mushroom variety when available"]],
  fenugreek_sprouts: [["cup", 33, "Small sprout baseline from USDA FDC alfalfa sprouts; review package label weight when available"]],
  fiddleheads: [["cup", 134, "USDA FDC fiddlehead fern baseline; 1 cup about 134 g"]],
  gabi: [["piece", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["whole", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["cup", 132, "USDA FDC taro pieces baseline; review preparation when available"]],
  taro: [["piece", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["whole", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["cup", 132, "USDA FDC taro pieces baseline; review preparation when available"]],
  taro_root: [["piece", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["whole", 227, "USDA FDC taro medium corm baseline; review label weight when available"], ["cup", 132, "USDA FDC taro pieces baseline; review preparation when available"]],
  garland_chrysanthemum: [["bunch", 300, "Market average bunch for garland chrysanthemum; review package label weight when available"], ["cup", 35, "Leafy green cup baseline; review packing density when available"]],
  green_cabbage: [["head", 900, "Average green cabbage head weight; review label weight when available"], ["cup", 89, "USDA FDC chopped cabbage cup baseline"]],
  taiwan_cabbage: [["head", 900, "Average cabbage head weight; review label weight when available"], ["cup", 89, "USDA FDC chopped cabbage cup baseline"]],
  green_mango: [["piece", 200, "Market average green mango; review label weight when available"], ["whole", 200, "Market average green mango; review label weight when available"], ["cup", 165, "USDA FDC mango cup baseline; review preparation when available"]],
  green_papaya: [["piece", 500, "Market average green papaya; review label weight when available"], ["whole", 500, "Market average green papaya; review label weight when available"], ["cup", 140, "USDA FDC papaya cup baseline; review preparation when available"]],
  greens: [["bunch", 250, "Market average bunch for leafy greens; use specific green when known"], ["cup", 36, "USDA FDC leafy green cup baseline; use specific green when known"]],
  herbs: [["bunch", 30, "Market average bunch for fresh herbs; use specific herb when known"], ["cup", 24, "Fresh herb cup baseline; use specific herb when known"]],
  kabocha: [["piece", 1000, "Market average kabocha squash; review label weight when available"], ["whole", 1000, "Market average kabocha squash; review label weight when available"], ["cup", 116, "USDA FDC winter squash baseline; 1 cup cubes = 116 g"]],
  kalabasa: [["piece", 1000, "Market average calabaza squash piece; review label weight when available"], ["whole", 1000, "Market average calabaza squash piece; review label weight when available"], ["cup", 116, "USDA FDC winter squash baseline; 1 cup cubes = 116 g"]],
  kaffir_lime_leaves: [["leaf", 0.5, "Market average kaffir lime leaf; review package label weight when available"], ["pack", 30, "Market average small herb leaf package; review package label weight when available"]],
  lemongrass: [["piece", 15, "Market average lemongrass stalk; review stalk size when available"], ["whole", 15, "Market average lemongrass stalk; review stalk size when available"], ["bunch", 100, "Market average lemongrass bunch; review package label weight when available"]],
  long_beans: [["piece", 12, "USDA FDC yardlong bean pod baseline; 1 pod = 12 g"], ["cup", 91, "USDA FDC yardlong bean cup slices = 91 g"]],
  malunggay_leaves: [["bunch", 50, "Market average moringa leaves bunch; review package label weight when available"], ["cup", 21, "Tender leafy herb cup baseline; review packing density when available"]],
  mangoes: [["piece", 207, "USDA FDC mango medium baseline; review label weight when available"], ["whole", 207, "USDA FDC mango medium baseline; review label weight when available"], ["cup", 165, "USDA FDC mango cup baseline"]],
  marinated_vegetables_in_oil: [["cup", 140, "Market average drained marinated vegetables cup; review jar label weight when available"], ["jar", 340, "Common marinated vegetable jar net weight baseline; review label weight when available"]],
  mashua: [["piece", 80, "Market average mashua tuber; review label weight when available"], ["cup", 130, "Root vegetable cup baseline; review preparation when available"]],
  ngo_om: [["bunch", 50, "Market average rice paddy herb bunch; review package label weight when available"], ["cup", 24, "Fresh herb cup baseline; review packing density when available"]],
  pandan_leaves: [["leaf", 5, "Market average pandan leaf; review package label weight when available"], ["bunch", 100, "Market average pandan leaves bunch; review package label weight when available"]],
  papaya_mango_feijoa_passionfruit_casaha_melon: [["cup", 150, "Mixed tropical fruit cup baseline; use specific fruit when known"], ["piece", 200, "Mixed tropical fruit piece baseline; use specific fruit when known"]],
  pea: [["cup", 145, "USDA FDC green peas cup baseline; review shelled/fresh form when available"]],
  peaches_nectarines_plums_pears_sapote: [["piece", 150, "USDA FDC stone fruit/pear medium baseline; use specific fruit when known"], ["cup", 154, "USDA FDC peach/stone fruit slices baseline; use specific fruit when known"]],
  poblano_chiles: [["piece", 64, "Market average poblano pepper; review pepper size when available"], ["cup", 149, "USDA FDC sweet pepper cup baseline; review preparation when available"]],
  purple_string_beans: [["piece", 4, "USDA FDC green bean pod baseline; review bean size when available"], ["cup", 100, "USDA FDC snap bean cup baseline"]],
  purslane: [["bunch", 100, "Market average purslane bunch; review package label weight when available"], ["cup", 43, "Leafy green cup baseline; review packing density when available"]],
  radicchio: [["head", 300, "Market average radicchio head; review label weight when available"], ["cup", 40, "Leafy chicory cup baseline; review packing density when available"]],
  ramps: [["piece", 15, "Market average ramp; review size when available"], ["bunch", 100, "Market average ramps bunch; review package label weight when available"]],
  rau_ram: [["bunch", 50, "Market average Vietnamese coriander bunch; review package label weight when available"], ["cup", 24, "Fresh herb cup baseline; review packing density when available"]],
  salsify: [["piece", 100, "Market average salsify root; review root size when available"], ["cup", 135, "Root vegetable cup baseline; review preparation when available"]],
  shanghai_bok_choy: [["piece", 170, "USDA FDC pak-choi/bok choy baseline; review variety weight when available"], ["bunch", 250, "Market average Shanghai bok choy bunch; review package label weight when available"]],
  shiso: [["leaf", 1, "Market average shiso leaf; review leaf size when available"], ["bunch", 30, "Market average shiso bunch; review package label weight when available"]],
  sorrel: [["bunch", 100, "Market average sorrel bunch; review package label weight when available"], ["cup", 50, "Leafy green cup baseline; review packing density when available"]],
  spaghetti_squash_cut: [["cup", 101, "USDA FDC spaghetti squash raw cup baseline"], ["piece", 250, "Market average cut squash piece; review label weight when available"]],
  sunflower_sprouts: [["cup", 33, "Small sprout baseline from USDA FDC alfalfa sprouts; review package label weight when available"], ["pack", 100, "Common sprout package baseline; review package label weight when available"]],
  surti_papdi: [["piece", 4, "Flat bean pod baseline; review pod size when available"], ["cup", 100, "Snap bean cup baseline; review preparation when available"]],
  tamarind: [["piece", 2, "Market average tamarind pod edible pulp estimate; review form/package weight when available"], ["cup", 120, "Market average tamarind pulp cup; review form/package weight when available"]],
  tindora: [["piece", 12, "Market average tindora/ivy gourd; review size when available"], ["cup", 100, "Market average sliced tindora cup; review preparation when available"]],
  toovar_lilva: [["cup", 160, "Fresh pigeon pea/lilva cup baseline; review shelled/package form when available"]],
  wood_ear_mushroom: [["cup", 35, "Wood ear mushroom cup baseline; review fresh vs dried form"], ["pack", 100, "Common fresh wood ear package baseline; review label weight when available"]],
  yu_choy: [["bunch", 300, "Market average yu choy bunch; review package label weight when available"], ["cup", 35, "Leafy green cup baseline; review preparation when available"]]
};

export function normalizeUnitAlias(unit) {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) {
    return "piece";
  }
  return unitAliasMap.get(normalized) || normalized;
}

export function canonicalUnitForIngredient(ingredient) {
  const id = String(ingredient?.ingredient_id || ingredient?.ingredientId || "").trim();
  const slug = String(ingredient?.ingredient_slug || ingredient?.ingredientSlug || ingredient?.slug || "").trim();
  const existingCanonicalUnit = String(ingredient?.canonical_unit || ingredient?.canonicalUnit || "").trim();
  const category = String(ingredient?.category || "").trim().toLowerCase();
  const lookupKeys = [slug, id].filter(Boolean);
  for (const key of lookupKeys) {
    if (canonicalUnitByIngredientId[key]) {
      return canonicalUnitByIngredientId[key];
    }
  }
  if (existingCanonicalUnit) {
    return normalizeUnitAlias(existingCanonicalUnit);
  }
  if (lookupKeys.some((key) => liquidIngredientIds.has(key))) {
    return "ml";
  }
  if (["protein", "seafood", "vegetable", "fruit", "grain", "pantry", "seasoning", "spice", "herb", "aromatic", "dairy"].includes(category)) {
    return "gram";
  }
  return "gram";
}

export function buildConversionSeedRows(ingredientRows) {
  const rows = new Map();
  const ingredientIdByLookupKey = new Map();
  for (const ingredient of ingredientRows) {
    const ingredientId = String(ingredient.ingredient_id || "").trim();
    if (!ingredientId) {
      continue;
    }
    for (const key of ingredientLookupKeys(ingredient)) {
      ingredientIdByLookupKey.set(key, ingredientId);
    }
  }

  for (const ingredient of ingredientRows) {
    const ingredientId = String(ingredient.ingredient_id || "").trim();
    if (!ingredientId) {
      continue;
    }
    const canonicalUnit = canonicalUnitForIngredient(ingredient);
    addRow(rows, conversion(ingredientId, canonicalUnit, canonicalUnit, 1, "exact", true, "canonical unit identity"));
    if (canonicalUnit === "gram") {
      for (const row of massRules(ingredientId)) addRow(rows, row);
      const average = ingredientLookupKeys(ingredient).map((key) => averagePieceGrams[key]).find(Boolean);
      if (average) {
        addRow(rows, conversion(ingredientId, "piece", "gram", average, "average", true, "average edible unit weight"));
        addRow(rows, conversion(ingredientId, "whole", "gram", average, "average", true, "average whole item weight"));
      }
      const bunchGrams = ingredientLookupKeys(ingredient).map((key) => bunchGramByIngredientId[key]).find(Boolean);
      if (bunchGrams) {
        addRow(rows, conversion(ingredientId, "bunch", "gram", bunchGrams, "average", true, "average bunch weight; use label weight when available"));
      }
      const naturalRules = ingredientLookupKeys(ingredient).map((key) => usdaNaturalConversionsByIngredientId[key]).find(Boolean);
      if (naturalRules) {
        for (const [fromUnit, ratio, notes] of naturalRules) {
          addRow(rows, conversion(ingredientId, fromUnit, "gram", ratio, "average", true, notes));
        }
      }
    }
    if (canonicalUnit === "ml") {
      for (const row of volumeRules(ingredientId)) addRow(rows, row);
    }
  }
  for (const row of specificConversions) {
    const ingredientId = ingredientIdByLookupKey.get(String(row.ingredient_id || "").trim());
    if (ingredientId) {
      addRow(rows, { ...row, ingredient_id: ingredientId });
    }
  }
  return [...rows.values()].sort((a, b) => a.ingredient_id.localeCompare(b.ingredient_id) || a.from_unit.localeCompare(b.from_unit));
}

export function normalizeIngredientQuantity(input, options = {}) {
  const rawQuantity = Number.isFinite(Number(input?.quantity)) ? Number(input.quantity) : 1;
  const rawUnit = String(input?.unit || "piece").trim() || "piece";
  const ingredientName = String(input?.ingredientName || input?.name || "").trim();
  const ingredient = options.ingredient || null;
  const ingredientId = String(ingredient?.ingredient_id || ingredient?.ingredientId || input?.ingredientId || "").trim();
  const canonicalUnit = String(ingredient?.canonical_unit || ingredient?.canonicalUnit || options.canonicalUnit || "").trim();
  const fromUnit = normalizeUnitAlias(rawUnit);
  const toUnit = canonicalUnit || canonicalUnitForIngredient(ingredient || { ingredient_id: ingredientId, category: options.category || "" });
  const conversions = Array.isArray(options.conversions) ? options.conversions : [];
  const rule = conversions.find((item) =>
    String(item.ingredient_id || item.ingredientId) === ingredientId &&
    normalizeUnitAlias(item.from_unit || item.fromUnit) === fromUnit &&
    normalizeUnitAlias(item.to_unit || item.toUnit) === toUnit
  );
  if (!ingredientId || !rule) {
    return {
      ingredientName,
      rawQuantity,
      rawUnit,
      canonicalUnit: toUnit,
      needsReview: true,
      reason: "Missing conversion rule"
    };
  }
  const conversionRatio = Number(rule.ratio);
  return {
    ingredientName,
    rawQuantity,
    rawUnit,
    canonicalQuantity: rawQuantity * conversionRatio,
    canonicalUnit: toUnit,
    conversionRatio,
    needsReview: false
  };
}

function liquidRules(ids) {
  return ids.flatMap((id) => rules(id, "ml", [["tbsp", 15], ["tsp", 5], ["cup", 240], ["ml", 1], ["l", 1000], ["fl_oz", 29.5735]]));
}

function dryPastaRules(ids) {
  return ids.flatMap((id) => rules(id, "gram", [
    ["pack", 454, "average", "dry pasta package/box is commonly about 1 lb / 454 g; prefer package label weight when available"],
    ["cup", 100, "average", "dry pasta cup weight varies by shape; use package label weight when available"],
    ["gram", 1, "exact"],
    ["kg", 1000, "exact"],
    ["oz", 28.3495, "exact"],
    ["lb", 453.592, "exact"],
    ["jin", 500, "exact"]
  ]));
}

function volumeRules(ingredientId) {
  return rules(ingredientId, "ml", [["ml", 1, "exact"], ["l", 1000, "exact"], ["cup", 240], ["tbsp", 15], ["tsp", 5], ["fl_oz", 29.5735]]);
}

function massRules(ingredientId) {
  return rules(ingredientId, "gram", [["gram", 1, "exact"], ["kg", 1000, "exact"], ["jin", 500, "exact"], ["oz", 28.3495, "exact"], ["lb", 453.592, "exact"]]);
}

function rules(ingredientId, toUnit, entries) {
  return entries.map(([fromUnit, ratio, conversionType = "average", notes = "seeded conversion"]) =>
    conversion(ingredientId, fromUnit, toUnit, ratio, conversionType, true, notes)
  );
}

function conversion(ingredientId, fromUnit, toUnit, ratio, conversionType = "average", isDefault = true, notes = "") {
  return {
    ingredient_id: ingredientId,
    from_unit: normalizeUnitAlias(fromUnit),
    to_unit: normalizeUnitAlias(toUnit),
    ratio: Number(ratio),
    conversion_type: conversionType,
    is_default: Boolean(isDefault),
    notes
  };
}

function alias(aliasText, unit, language = "en", notes = "") {
  return {
    alias: String(aliasText),
    unit: String(unit),
    language,
    notes
  };
}

function addRow(rows, row) {
  rows.set(`${row.ingredient_id}:${row.from_unit}:${row.to_unit}`, row);
}

function ingredientLookupKeys(ingredient) {
  return [
    ingredient?.ingredient_slug,
    ingredient?.ingredientSlug,
    ingredient?.slug,
    ingredient?.ingredient_id,
    ingredient?.ingredientId
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}
