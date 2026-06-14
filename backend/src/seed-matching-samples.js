import { existsSync, readFileSync } from "node:fs";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

loadEnv();

const ingredients = [
  ["egg", "egg", "protein"],
  ["tomato", "tomato", "vegetable"],
  ["scallion", "scallion", "vegetable"],
  ["salt", "salt", "pantry"],
  ["oil", "oil", "pantry"],
  ["chicken_thigh", "chicken thigh", "protein"],
  ["chicken_breast", "chicken breast", "protein"],
  ["potato", "potato", "vegetable"],
  ["curry_block", "curry block", "seasoning"],
  ["curry_powder", "curry powder", "seasoning"],
  ["carrot", "carrot", "vegetable"],
  ["cilantro", "cilantro", "herb"],
  ["parsley", "parsley", "herb"],
  ["heavy_cream", "heavy cream", "dairy"],
  ["milk", "milk", "dairy"],
  ["rice", "rice", "grain"],
  ["ground_pork", "ground pork", "protein"],
  ["ground_beef", "ground beef", "protein"],
  ["tofu", "tofu", "protein"],
  ["soft_tofu", "soft tofu", "protein"],
  ["shrimp", "shrimp", "protein"],
  ["pasta", "pasta", "grain"],
  ["spaghetti", "spaghetti", "grain"],
  ["garlic", "garlic", "aromatic"],
  ["ginger", "ginger", "aromatic"],
  ["onion", "onion", "vegetable"],
  ["bell_pepper", "bell pepper", "vegetable"],
  ["broccoli", "broccoli", "vegetable"],
  ["mushroom", "mushroom", "vegetable"],
  ["spinach", "spinach", "vegetable"],
  ["lettuce", "lettuce", "vegetable"],
  ["cucumber", "cucumber", "vegetable"],
  ["lemon", "lemon", "fruit"],
  ["lime", "lime", "fruit"],
  ["cheese", "cheese", "dairy"],
  ["butter", "butter", "dairy"],
  ["cream", "cream", "dairy"],
  ["soy_sauce", "soy sauce", "pantry"],
  ["sugar", "sugar", "pantry"],
  ["vinegar", "vinegar", "pantry"],
  ["black_pepper", "black pepper", "pantry"],
  ["sesame_oil", "sesame oil", "pantry"],
  ["chili_oil", "chili oil", "pantry"],
  ["doubanjiang", "doubanjiang", "pantry"],
  ["chicken", "chicken", "protein"],
  ["chicken_wing", "chicken wing", "protein"],
  ["chicken_drumstick", "chicken drumstick", "protein"],
  ["pork", "pork", "protein"],
  ["pork_belly", "pork belly", "protein"],
  ["pork_rib", "pork rib", "protein"],
  ["pork_tenderloin", "pork tenderloin", "protein"],
  ["beef", "beef", "protein"],
  ["beef_brisket", "beef brisket", "protein"],
  ["beef_shank", "beef shank", "protein"],
  ["steak", "steak", "protein"],
  ["lamb", "lamb", "protein"],
  ["fish", "fish", "protein"],
  ["salmon", "salmon", "protein"],
  ["cod", "cod", "protein"],
  ["tilapia", "tilapia", "protein"],
  ["tuna", "tuna", "protein"],
  ["bacon", "bacon", "protein"],
  ["sausage", "sausage", "protein"],
  ["ham", "ham", "protein"],
  ["turkey", "turkey", "protein"],
  ["duck", "duck", "protein"],
  ["crab", "crab", "protein"],
  ["lobster", "lobster", "protein"],
  ["clam", "clam", "protein"],
  ["mussel", "mussel", "protein"],
  ["squid", "squid", "protein"],
  ["scallop", "scallop", "protein"],
  ["napa_cabbage", "napa cabbage", "vegetable"],
  ["bok_choy", "bok choy", "vegetable"],
  ["cabbage", "cabbage", "vegetable"],
  ["chinese_broccoli", "Chinese broccoli", "vegetable"],
  ["snow_pea", "snow pea", "vegetable"],
  ["green_bean", "green bean", "vegetable"],
  ["bean_sprout", "bean sprout", "vegetable"],
  ["eggplant", "eggplant", "vegetable"],
  ["zucchini", "zucchini", "vegetable"],
  ["asparagus", "asparagus", "vegetable"],
  ["celery", "celery", "vegetable"],
  ["corn", "corn", "vegetable"],
  ["pea", "pea", "vegetable"],
  ["radish", "radish", "vegetable"],
  ["daikon", "daikon", "vegetable"],
  ["lotus_root", "lotus root", "vegetable"],
  ["bamboo_shoot", "bamboo shoot", "vegetable"],
  ["wood_ear_mushroom", "wood ear mushroom", "vegetable"],
  ["shiitake_mushroom", "shiitake mushroom", "vegetable"],
  ["enoki_mushroom", "enoki mushroom", "vegetable"],
  ["king_oyster_mushroom", "king oyster mushroom", "vegetable"],
  ["sweet_potato", "sweet potato", "vegetable"],
  ["yam", "yam", "vegetable"],
  ["pumpkin", "pumpkin", "vegetable"],
  ["kabocha", "kabocha squash", "vegetable"],
  ["winter_melon", "winter melon", "vegetable"],
  ["bitter_melon", "bitter melon", "vegetable"],
  ["okra", "okra", "vegetable"],
  ["cilantro_stem", "cilantro stem", "herb"],
  ["basil", "basil", "herb"],
  ["thai_basil", "Thai basil", "herb"],
  ["mint", "mint", "herb"],
  ["dill", "dill", "herb"],
  ["rosemary", "rosemary", "herb"],
  ["thyme", "thyme", "herb"],
  ["oregano", "oregano", "herb"],
  ["bay_leaf", "bay leaf", "herb"],
  ["apple", "apple", "fruit"],
  ["banana", "banana", "fruit"],
  ["orange", "orange", "fruit"],
  ["strawberry", "strawberry", "fruit"],
  ["blueberry", "blueberry", "fruit"],
  ["avocado", "avocado", "fruit"],
  ["flour", "flour", "grain"],
  ["bread", "bread", "grain"],
  ["noodle", "noodle", "grain"],
  ["ramen", "ramen", "grain"],
  ["udon", "udon", "grain"],
  ["rice_noodle", "rice noodle", "grain"],
  ["vermicelli", "vermicelli", "grain"],
  ["oat", "oat", "grain"],
  ["quinoa", "quinoa", "grain"],
  ["cornstarch", "cornstarch", "pantry"],
  ["baking_soda", "baking soda", "pantry"],
  ["baking_powder", "baking powder", "pantry"],
  ["bread_crumb", "bread crumb", "pantry"],
  ["egg_noodle", "egg noodle", "grain"],
  ["cream_cheese", "cream cheese", "dairy"],
  ["sour_cream", "sour cream", "dairy"],
  ["yogurt", "yogurt", "dairy"],
  ["mozzarella", "mozzarella", "dairy"],
  ["parmesan", "parmesan", "dairy"],
  ["cheddar", "cheddar", "dairy"],
  ["mayonnaise", "mayonnaise", "pantry"],
  ["ketchup", "ketchup", "pantry"],
  ["mustard", "mustard", "pantry"],
  ["oyster_sauce", "oyster sauce", "pantry"],
  ["hoisin_sauce", "hoisin sauce", "pantry"],
  ["fish_sauce", "fish sauce", "pantry"],
  ["shaoxing_wine", "Shaoxing wine", "pantry"],
  ["mirin", "mirin", "pantry"],
  ["rice_vinegar", "rice vinegar", "pantry"],
  ["white_vinegar", "white vinegar", "pantry"],
  ["balsamic_vinegar", "balsamic vinegar", "pantry"],
  ["olive_oil", "olive oil", "pantry"],
  ["peanut_oil", "peanut oil", "pantry"],
  ["canola_oil", "canola oil", "pantry"],
  ["coconut_milk", "coconut milk", "pantry"],
  ["tomato_paste", "tomato paste", "pantry"],
  ["chicken_stock", "chicken stock", "pantry"],
  ["beef_stock", "beef stock", "pantry"],
  ["vegetable_stock", "vegetable stock", "pantry"],
  ["miso", "miso", "pantry"],
  ["gochujang", "gochujang", "pantry"],
  ["sriracha", "sriracha", "pantry"],
  ["chili_crisp", "chili crisp", "pantry"],
  ["five_spice", "five spice", "pantry"],
  ["star_anise", "star anise", "pantry"],
  ["cinnamon", "cinnamon", "pantry"],
  ["cumin", "cumin", "pantry"],
  ["paprika", "paprika", "pantry"],
  ["turmeric", "turmeric", "pantry"],
  ["curry_paste", "curry paste", "pantry"],
  ["red_pepper_flake", "red pepper flake", "pantry"],
  ["chili_powder", "chili powder", "pantry"],
  ["white_pepper", "white pepper", "pantry"],
  ["sichuan_peppercorn", "Sichuan peppercorn", "pantry"],
  ["sesame_seed", "sesame seed", "pantry"],
  ["peanut", "peanut", "pantry"],
  ["almond", "almond", "pantry"],
  ["walnut", "walnut", "pantry"],
  ["cashew", "cashew", "pantry"],
  ["honey", "honey", "pantry"],
  ["maple_syrup", "maple syrup", "pantry"]
];

