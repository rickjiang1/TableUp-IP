const storageKey = "pantry-pilot-mvp";

const unitAliases = {
  pounds: "lb",
  pound: "lb",
  lbs: "lb",
  grams: "g",
  gram: "g",
  kilograms: "kg",
  kilogram: "kg",
  ounces: "oz",
  ounce: "oz",
  tablespoons: "tbsp",
  tablespoon: "tbsp",
  teaspoons: "tsp",
  teaspoon: "tsp",
  pieces: "piece",
  pcs: "piece",
  cloves: "clove",
  cups: "cup",
  milliliters: "ml",
  milliliter: "ml",
  liters: "l",
  liter: "l"
};

const unitToBase = {
  kg: { unit: "g", factor: 1000 },
  g: { unit: "g", factor: 1 },
  lb: { unit: "g", factor: 453.592 },
  oz: { unit: "g", factor: 28.3495 },
  l: { unit: "ml", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  tbsp: { unit: "ml", factor: 14.7868 },
  tsp: { unit: "ml", factor: 4.92892 },
  cup: { unit: "ml", factor: 236.588 },
  piece: { unit: "piece", factor: 1 },
  clove: { unit: "clove", factor: 1 },
  bunch: { unit: "bunch", factor: 1 }
};

const categoryOrder = ["Meat", "Seafood", "Vegetable", "Fruit", "Dairy", "Grain", "Sauce", "Spice", "Other"];

const categoryKeywords = {
  Meat: ["beef", "chicken", "pork", "lamb", "turkey", "sausage", "bacon", "ham", "steak"],
  Seafood: ["fish", "shrimp", "salmon", "tuna", "cod", "crab", "scallop"],
  Vegetable: ["tomato", "broccoli", "onion", "garlic", "carrot", "lettuce", "spinach", "pepper", "potato", "cabbage", "celery", "mushroom"],
  Fruit: ["apple", "banana", "orange", "lemon", "lime", "berry", "grape", "mango", "avocado"],
  Dairy: ["milk", "cheese", "butter", "yogurt", "cream", "egg"],
  Grain: ["rice", "pasta", "noodle", "flour", "bread", "oat", "quinoa"],
  Sauce: ["sauce", "soy", "vinegar", "oil", "ketchup", "mustard", "mayonnaise", "dressing"],
  Spice: ["salt", "pepper", "paprika", "cumin", "oregano", "basil", "chili", "cinnamon", "spice"]
};

const defaultShelfLifeDays = {
  Meat: 3,
  Seafood: 2,
  Vegetable: 7,
  Fruit: 7,
  Dairy: 10,
  Grain: 180,
  Sauce: 120,
  Spice: 365,
  Other: 14
};

const storageApproachShelfLifeDays = {
  Meat: { Cold: 3, Frozen: 180, "Room temp": 0 },
  Seafood: { Cold: 2, Frozen: 90, "Room temp": 0 },
  Vegetable: { Cold: 7, Frozen: 240, "Room temp": 2 },
  Fruit: { Cold: 7, Frozen: 180, "Room temp": 3 },
  Dairy: { Cold: 10, Frozen: 60, "Room temp": 0 },
  Grain: { Cold: 180, Frozen: 365, "Room temp": 180 },
  Sauce: { Cold: 120, Frozen: 180, "Room temp": 30 },
  Spice: { Cold: 365, Frozen: 365, "Room temp": 365 },
  Other: { Cold: 14, Frozen: 90, "Room temp": 7 }
};

const recommendedApproachByCategory = {
  Meat: "Frozen",
  Seafood: "Frozen",
  Vegetable: "Cold",
  Fruit: "Cold",
  Dairy: "Cold",
  Grain: "Room temp",
  Sauce: "Room temp",
  Spice: "Room temp",
  Other: "Cold"
};

const defaultRecipeImages = {
  riceBowl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  chicken: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
  fallback: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=80"
};

const demoData = {
  inventory: [
    item("Chicken thigh", 2.2, "lb", "Fridge"),
    item("Tomato", 4, "piece", "Counter"),
    item("Soy sauce", 250, "ml", "Pantry"),
    item("Rice", 5, "cup", "Pantry"),
    item("Garlic", 8, "clove", "Pantry")
  ],
  recipes: [
    recipe(
      "Tomato chicken rice bowl",
      "1 lb chicken thigh\n2 piece tomato\n2 cup rice\n2 clove garlic\n1 tbsp soy sauce",
      "Slice chicken and tomatoes\nCook rice\nStir fry chicken with garlic\nAdd tomatoes and soy sauce\nServe over rice",
      "https://www.youtube.com",
      defaultRecipeImages.riceBowl
    ),
    recipe(
      "Garlic soy chicken",
      "1.5 lb chicken thigh\n3 clove garlic\n2 tbsp soy sauce",
      "Mince garlic\nSear chicken\nAdd soy sauce and simmer",
      "",
      defaultRecipeImages.chicken
    ),
    recipe(
      "Chicken tomato stir fry",
      "1 lb chicken thigh\n2 piece tomato\n2 clove garlic\n1 tbsp soy sauce\n1 piece green onion",
      "Slice chicken\nCook chicken with garlic\nAdd tomato and soy sauce\nFinish with green onion",
      "",
      defaultRecipeImages.fallback
    )
  ]
};

let state = loadState();
let detected = [];
let activeRecipeId = null;
let selectedPhotoFile = null;
let selectedPhotoUrl = null;

function item(name, quantity, unit, location = "Fridge", category = "Auto", enteredDate = "", expireDate = "") {
  const resolvedCategory = category === "Auto" ? categorizeIngredient(name) : category;
  const resolvedEnteredDate = enteredDate || todayDate();
  return {
    id: crypto.randomUUID(),
    name,
    normalizedName: normalizeName(name),
    quantity: Number(quantity),
    unit: normalizeUnit(unit),
    location,
    category: resolvedCategory,
    enteredDate: resolvedEnteredDate,
    expireDate: expireDate || estimateExpireDate(resolvedCategory, resolvedEnteredDate, location),
    createdAt: new Date().toISOString()
  };
}

function recipe(name, ingredientsText, stepsText, videoUrl, imageUrl = "") {
  return {
    id: crypto.randomUUID(),
    name,
    ingredients: parseIngredients(ingredientsText),
    steps: stepsText.split("\n").map((step) => step.trim()).filter(Boolean),
    videoUrl,
    imageUrl: imageUrl || defaultRecipeImages.fallback,
    createdAt: new Date().toISOString()
  };
}

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/s\b/g, "").replace(/\s+/g, " ");
}

