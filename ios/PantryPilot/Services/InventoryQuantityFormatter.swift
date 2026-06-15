import Foundation

enum InventoryQuantityFormatter {
    static func primaryAmount(for ingredient: StoredIngredient, language: String) -> String {
        amount(quantity: ingredient.quantity, unit: ingredient.unit, language: language)
    }

    static func secondaryCanonicalAmount(for ingredient: StoredIngredient, language: String) -> String? {
        guard shouldShowCanonicalAmount(for: ingredient) else {
            return nil
        }
        return amount(quantity: ingredient.canonicalQuantity, unit: ingredient.canonicalUnit, language: language)
    }

    static func inlineInventoryAmount(for ingredient: StoredIngredient, language: String) -> String {
        let primary = primaryAmount(for: ingredient, language: language)
        guard let secondary = secondaryCanonicalAmount(for: ingredient, language: language) else {
            return primary
        }
        return "\(primary) (≈ \(secondary))"
    }

    static func conversionRuleText(for ingredient: StoredIngredient, language: String) -> String? {
        let rawUnit = IngredientNormalizer.normalizeUnit(ingredient.unit)
        let canonicalUnit = IngredientNormalizer.normalizeUnit(ingredient.canonicalUnit)
        guard ingredient.unitConversionRatio > 0, !rawUnit.isEmpty, !canonicalUnit.isEmpty else {
            return nil
        }

        let raw = displayUnit(rawUnit, language: language)
        let canonical = amount(quantity: ingredient.unitConversionRatio, unit: canonicalUnit, language: language)
        return "1 \(raw) = \(canonical)"
    }

    static func displayUnit(_ unit: String, language: String) -> String {
        let normalized = IngredientNormalizer.normalizeUnit(unit)
        if let ingredientUnit = IngredientUnit(rawValue: normalized) {
            return ingredientUnit.displayName(language: language)
        }

        switch normalized {
        case "gram":
            return IngredientUnit.g.displayName(language: language)
        case "grams":
            return IngredientUnit.g.displayName(language: language)
        case "milliliter", "milliliters":
            return IngredientUnit.ml.displayName(language: language)
        case "whole", "pc", "pcs":
            return IngredientUnit.piece.displayName(language: language)
        default:
            return normalized
        }
    }

    static func amount(quantity: Double, unit: String, language: String) -> String {
        "\(quantity.formatted()) \(displayUnit(unit, language: language))"
    }

    private static func shouldShowCanonicalAmount(for ingredient: StoredIngredient) -> Bool {
        guard !ingredient.unitConversionNeedsReview,
              ingredient.canonicalQuantity > 0,
              !ingredient.canonicalUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return false
        }

        let rawUnit = IngredientNormalizer.normalizeUnit(ingredient.unit)
        let canonicalUnit = IngredientNormalizer.normalizeUnit(ingredient.canonicalUnit)
        guard rawUnit != canonicalUnit else {
            return false
        }

        return true
    }
}