const aliases = [
  ["egg", "egg"], ["eggs", "egg"], ["鸡蛋", "egg"], ["蛋", "egg"], ["鸡子", "egg"],
  ["tomatoes", "tomato"], ["番茄", "tomato"], ["西红柿", "tomato"],
  ["green onion", "scallion"], ["spring onion", "scallion"], ["葱", "scallion"], ["小葱", "scallion"], ["青葱", "scallion"], ["香葱", "scallion"],
  ["salt", "salt"], ["盐", "salt"], ["食盐", "salt"],
  ["oil", "oil"], ["油", "oil"], ["食用油", "oil"], ["植物油", "oil"],
  ["chicken thighs", "chicken_thigh"], ["鸡腿", "chicken_thigh"], ["鸡腿肉", "chicken_thigh"], ["去骨鸡腿", "chicken_thigh"],
  ["chicken breasts", "chicken_breast"], ["boneless chicken breast", "chicken_breast"], ["鸡胸", "chicken_breast"], ["鸡胸肉", "chicken_breast"], ["鸡脯肉", "chicken_breast"],
  ["potatoes", "potato"], ["土豆", "potato"], ["马铃薯", "potato"],
  ["咖喱块", "curry_block"], ["咖喱粉", "curry_powder"],
  ["carrots", "carrot"], ["胡萝卜", "carrot"], ["红萝卜", "carrot"],
  ["香菜", "cilantro"], ["芫荽", "cilantro"], ["欧芹", "parsley"],
  ["heavy whipping cream", "heavy_cream"], ["淡奶油", "heavy_cream"], ["重奶油", "heavy_cream"],
  ["牛奶", "milk"],
  ["米饭", "rice"], ["大米", "rice"],
  ["猪肉末", "ground_pork"], ["猪绞肉", "ground_pork"], ["牛肉末", "ground_beef"], ["牛绞肉", "ground_beef"],
  ["豆腐", "tofu"], ["嫩豆腐", "soft_tofu"],
  ["prawn", "shrimp"], ["虾", "shrimp"], ["虾仁", "shrimp"],
  ["意面", "pasta"], ["意大利面", "pasta"], ["spaghettini", "spaghetti"], ["意粉", "spaghetti"],
  ["蒜", "garlic"], ["大蒜", "garlic"], ["蒜瓣", "garlic"],
  ["姜", "ginger"], ["生姜", "ginger"],
  ["shallot", "onion"], ["洋葱", "onion"],
  ["capsicum", "bell_pepper"], ["sweet pepper", "bell_pepper"], ["彩椒", "bell_pepper"], ["甜椒", "bell_pepper"], ["青椒", "bell_pepper"],
  ["西兰花", "broccoli"], ["花椰菜", "broccoli"],
  ["button mushroom", "mushroom"], ["蘑菇", "mushroom"], ["口蘑", "mushroom"],
  ["baby spinach", "spinach"], ["菠菜", "spinach"],
  ["romaine", "lettuce"], ["生菜", "lettuce"],
  ["黄瓜", "cucumber"], ["青瓜", "cucumber"],
  ["柠檬", "lemon"], ["青柠", "lime"],
  ["芝士", "cheese"], ["奶酪", "cheese"],
  ["黄油", "butter"], ["牛油", "butter"],
  ["奶油", "cream"],
  ["light soy sauce", "soy_sauce"], ["酱油", "soy_sauce"], ["生抽", "soy_sauce"], ["老抽", "soy_sauce"],
  ["糖", "sugar"], ["白糖", "sugar"],
  ["醋", "vinegar"],
  ["黑胡椒", "black_pepper"], ["黑椒", "black_pepper"],
  ["香油", "sesame_oil"], ["芝麻油", "sesame_oil"],
  ["辣椒油", "chili_oil"], ["红油", "chili_oil"],
  ["豆瓣酱", "doubanjiang"], ["郫县豆瓣酱", "doubanjiang"],
  ["whole chicken", "chicken"], ["chicken meat", "chicken"], ["鸡", "chicken"], ["鸡肉", "chicken"], ["整鸡", "chicken"],
  ["wings", "chicken_wing"], ["chicken wings", "chicken_wing"], ["鸡翅", "chicken_wing"], ["鸡翼", "chicken_wing"], ["翅中", "chicken_wing"],
  ["drumsticks", "chicken_drumstick"], ["chicken legs", "chicken_drumstick"], ["鸡小腿", "chicken_drumstick"], ["鸡腿根", "chicken_drumstick"], ["琵琶腿", "chicken_drumstick"],
  ["pork meat", "pork"], ["猪肉", "pork"], ["猪", "pork"],
  ["五花肉", "pork_belly"], ["三层肉", "pork_belly"], ["pork side", "pork_belly"], ["streaky pork", "pork_belly"],
  ["ribs", "pork_rib"], ["pork ribs", "pork_rib"], ["排骨", "pork_rib"], ["猪肋排", "pork_rib"], ["小排", "pork_rib"],
  ["pork loin", "pork_tenderloin"], ["里脊肉", "pork_tenderloin"], ["猪里脊", "pork_tenderloin"],
  ["牛肉", "beef"], ["beef meat", "beef"],
  ["牛腩", "beef_brisket"], ["brisket", "beef_brisket"],
  ["牛腱", "beef_shank"], ["牛腱子", "beef_shank"], ["shank", "beef_shank"],
  ["ribeye", "steak"], ["sirloin", "steak"], ["牛排", "steak"], ["西冷", "steak"], ["肉眼", "steak"],
  ["羊肉", "lamb"], ["羊排", "lamb"],
  ["鱼", "fish"], ["鱼肉", "fish"], ["fillet", "fish"], ["fish fillet", "fish"],
  ["三文鱼", "salmon"], ["鲑鱼", "salmon"],
  ["鳕鱼", "cod"],
  ["罗非鱼", "tilapia"],
  ["金枪鱼", "tuna"], ["吞拿鱼", "tuna"],
  ["培根", "bacon"],
  ["香肠", "sausage"], ["腊肠", "sausage"],
  ["火腿", "ham"],
  ["turkey breast", "turkey"], ["火鸡", "turkey"],
  ["鸭", "duck"], ["鸭肉", "duck"],
  ["螃蟹", "crab"], ["蟹", "crab"],
  ["龙虾", "lobster"],
  ["蛤蜊", "clam"], ["花蛤", "clam"], ["蚬子", "clam"],
  ["青口", "mussel"], ["淡菜", "mussel"],
  ["鱿鱼", "squid"], ["乌贼", "squid"],
  ["扇贝", "scallop"], ["带子", "scallop"],
  ["Chinese cabbage", "napa_cabbage"], ["celery cabbage", "napa_cabbage"], ["wombok", "napa_cabbage"], ["won bok", "napa_cabbage"], ["大白菜", "napa_cabbage"], ["娃娃菜", "napa_cabbage"], ["绍菜", "napa_cabbage"], ["黄芽白", "napa_cabbage"],
  ["pak choi", "bok_choy"], ["pak choy", "bok_choy"], ["bok choi", "bok_choy"], ["baby bok choy", "bok_choy"], ["小白菜", "bok_choy"], ["青菜", "bok_choy"], ["上海青", "bok_choy"], ["油菜", "bok_choy"],
  ["卷心菜", "cabbage"], ["包菜", "cabbage"], ["圆白菜", "cabbage"], ["高丽菜", "cabbage"],
  ["gai lan", "chinese_broccoli"], ["kai lan", "chinese_broccoli"], ["芥兰", "chinese_broccoli"], ["芥蓝", "chinese_broccoli"],
  ["snow peas", "snow_pea"], ["荷兰豆", "snow_pea"],
  ["string bean", "green_bean"], ["green beans", "green_bean"], ["四季豆", "green_bean"], ["豆角", "green_bean"],
  ["bean sprouts", "bean_sprout"], ["豆芽", "bean_sprout"], ["绿豆芽", "bean_sprout"], ["黄豆芽", "bean_sprout"],
  ["aubergine", "eggplant"], ["茄子", "eggplant"],
  ["courgette", "zucchini"], ["西葫芦", "zucchini"], ["夏南瓜", "zucchini"],
  ["芦笋", "asparagus"],
  ["芹菜", "celery"], ["西芹", "celery"],
  ["玉米", "corn"], ["corn kernels", "corn"],
  ["peas", "pea"], ["豌豆", "pea"], ["青豆", "pea"],
  ["萝卜", "radish"], ["radishes", "radish"],
  ["white radish", "daikon"], ["白萝卜", "daikon"], ["大根", "daikon"],
  ["莲藕", "lotus_root"], ["藕", "lotus_root"],
  ["bamboo shoots", "bamboo_shoot"], ["笋", "bamboo_shoot"], ["竹笋", "bamboo_shoot"], ["冬笋", "bamboo_shoot"],
  ["wood ear", "wood_ear_mushroom"], ["black fungus", "wood_ear_mushroom"], ["木耳", "wood_ear_mushroom"], ["黑木耳", "wood_ear_mushroom"],
  ["shiitake", "shiitake_mushroom"], ["shitake", "shiitake_mushroom"], ["香菇", "shiitake_mushroom"], ["冬菇", "shiitake_mushroom"],
  ["enoki", "enoki_mushroom"], ["金针菇", "enoki_mushroom"],
  ["king oyster", "king_oyster_mushroom"], ["杏鲍菇", "king_oyster_mushroom"],
  ["sweet potatoes", "sweet_potato"], ["红薯", "sweet_potato"], ["地瓜", "sweet_potato"],
  ["山药", "yam"], ["淮山", "yam"],
  ["南瓜", "pumpkin"],
  ["Japanese pumpkin", "kabocha"], ["贝贝南瓜", "kabocha"],
  ["冬瓜", "winter_melon"],
  ["苦瓜", "bitter_melon"], ["凉瓜", "bitter_melon"],
  ["秋葵", "okra"],
  ["香菜梗", "cilantro_stem"],
  ["罗勒", "basil"], ["九层塔", "thai_basil"], ["thai basil leaves", "thai_basil"],
  ["薄荷", "mint"], ["mint leaves", "mint"],
  ["莳萝", "dill"],
  ["迷迭香", "rosemary"],
  ["百里香", "thyme"],
  ["牛至", "oregano"], ["oregano leaves", "oregano"],
  ["bay leaves", "bay_leaf"], ["香叶", "bay_leaf"], ["月桂叶", "bay_leaf"],
  ["苹果", "apple"], ["apples", "apple"],
  ["香蕉", "banana"], ["bananas", "banana"],
  ["橙子", "orange"], ["橙", "orange"],
  ["草莓", "strawberry"], ["strawberries", "strawberry"],
  ["蓝莓", "blueberry"], ["blueberries", "blueberry"],
  ["牛油果", "avocado"], ["鳄梨", "avocado"],
  ["面粉", "flour"], ["all purpose flour", "flour"], ["plain flour", "flour"],
  ["面包", "bread"], ["toast", "bread"],
  ["面条", "noodle"], ["面", "noodle"], ["noodles", "noodle"],
  ["拉面", "ramen"],
  ["乌冬", "udon"], ["乌冬面", "udon"],
  ["rice noodles", "rice_noodle"], ["米粉", "rice_noodle"], ["河粉", "rice_noodle"],
  ["粉丝", "vermicelli"], ["米线", "vermicelli"],
  ["oats", "oat"], ["燕麦", "oat"],
  ["藜麦", "quinoa"],
  ["corn starch", "cornstarch"], ["玉米淀粉", "cornstarch"], ["生粉", "cornstarch"], ["淀粉", "cornstarch"],
  ["小苏打", "baking_soda"],
  ["泡打粉", "baking_powder"],
  ["breadcrumbs", "bread_crumb"], ["面包糠", "bread_crumb"],
  ["鸡蛋面", "egg_noodle"],
  ["cream cheese spread", "cream_cheese"], ["奶油奶酪", "cream_cheese"],
  ["酸奶油", "sour_cream"],
  ["酸奶", "yogurt"], ["优格", "yogurt"],
  ["马苏里拉", "mozzarella"],
  ["帕玛森", "parmesan"], ["parmesan cheese", "parmesan"],
  ["cheddar cheese", "cheddar"], ["切达", "cheddar"],
  ["mayo", "mayonnaise"], ["蛋黄酱", "mayonnaise"], ["美乃滋", "mayonnaise"],
  ["番茄酱", "ketchup"],
  ["芥末酱", "mustard"], ["黄芥末", "mustard"],
  ["蚝油", "oyster_sauce"], ["蠔油", "oyster_sauce"],
  ["海鲜酱", "hoisin_sauce"],
  ["鱼露", "fish_sauce"],
  ["绍兴酒", "shaoxing_wine"], ["料酒", "shaoxing_wine"], ["黄酒", "shaoxing_wine"], ["Chinese cooking wine", "shaoxing_wine"],
  ["味醂", "mirin"],
  ["rice wine vinegar", "rice_vinegar"], ["米醋", "rice_vinegar"],
  ["白醋", "white_vinegar"],
  ["balsamic", "balsamic_vinegar"], ["意大利黑醋", "balsamic_vinegar"],
  ["橄榄油", "olive_oil"], ["extra virgin olive oil", "olive_oil"],
  ["花生油", "peanut_oil"],
  ["菜籽油", "canola_oil"],
  ["椰奶", "coconut_milk"], ["coconut cream", "coconut_milk"],
  ["tomato puree", "tomato_paste"], ["番茄膏", "tomato_paste"],
  ["chicken broth", "chicken_stock"], ["鸡汤", "chicken_stock"], ["鸡高汤", "chicken_stock"],
  ["beef broth", "beef_stock"], ["牛肉汤", "beef_stock"], ["牛高汤", "beef_stock"],
  ["vegetable broth", "vegetable_stock"], ["蔬菜高汤", "vegetable_stock"],
  ["味噌", "miso"],
  ["韩式辣酱", "gochujang"],
  ["是拉差", "sriracha"],
  ["油泼辣子", "chili_crisp"], ["老干妈", "chili_crisp"], ["辣椒脆", "chili_crisp"],
  ["five spice powder", "five_spice"], ["五香粉", "five_spice"],
  ["八角", "star_anise"], ["大料", "star_anise"],
  ["肉桂", "cinnamon"], ["桂皮", "cinnamon"],
  ["孜然", "cumin"],
  ["甜椒粉", "paprika"], ["红椒粉", "paprika"],
  ["姜黄", "turmeric"], ["黄姜粉", "turmeric"],
  ["red curry paste", "curry_paste"], ["green curry paste", "curry_paste"], ["咖喱酱", "curry_paste"],
  ["crushed red pepper", "red_pepper_flake"], ["辣椒碎", "red_pepper_flake"],
  ["辣椒粉", "chili_powder"],
  ["白胡椒", "white_pepper"], ["白胡椒粉", "white_pepper"],
  ["Szechuan peppercorn", "sichuan_peppercorn"], ["花椒", "sichuan_peppercorn"], ["藤椒", "sichuan_peppercorn"],
  ["sesame seeds", "sesame_seed"], ["芝麻", "sesame_seed"], ["白芝麻", "sesame_seed"], ["黑芝麻", "sesame_seed"],
  ["peanuts", "peanut"], ["花生", "peanut"],
  ["almonds", "almond"], ["杏仁", "almond"],
  ["walnuts", "walnut"], ["核桃", "walnut"],
  ["cashews", "cashew"], ["腰果", "cashew"],
  ["蜂蜜", "honey"],
  ["枫糖浆", "maple_syrup"]
];