function normalizeUnit(unit) {
  const clean = unit.toLowerCase().trim();
  return unitAliases[clean] || clean;
}

function categorizeIngredient(name) {
  const normalized = normalizeName(name);
  const category = categoryOrder.find((candidate) =>
    (categoryKeywords[candidate] || []).some((keyword) => normalized.includes(keyword))
  );
  return category || "Other";
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    localStorage.setItem(storageKey, JSON.stringify(demoData));
    return structuredClone(demoData);
  }
  const parsed = JSON.parse(saved);
  parsed.inventory = parsed.inventory.map((entry) => ({
    ...entry,
    normalizedName: entry.normalizedName || normalizeName(entry.name),
    category: entry.category || categorizeIngredient(entry.name),
    enteredDate: entry.enteredDate || entry.createdAt?.slice(0, 10) || todayDate(),
    expireDate: entry.expireDate || estimateExpireDate(entry.category || categorizeIngredient(entry.name), entry.enteredDate || entry.createdAt?.slice(0, 10) || todayDate(), entry.location)
  }));
  parsed.recipes = parsed.recipes.map((entry) => ({
    ...entry,
    imageUrl: entry.imageUrl || getRecipeImage(entry.name)
  }));
  return parsed;
}

function getRecipeImage(name) {
  const normalized = normalizeName(name);
  if (normalized.includes("rice") || normalized.includes("bowl")) return defaultRecipeImages.riceBowl;
  if (normalized.includes("chicken")) return defaultRecipeImages.chicken;
  return defaultRecipeImages.fallback;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function estimateExpireDate(category, enteredDate, location = "Fridge") {
  return addDays(enteredDate, getShelfLifeDays(category, locationToApproach(location)));
}

function getShelfLifeDays(category, approach) {
  return storageApproachShelfLifeDays[category]?.[approach] ?? defaultShelfLifeDays[category] ?? defaultShelfLifeDays.Other;
}

function locationToApproach(location) {
  if (location === "Freezer") return "Frozen";
  if (location === "Counter" || location === "Pantry") return "Room temp";
  return "Cold";
}

function formatDate(dateValue) {
  if (!dateValue) return "Unknown";
  const [year, month, day] = dateValue.split("-");
  return `${month}/${day}/${year}`;
}

function daysUntil(dateValue) {
  const today = new Date(`${todayDate()}T00:00:00`);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function expireStatus(entry) {
  const days = daysUntil(entry.expireDate);
  if (days < 0) return { label: "Expired", className: "expired" };
  if (days <= 2) return { label: `${days}d left`, className: "soon" };
  return { label: `${days}d left`, className: "" };
}

function storageRecommendations(entry) {
  const category = entry.category || categorizeIngredient(entry.name);
  const enteredDate = entry.enteredDate || todayDate();
  const recommended = recommendedApproachByCategory[category] || "Cold";
  return ["Cold", "Frozen", "Room temp"].map((approach) => ({
    approach,
    isRecommended: approach === recommended,
    expireDate: addDays(enteredDate, getShelfLifeDays(category, approach))
  }));
}

function renderStorageAdvice(entry) {
  return `
    <div class="storage-advice">
      ${storageRecommendations(entry).map((option) => `
        <span class="storage-chip ${option.isRecommended ? "recommended" : ""}">
          ${option.approach}: ${formatDate(option.expireDate)}${option.isRecommended ? " best" : ""}
        </span>
      `).join("")}
    </div>
  `;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function parseIngredients(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([\d.\/]+)\s+([a-zA-Z]+)\s+(.+)$/);
      if (!match) {
        return { name: line, normalizedName: normalizeName(line), quantity: 1, unit: "piece", raw: line };
      }
      return {
        quantity: parseQuantity(match[1]),
        unit: normalizeUnit(match[2]),
        name: titleCase(match[3]),
        normalizedName: normalizeName(match[3]),
        raw: line
      };
    });
}

