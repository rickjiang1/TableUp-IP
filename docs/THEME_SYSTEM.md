# TableUp Theme System

## Purpose

TableUp should support multiple visual themes without tying product logic, localization, or feature behavior to a specific visual style.

The theme system exists so the app can keep the same kitchen workflows while presenting different emotional directions for different users and markets.

Current primary theme:

- Chinese Kitchen

Planned future themes:

- Modern Kitchen
- Regional kitchen themes
- Seasonal or cultural themes

## Core Principle

Language and Theme are independent systems.

Examples:

- Chinese language + Chinese Kitchen theme
- English language + Chinese Kitchen theme
- Chinese language + Modern Kitchen theme
- English language + Modern Kitchen theme

Changing the app language should not automatically change the visual theme.

Changing the visual theme should not change the app language.

## Theme Responsibilities

A theme controls visual presentation only.

Theme-owned elements include:

- Background images
- Decorative assets
- Color tokens
- Typography direction and visual mood
- Card surfaces
- Button treatments
- Icon styling
- Shadows and material effects
- Spacing mood when it is part of the visual system

A theme should not own:

- Business logic
- Recommendation logic
- Ingredient matching logic
- Inventory rules
- Database schema
- API behavior
- Localization strings
- User permissions

## Localization Responsibilities

Localization controls text and language behavior.

Localization-owned elements include:

- UI labels
- Button text
- Empty states
- Error messages
- Unit display language
- Ingredient display names
- Category and storage-location display names

Localization should not decide which visual theme is active.

## Current Theme: Chinese Kitchen

Chinese Kitchen is the current MVP theme.

Design intent:

- New Chinese aesthetic
- Warm kitchen atmosphere
- Dark wood and paper textures
- Calm, restrained visual hierarchy
- Warm orange or gold used as accent only
- Food and kitchen objects as primary visual anchors
- Avoid looking like a database management tool

Core screens using this direction:

- Youliao inventory home
- Basket-based ingredient capture
- Cabinet-based inventory access
- Kaifan cooking/recommendation surfaces
- Recipe folder cards
- Manual and voice ingredient entry

The goal is to make TableUp feel like a home kitchen assistant, not an admin dashboard.

## Theme Architecture Direction

Future implementation should move theme-specific values into a theme configuration layer.

Recommended structure:

```text
ThemeProvider
  currentTheme
  colorTokens
  typographyTokens
  surfaceTokens
  assetTokens
  componentStyleTokens
```

Recommended asset organization:

```text
Assets/
  Themes/
    ChineseKitchen/
      backgrounds/
      icons/
      surfaces/
    ModernKitchen/
      backgrounds/
      icons/
      surfaces/
```

SwiftUI views should read theme values from the active theme instead of hardcoding assets or colors directly inside feature views.

## UI Development Rules

When building or modifying UI:

- Do not hardcode theme colors in feature views.
- Do not hardcode theme image names in feature views.
- Do not mix localization decisions with theme decisions.
- Use warm orange/gold only for actions, selected states, and important status markers.
- Keep functional text clear and localized.
- Keep decorative text inside background images separate from UI strings.
- If a background image already contains title text, avoid duplicating the same title in UI.
- Theme-specific imagery should never change data behavior.

## Adding A New Theme

To add a future theme:

1. Create a new theme asset folder.
2. Define the theme token set.
3. Map each screen-level background and decorative asset.
4. Verify all existing localized text still works.
5. Verify inventory, recipe, matching, and recommendation behavior is unchanged.

A new theme should be mostly configuration and assets, not a rewrite of feature screens.

## Documentation Update Policy

Update this document when:

- A new theme is introduced.
- Theme architecture changes.
- Theme assets are reorganized.
- Theme and localization responsibilities change.
- A project-wide UI theming rule changes.

Do not update this document for:

- Minor background image swaps.
- Small spacing tweaks.
- One-off visual polish.
- Bug fixes that do not affect theme architecture.