const substitutions = [
  ["chicken_thigh", "chicken_breast", 0.8],
  ["curry_block", "curry_powder", 0.7],
  ["cilantro", "parsley", 0.7],
  ["heavy_cream", "milk", 0.6],
  ["ground_pork", "ground_beef", 0.75],
  ["soft_tofu", "tofu", 0.85],
  ["spaghetti", "pasta", 0.9],
  ["lime", "lemon", 0.8],
  ["cream", "milk", 0.55],
  ["butter", "oil", 0.6],
  ["broccoli", "spinach", 0.5],
  ["shrimp", "chicken_breast", 0.45],
  ["chicken_breast", "chicken", 0.85],
  ["chicken_thigh", "chicken", 0.85],
  ["chicken_wing", "chicken", 0.75],
  ["chicken_drumstick", "chicken", 0.8],
  ["pork_belly", "pork", 0.8],
  ["pork_tenderloin", "pork", 0.75],
  ["pork_rib", "pork", 0.65],
  ["ground_beef", "beef", 0.75],
  ["beef_brisket", "beef", 0.75],
  ["beef_shank", "beef", 0.7],
  ["steak", "beef", 0.75],
  ["salmon", "fish", 0.65],
  ["cod", "fish", 0.65],
  ["tilapia", "fish", 0.65],
  ["tuna", "fish", 0.6],
  ["scallion", "onion", 0.55],
  ["onion", "scallion", 0.45],
  ["napa_cabbage", "cabbage", 0.75],
  ["bok_choy", "napa_cabbage", 0.6],
  ["bok_choy", "spinach", 0.55],
  ["chinese_broccoli", "broccoli", 0.75],
  ["shiitake_mushroom", "mushroom", 0.8],
  ["enoki_mushroom", "mushroom", 0.6],
  ["king_oyster_mushroom", "mushroom", 0.65],
  ["rice_vinegar", "vinegar", 0.85],
  ["white_vinegar", "vinegar", 0.8],
  ["olive_oil", "oil", 0.8],
  ["peanut_oil", "oil", 0.8],
  ["canola_oil", "oil", 0.8],
  ["oyster_sauce", "soy_sauce", 0.55],
  ["shaoxing_wine", "mirin", 0.45],
  ["chicken_stock", "vegetable_stock", 0.7],
  ["beef_stock", "vegetable_stock", 0.65],
  ["cream_cheese", "cheese", 0.7],
  ["mozzarella", "cheese", 0.75],
  ["parmesan", "cheese", 0.75],
  ["cheddar", "cheese", 0.75],
  ["rice_noodle", "noodle", 0.8],
  ["egg_noodle", "noodle", 0.8],
  ["ramen", "noodle", 0.75],
  ["udon", "noodle", 0.75],
  ["sweet_potato", "potato", 0.55]
];