function parseQuantity(value) {
  if (value.includes("/")) {
    const [left, right] = value.split("/").map(Number);
    return right ? left / right : Number(value);
  }
  return Number(value);
}

function titleCase(value) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function comparableAmount(entry) {
  const unit = normalizeUnit(entry.unit);
  const converter = unitToBase[unit];
  if (!converter) return { amount: entry.quantity, unit };
  return { amount: entry.quantity * converter.factor, unit: converter.unit };
}

function getInventoryAmount(ingredient) {
  const needed = comparableAmount(ingredient);
  return state.inventory
    .filter((stored) => stored.normalizedName === ingredient.normalizedName)
    .map(comparableAmount)
    .filter((stored) => stored.unit === needed.unit)
    .reduce((sum, stored) => sum + stored.amount, 0);
}

function amountInOriginalUnit(baseAmount, originalUnit) {
  const converter = unitToBase[normalizeUnit(originalUnit)];
  if (!converter) return baseAmount;
  return baseAmount / converter.factor;
}

function assessRecipe(recipeEntry) {
  const missing = [];
  let matchedCount = 0;
  recipeEntry.ingredients.forEach((ingredient) => {
    const need = comparableAmount(ingredient);
    const available = getInventoryAmount(ingredient);
    if (available + 0.0001 < need.amount) {
      const shortageBase = need.amount - available;
      missing.push({
        ...ingredient,
        shortage: amountInOriginalUnit(shortageBase, ingredient.unit),
        available: amountInOriginalUnit(available, ingredient.unit),
        baseUnit: need.unit
      });
    } else {
      matchedCount += 1;
    }
  });
  const totalCount = recipeEntry.ingredients.length || 1;
  const matchRatio = matchedCount / totalCount;
  return { canCook: missing.length === 0, matchedCount, totalCount, matchRatio, missing };
}

