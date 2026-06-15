export const ingredientStorageLifeRules = [
  rule(["garlic"], ["大蒜", "大蒜头", "蒜头", "蒜", "garlic bulb", "whole garlic"], { cold: 30, frozen: 180, room_temperature: 45 }, "Whole garlic keeps well in a cool counter or pantry spot."),
  rule(["onion", "yellow_onion", "white_onion", "red_onion"], ["洋葱", "黄洋葱", "白洋葱", "红洋葱"], { cold: 30, frozen: 180, room_temperature: 30 }),
  rule(["potato", "sweet_potato", "yam"], ["土豆", "马铃薯", "红薯", "地瓜", "紫薯"], { cold: 21, frozen: 240, room_temperature: 30 }),
  rule(["ginger"], ["姜", "生姜"], { cold: 30, frozen: 180, room_temperature: 21 }),
  rule(["carrot", "daikon", "radish", "beet", "turnip"], ["胡萝卜", "白萝卜", "萝卜", "甜菜根", "芜菁"], { cold: 21, frozen: 240, room_temperature: 5 }),
  rule(["cabbage", "napa_cabbage", "bok_choy"], ["包菜", "卷心菜", "白菜", "大白菜", "小白菜", "上海青"], { cold: 10, frozen: 180, room_temperature: 2 }),
  rule(["spinach", "lettuce", "cilantro", "parsley", "scallion", "green_onion"], ["菠菜", "生菜", "香菜", "欧芹", "葱", "小葱", "青葱"], { cold: 5, frozen: 90, room_temperature: 1 }),
  rule(["tomato"], ["番茄", "西红柿"], { cold: 7, frozen: 180, room_temperature: 5 }),
  rule(["apple", "orange", "lemon", "lime"], ["苹果", "橙子", "柠檬", "青柠"], { cold: 30, frozen: 180, room_temperature: 14 }),
  rule(["banana", "avocado"], ["香蕉", "牛油果"], { cold: 5, frozen: 90, room_temperature: 4 }),
  rule(["egg"], ["鸡蛋", "蛋"], { cold: 28, frozen: 0, room_temperature: 2 }),
  rule(["milk", "cream", "heavy_cream", "yogurt"], ["牛奶", "奶油", "淡奶油", "酸奶"], { cold: 7, frozen: 60, room_temperature: 0 }),
  rule(["beef", "pork", "chicken", "lamb", "ground_beef", "ground_pork"], ["牛肉", "猪肉", "鸡肉", "羊肉", "肉馅"], { cold: 3, frozen: 180, room_temperature: 0 }),
  rule(["fish", "shrimp", "salmon", "cod", "tilapia", "clam", "mussel"], ["鱼", "虾", "三文鱼", "鳕鱼", "蛤蜊", "青口"], { cold: 2, frozen: 90, room_temperature: 0 })
];

function rule(ingredientIds, aliases, daysByApproach, notes = "") {
  return Object.entries(daysByApproach).flatMap(([storageApproach, defaultDays]) =>
    ingredientIds.map((ingredientId, index) => ({
      ingredient_id: ingredientId,
      category: "",
      storage_approach: storageApproach,
      storage_location: "",
      default_days: defaultDays,
      condition_state: "default",
      aliases,
      priority: 10 + index,
      notes,
      active: true
    }))
  );
}

