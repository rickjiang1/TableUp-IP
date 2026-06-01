const categoryEnum = ["Meat", "Seafood", "Vegetable", "Fruit", "Dairy", "Grain", "Sauce", "Spice", "Other"];
const locationEnum = ["Fridge", "Freezer", "Pantry", "Counter"];

export const groceryExtractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unit", "category", "location", "confidence", "sourceText"],
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          category: { type: "string", enum: categoryEnum },
          location: { type: "string", enum: locationEnum },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceText: { type: "string" }
        }
      }
    }
  }
};

export const recipeExtractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "ingredients", "steps", "videoUrl", "imageUrl"],
  properties: {
    name: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unit", "optional"],
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          optional: { type: "boolean" }
        }
      }
    },
    steps: {
      type: "array",
      items: { type: "string" }
    },
    videoUrl: { type: "string" },
    imageUrl: { type: "string" }
  }
};