function subtractIngredient(ingredient) {
  let remaining = comparableAmount(ingredient).amount;
  const neededBaseUnit = comparableAmount(ingredient).unit;
  state.inventory.forEach((stored) => {
    if (remaining <= 0 || stored.normalizedName !== ingredient.normalizedName) return;
    const storedAmount = comparableAmount(stored);
    if (storedAmount.unit !== neededBaseUnit) return;
    const takeBase = Math.min(storedAmount.amount, remaining);
    const converter = unitToBase[stored.unit] || { factor: 1 };
    stored.quantity = Math.max(0, stored.quantity - takeBase / converter.factor);
    remaining -= takeBase;
  });
  state.inventory = state.inventory.filter((stored) => stored.quantity > 0.001);
}

function render() {
  renderDetected();
  renderStorage();
  renderRecipes();
  renderCookable();
  saveState();
}

function renderDetected() {
  const container = document.querySelector("#detectedItems");
  if (!detected.length) {
    container.className = "item-list empty-state";
    container.textContent = "Nothing scanned yet.";
    return;
  }
  container.className = "item-list";
  container.innerHTML = detected.map((entry) => `
    <label class="item">
      <span class="item-main">
        <span>
          <span class="item-name">${entry.name}</span>
          <span class="item-meta">${entry.quantity} ${entry.unit} - ${entry.location} - ${entry.category}</span>
          <span class="item-meta">Entered ${formatDate(entry.enteredDate)} - Expires ${formatDate(entry.expireDate)}</span>
          ${renderStorageAdvice(entry)}
        </span>
        <input type="checkbox" data-detected-id="${entry.id}" checked>
      </span>
    </label>
  `).join("");
}