const recipes = [
  recipe("tomato_egg", "番茄炒蛋", 15, 10, "easy", 0.6, 0.8, [
    main("egg", 2, "piece"),
    main("tomato", 2, "piece"),
    optional("scallion", 1, "stalk"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("chicken_curry", "Chicken Curry", 45, 20, "medium", 0.9, 0.5, [
    main("chicken_thigh", 1, "lb"),
    main("potato", 2, "piece"),
    main("curry_block", 1, "pack"),
    optional("carrot", 1, "piece"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("mapo_tofu", "麻婆豆腐", 25, 18, "medium", 0.8, 0.5, [
    main("soft_tofu", 1, "box"),
    main("ground_pork", 0.5, "lb"),
    optional("scallion", 1, "stalk"),
    pantry("doubanjiang", 2, "tbsp"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("garlic_shrimp_pasta", "Garlic Shrimp Pasta", 30, 20, "medium", 0.4, 0.5, [
    main("shrimp", 0.75, "lb"),
    main("spaghetti", 8, "oz"),
    main("garlic", 3, "clove"),
    optional("lemon", 0.5, "piece"),
    pantry("butter", 2, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ]),
  recipe("chicken_broccoli_stir_fry", "Chicken Broccoli Stir Fry", 25, 20, "easy", 0.7, 0.6, [
    main("chicken_breast", 1, "lb"),
    main("broccoli", 2, "cup"),
    optional("garlic", 2, "clove"),
    pantry("soy_sauce", 2, "tbsp"),
    pantry("oil", 1, "tbsp"),
    pantry("sugar", 1, "tsp")
  ]),
  recipe("fried_rice", "Egg Fried Rice", 20, 15, "easy", 0.9, 0.7, [
    main("rice", 2, "cup"),
    main("egg", 2, "piece"),
    optional("scallion", 1, "stalk"),
    optional("carrot", 0.5, "cup"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("creamy_mushroom_pasta", "Creamy Mushroom Pasta", 35, 25, "medium", 0.5, 0.4, [
    main("pasta", 8, "oz"),
    main("mushroom", 2, "cup"),
    main("cream", 0.5, "cup"),
    optional("garlic", 2, "clove"),
    pantry("butter", 1, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ]),
  recipe("tofu_vegetable_bowl", "Tofu Vegetable Bowl", 30, 20, "easy", 0.8, 0.6, [
    main("tofu", 1, "box"),
    main("rice", 1, "cup"),
    optional("spinach", 1, "cup"),
    optional("mushroom", 1, "cup"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("sesame_oil", 1, "tsp")
  ]),
  recipe("cucumber_salad", "拍黄瓜", 10, 10, "easy", 0.3, 0.9, [
    main("cucumber", 1, "piece"),
    optional("garlic", 1, "clove"),
    pantry("vinegar", 1, "tbsp"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("sugar", 1, "tsp"),
    pantry("chili_oil", 1, "tsp")
  ]),
  recipe("beef_taco_bowl", "Beef Taco Bowl", 30, 22, "easy", 0.8, 0.5, [
    main("ground_beef", 1, "lb"),
    main("rice", 1, "cup"),
    optional("tomato", 1, "piece"),
    optional("lettuce", 1, "cup"),
    optional("cheese", 0.5, "cup"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("tomato_tofu_soup", "番茄豆腐汤", 25, 15, "easy", 0.6, 0.8, [
    main("tomato", 2, "piece"),
    main("tofu", 1, "box"),
    optional("egg", 1, "piece"),
    optional("scallion", 1, "stalk"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tsp")
  ]),
  recipe("lemon_parsley_chicken", "Lemon Parsley Chicken", 35, 15, "easy", 0.7, 0.7, [
    main("chicken_breast", 1, "lb"),
    main("lemon", 1, "piece"),
    optional("parsley", 0.25, "cup"),
    optional("garlic", 2, "clove"),
    pantry("oil", 1, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ])
];

await bootstrapSchema();
await seedRuleData();
await seedRecipes();

console.log(`Seeded ${ingredients.length} ingredients, ${aliases.length} aliases, ${substitutions.length} substitutions, and ${recipes.length} recipes.`);

async function bootstrapSchema() {
  await query(`
    create extension if not exists pgcrypto;

    create table if not exists ingredients (
      ingredient_id text primary key,
      canonical_name text not null,
      category text not null
    );

    create table if not exists ingredient_aliases (
      alias_name text primary key,
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade
    );

    alter table ingredient_aliases add column if not exists canonical_name text not null default '';
    alter table ingredient_aliases add column if not exists language text not null default 'unknown';
    alter table ingredient_aliases add column if not exists category text not null default 'other';
    alter table ingredient_aliases add column if not exists confidence_score double precision not null default 1;
    alter table ingredient_aliases add column if not exists verified boolean not null default true;
    alter table ingredient_aliases add column if not exists created_at timestamptz not null default now();
    alter table ingredient_aliases add column if not exists updated_at timestamptz not null default now();

    create table if not exists ingredient_substitutions (
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      substitute_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      confidence_score double precision not null default 0,
      primary key (ingredient_id, substitute_ingredient_id)
    );

    create table if not exists unknown_ingredients (
      id uuid primary key default gen_random_uuid(),
      raw_name text not null,
      normalized_name text not null,
      source text not null default 'inventory',
      suggested_canonical_name text not null default '',
      suggested_ingredient_id text not null default '',
      ai_confidence double precision not null default 0,
      status text not null default 'pending',
      occurrence_count integer not null default 1,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now()
    );

    create index if not exists unknown_ingredients_status_last_seen_idx
      on unknown_ingredients (status, last_seen_at desc);
    create index if not exists unknown_ingredients_normalized_source_idx
      on unknown_ingredients (normalized_name, source);

    alter table pantry_recipes add column if not exists total_time_minutes integer not null default 0;
    alter table pantry_recipes add column if not exists active_time_minutes integer not null default 0;
    alter table pantry_recipes add column if not exists difficulty text not null default '';
    alter table pantry_recipes add column if not exists leftover_score double precision not null default 0;
    alter table pantry_recipes add column if not exists cleanup_score double precision not null default 0;

    alter table pantry_recipe_ingredients add column if not exists canonical_ingredient_id text not null default '';
    alter table pantry_recipe_ingredients add column if not exists required_flag boolean not null default true;
    alter table pantry_recipe_ingredients add column if not exists optional_flag boolean not null default false;
    alter table pantry_recipe_ingredients add column if not exists pantry_flag boolean not null default false;

    update pantry_recipe_ingredients
    set
      required_flag = coalesce(role, 'main') = 'main',
      optional_flag = coalesce(role, 'main') = 'secondary',
      pantry_flag = coalesce(role, 'main') = 'seasoning';

    grant select, insert, update, delete on ingredients to anon;
    grant select, insert, update, delete on ingredient_aliases to anon;
    grant select, insert, update, delete on ingredient_substitutions to anon;
    grant select, insert, update, delete on unknown_ingredients to anon;
    grant select, insert, update, delete on pantry_recipes to anon;
    grant select, insert, update, delete on pantry_recipe_ingredients to anon;
    grant select, insert, update, delete on pantry_recipe_steps to anon;
    grant select, insert, update, delete on pantry_media to anon;
  `);
}

async function seedRuleData() {
  await query(`
    insert into ingredients (ingredient_id, canonical_name, category)
    values ${ingredients.map((item) => `(${sqlString(item[0])}, ${sqlString(item[1])}, ${sqlString(item[2])})`).join(",\n")}
    on conflict (ingredient_id) do update set
      canonical_name = excluded.canonical_name,
      category = excluded.category;

    insert into ingredient_aliases (
      alias_name, ingredient_id, canonical_name, language, category, confidence_score, verified, updated_at
    )
    values ${aliases.map((item) => `(
      ${sqlString(item[0])},
      ${sqlString(item[1])},
      ${sqlString(ingredientName(item[1]))},
      ${sqlString(aliasLanguage(item[0]))},
      ${sqlString(ingredientCategory(item[1]))},
      1,
      true,
      now()
    )`).join(",\n")}
    on conflict (alias_name) do update set
      ingredient_id = excluded.ingredient_id,
      canonical_name = excluded.canonical_name,
      language = excluded.language,
      category = excluded.category,
      confidence_score = excluded.confidence_score,
      verified = excluded.verified,
      updated_at = now();

    insert into ingredient_substitutions (ingredient_id, substitute_ingredient_id, confidence_score)
    values ${substitutions.map((item) => `(${sqlString(item[0])}, ${sqlString(item[1])}, ${sqlNumber(item[2], 0)})`).join(",\n")}
    on conflict (ingredient_id, substitute_ingredient_id) do update set
      confidence_score = excluded.confidence_score;
  `);
}

async function seedRecipes() {
  await query(`
    insert into pantry_recipes (
      recipe_id, name, image_url, video_url, updated_at, active,
      total_time_minutes, active_time_minutes, difficulty, leftover_score, cleanup_score
    )
    values ${recipes.map((item) => `(
      ${sqlString(item.id)}, ${sqlString(item.name)}, '', '', now(), true,
      ${sqlNumber(item.totalTimeMinutes, 0)}, ${sqlNumber(item.activeTimeMinutes, 0)}, ${sqlString(item.difficulty)},
      ${sqlNumber(item.leftoverScore, 0)}, ${sqlNumber(item.cleanupScore, 0)}
    )`).join(",\n")}
    on conflict (recipe_id) do update set
      name = excluded.name,
      total_time_minutes = excluded.total_time_minutes,
      active_time_minutes = excluded.active_time_minutes,
      difficulty = excluded.difficulty,
      leftover_score = excluded.leftover_score,
      cleanup_score = excluded.cleanup_score,
      active = true,
      updated_at = now();

    delete from pantry_recipe_ingredients
    where recipe_id in (${recipes.map((item) => sqlString(item.id)).join(", ")});

    insert into pantry_recipe_ingredients (
      ingredient_id, recipe_id, canonical_ingredient_id, role, name, quantity, unit, sort_order,
      required_flag, optional_flag, pantry_flag
    )
    values ${recipes.flatMap((item) => item.ingredients.map((ingredient, index) => `(
      ${sqlString(`${item.id}_${ingredient.ingredientId}_${index + 1}`)},
      ${sqlString(item.id)},
      ${sqlString(ingredient.ingredientId)},
      ${sqlString(ingredient.role)},
      ${sqlString(ingredientName(ingredient.ingredientId))},
      ${sqlNumber(ingredient.quantity, 1)},
      ${sqlString(ingredient.unit)},
      ${sqlNumber(index + 1, 1)},
      ${sqlBoolean(ingredient.requiredFlag)},
      ${sqlBoolean(ingredient.optionalFlag)},
      ${sqlBoolean(ingredient.pantryFlag)}
    )`)).join(",\n")};

    delete from pantry_recipe_steps
    where recipe_id in (${recipes.map((item) => sqlString(item.id)).join(", ")});

    insert into pantry_recipe_steps (step_id, recipe_id, step_order, instruction)
    values ${recipes.map((item) => `(
      ${sqlString(`${item.id}_step_1`)},
      ${sqlString(item.id)},
      1,
      ${sqlString(`Prepare ${item.name} using the matched ingredients.`)}
    )`).join(",\n")};
  `);
}

function recipe(id, name, totalTimeMinutes, activeTimeMinutes, difficulty, leftoverScore, cleanupScore, recipeIngredients) {
  return { id, name, totalTimeMinutes, activeTimeMinutes, difficulty, leftoverScore, cleanupScore, ingredients: recipeIngredients };
}

function main(ingredientId, quantity, unit) {
  return { ingredientId, role: "main", requiredFlag: true, optionalFlag: false, pantryFlag: false, quantity, unit };
}

function optional(ingredientId, quantity, unit) {
  return { ingredientId, role: "secondary", requiredFlag: false, optionalFlag: true, pantryFlag: false, quantity, unit };
}

function pantry(ingredientId, quantity, unit) {
  return { ingredientId, role: "seasoning", requiredFlag: false, optionalFlag: false, pantryFlag: true, quantity, unit };
}

function ingredientName(ingredientId) {
  return ingredients.find((item) => item[0] === ingredientId)?.[1] || ingredientId.replaceAll("_", " ");
}

function ingredientCategory(ingredientId) {
  return ingredients.find((item) => item[0] === ingredientId)?.[2] || "other";
}

function aliasLanguage(aliasName) {
  const value = String(aliasName || "");
  const hasChinese = /[\u4e00-\u9fff]/.test(value);
  const hasAsciiLetters = /[A-Za-z]/.test(value);
  if (hasChinese && hasAsciiLetters) {
    return "mixed";
  }
  if (hasChinese) {
    return "zh";
  }
  if (hasAsciiLetters) {
    return "en";
  }
  return "unknown";
}

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