function renderStorage() {
  document.querySelector("#storageCount").textContent = state.inventory.length;
  const container = document.querySelector("#storageList");
  if (!state.inventory.length) {
    container.innerHTML = `<div class="empty-state">Your storage is empty.</div>`;
    return;
  }
  const groups = groupInventoryByCategory();
  container.innerHTML = categoryOrder
    .filter((category) => groups[category]?.length)
    .map((category) => `
      <section class="category-group">
        <div class="category-heading">
          <h3>${category}</h3>
          <span class="summary-pill">${groups[category].length}</span>
        </div>
        <div class="item-list">
          ${groups[category].map((entry) => `
            <article class="item">
              <div class="item-main">
                <div>
                  <div class="item-name">${entry.name}</div>
                  <div class="item-meta">${formatNumber(entry.quantity)} ${entry.unit} - ${entry.location}</div>
                  <div class="date-row">
                    <span>Entered ${formatDate(entry.enteredDate)}</span>
                    <span>Expires ${formatDate(entry.expireDate)}</span>
                    <span class="expiry-pill ${expireStatus(entry).className}">${expireStatus(entry).label}</span>
                  </div>
                  ${renderStorageAdvice(entry)}
                </div>
                <button class="danger-button" type="button" data-remove-item="${entry.id}">Remove</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
}

function groupInventoryByCategory() {
  return state.inventory.reduce((groups, entry) => {
    const category = entry.category || categorizeIngredient(entry.name);
    if (!groups[category]) groups[category] = [];
    groups[category].push(entry);
    return groups;
  }, {});
}

function renderRecipes() {
  const container = document.querySelector("#recipeList");
  if (!state.recipes.length) {
    container.innerHTML = `<div class="empty-state">No recipes yet.</div>`;
    return;
  }
  container.innerHTML = state.recipes.map((entry) => `
    <article class="recipe">
      <img class="recipe-photo" src="${entry.imageUrl}" alt="${entry.name}">
      <div class="recipe-main">
        <div>
          <div class="recipe-name">${entry.name}</div>
          <div class="ingredient-lines">${entry.ingredients.map(formatIngredient).join(" - ")}</div>
        </div>
        <button class="danger-button" type="button" data-remove-recipe="${entry.id}">Remove</button>
      </div>
    </article>
  `).join("");
}

function renderCookable() {
  const container = document.querySelector("#cookableList");
  if (!state.recipes.length) {
    container.innerHTML = `<div class="empty-state">Add recipes to see what you can cook.</div>`;
    return;
  }
  const assessedRecipes = state.recipes.map((entry) => ({
    entry,
    assessment: assessRecipe(entry)
  }));
  const cookable = assessedRecipes.filter(({ assessment }) => assessment.canCook);
  const related = assessedRecipes.filter(({ assessment }) => !assessment.canCook && assessment.matchRatio >= 0.7);

  container.innerHTML = `
    <section class="cook-summary">
      <div>
        <span class="summary-number">${cookable.length}</span>
        <span class="summary-label">dish${cookable.length === 1 ? "" : "es"} can be cooked now</span>
      </div>
      <div>
        <span class="summary-number">${related.length}</span>
        <span class="summary-label">related at 70%+ ingredients</span>
      </div>
    </section>
    <section class="cook-section">
      <div class="category-heading">
        <h3>Ready to cook</h3>
        <span class="summary-pill">${cookable.length}</span>
      </div>
      ${cookable.length ? cookable.map(renderCookCard).join("") : `<div class="empty-state">No full matches yet.</div>`}
    </section>
    <section class="cook-section">
      <div class="category-heading">
        <h3>Almost there</h3>
        <span class="summary-pill">${related.length}</span>
      </div>
      ${related.length ? related.map(renderCookCard).join("") : `<div class="empty-state">No 70%+ related dishes yet.</div>`}
    </section>
  `;
}

function renderCookCard({ entry, assessment }) {
  const percent = Math.round(assessment.matchRatio * 100);
  return `
    <article class="cook-card">
      <img class="recipe-photo cook-photo" src="${entry.imageUrl}" alt="${entry.name}">
      <div class="cook-main">
        <div>
          <div class="cook-name">${entry.name}</div>
          <div class="ingredient-lines">${entry.ingredients.map(formatIngredient).join(" - ")}</div>
        </div>
        <span class="status-pill ${assessment.canCook ? "" : "missing"}">${assessment.canCook ? "Can cook" : `${percent}% match`}</span>
      </div>
      ${assessment.missing.length ? `<div class="missing-lines">Lacking: ${assessment.missing.map(formatMissing).join(", ")}</div>` : ""}
      <button class="primary-button" type="button" data-cook="${entry.id}" ${assessment.canCook ? "" : "disabled"}>Open cooking mode</button>
    </article>
  `;
}

function formatNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function formatIngredient(entry) {
  return `${formatNumber(entry.quantity)} ${entry.unit} ${entry.name}`;
}

function formatMissing(entry) {
  return `${entry.name} (${formatNumber(entry.shortage)} ${entry.unit} short, have ${formatNumber(entry.available)} ${entry.unit})`;
}

function ingredientUsagePreview(ingredient) {
  const need = comparableAmount(ingredient);
  const availableBase = getInventoryAmount(ingredient);
  const leftoverBase = Math.max(availableBase - need.amount, 0);
  return {
    name: ingredient.name,
    unit: ingredient.unit,
    needed: ingredient.quantity,
    available: amountInOriginalUnit(availableBase, ingredient.unit),
    leftover: amountInOriginalUnit(leftoverBase, ingredient.unit)
  };
}

function renderUsagePreview(recipeEntry) {
  return `
    <div class="usage-preview">
      ${recipeEntry.ingredients.map((ingredient) => {
        const preview = ingredientUsagePreview(ingredient);
        return `
          <div class="usage-row">
            <span>${preview.name}</span>
            <span>Use ${formatNumber(preview.needed)} ${preview.unit}</span>
            <span>Left ${formatNumber(preview.leftover)} ${preview.unit}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function openCookDialog(recipeId) {
  const entry = state.recipes.find((candidate) => candidate.id === recipeId);
  if (!entry) return;
  activeRecipeId = recipeId;
  document.querySelector("#cookTitle").textContent = entry.name;
  document.querySelector("#cookContent").innerHTML = `
    <h4>Ingredients to use</h4>
    <div class="ingredient-lines">${entry.ingredients.map(formatIngredient).join("<br>")}</div>
    <h4>Inventory after cooking</h4>
    ${renderUsagePreview(entry)}
    <h4>Steps</h4>
    <ol>${entry.steps.map((step) => `<li>${step}</li>`).join("") || "<li>Follow your uploaded video.</li>"}</ol>
    ${entry.videoUrl ? `<p><a class="video-link" href="${entry.videoUrl}" target="_blank" rel="noreferrer">Open cooking video</a></p>` : ""}
  `;
  document.querySelector("#cookDialog").showModal();
}

function simulateDetection() {
  const status = document.querySelector("#scanStatus");
  if (!selectedPhotoFile) {
    status.textContent = "Please choose a grocery photo first.";
    status.classList.add("warning");
    return;
  }
  status.textContent = `Extracted sample ingredients from ${selectedPhotoFile.name}. Review and save the items below.`;
  status.classList.remove("warning");
  detected = [
    item("Ground beef", 1.25, "lb", "Fridge", "Meat"),
    item("Onion", 2, "piece", "Counter", "Vegetable"),
    item("Broccoli", 1, "bunch", "Fridge", "Vegetable")
  ];
  render();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}`).classList.add("active-view");
  });
});

document.querySelector("#photoInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const photoName = document.querySelector("#photoName");
  const photoPreview = document.querySelector("#photoPreview");
  const status = document.querySelector("#scanStatus");
  selectedPhotoFile = file || null;
  photoName.textContent = file ? file.name : "No photo selected";
  detected = [];

  if (selectedPhotoUrl) {
    URL.revokeObjectURL(selectedPhotoUrl);
    selectedPhotoUrl = null;
  }

  if (!file) {
    photoPreview.hidden = true;
    photoPreview.removeAttribute("src");
    status.textContent = "Choose a photo before extracting.";
    status.classList.remove("warning");
    render();
    return;
  }

  selectedPhotoUrl = URL.createObjectURL(file);
  photoPreview.src = selectedPhotoUrl;
  photoPreview.hidden = false;
  status.textContent = "Photo loaded. Click Extract ingredients to simulate AI extraction.";
  status.classList.remove("warning");
  render();
});

document.querySelector("#simulateScan").addEventListener("click", simulateDetection);

document.querySelector("#saveDetected").addEventListener("click", () => {
  const selectedIds = [...document.querySelectorAll("[data-detected-id]:checked")].map((checkbox) => checkbox.dataset.detectedId);
  state.inventory.push(...detected.filter((entry) => selectedIds.includes(entry.id)));
  detected = [];
  render();
});

document.querySelector("#manualItemForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.inventory.push(item(
    data.get("name"),
    data.get("quantity"),
    data.get("unit"),
    data.get("location"),
    data.get("category"),
    data.get("enteredDate"),
    data.get("expireDate")
  ));
  event.currentTarget.reset();
  render();
});

document.querySelector("#recipeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.recipes.push(recipe(data.get("recipeName"), data.get("ingredients"), data.get("steps"), data.get("videoUrl"), data.get("imageUrl")));
  event.currentTarget.reset();
  render();
});

document.body.addEventListener("click", (event) => {
  const removeItemId = event.target.dataset.removeItem;
  const removeRecipeId = event.target.dataset.removeRecipe;
  const cookId = event.target.dataset.cook;
  if (removeItemId) {
    state.inventory = state.inventory.filter((entry) => entry.id !== removeItemId);
    render();
  }
  if (removeRecipeId) {
    state.recipes = state.recipes.filter((entry) => entry.id !== removeRecipeId);
    render();
  }
  if (cookId) openCookDialog(cookId);
});

document.querySelector("#closeCook").addEventListener("click", () => {
  document.querySelector("#cookDialog").close();
});

document.querySelector("#confirmCook").addEventListener("click", () => {
  const entry = state.recipes.find((candidate) => candidate.id === activeRecipeId);
  if (!entry) return;
  entry.ingredients.forEach(subtractIngredient);
  document.querySelector("#cookDialog").close();
  render();
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  state = loadState();
  detected = [];
  selectedPhotoFile = null;
  render();
});

render();
