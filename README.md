# TableUp IP

TableUp-IP is the brand asset repository for the TableUp Kitchen Universe, also known in Chinese as 冰箱救援队宇宙.

This repository does not contain business application code. It stores long-term creative and brand assets for TableUp, including IP characters, world building, prompts, comic templates, animation templates, brand guidelines, logos, images, AI generation references, and the Character Bible.

## Universe

- English name: TableUp Kitchen Universe
- Chinese name: 冰箱救援队宇宙
- Series name: 冰箱救援队
- Core theme: reduce food waste, use existing fridge inventory, answer “what should we eat tonight,” and build cooking confidence.
- Visual direction: warm Chinese family kitchen, humorous ensemble cast, 3D picture-book style, clean silhouettes, expressive faces, long-term animation ready.

## Core Characters

- 冰箱天师 / Fridge Tianshi: the guardian and strategist of the fridge.
- 大蒜爷 / Garlic Master: the hidden elder and flavor stabilizer.
- 大葱哥 / Scallion Bro: the market intelligence scout.
- 姜姐 / Ginger Sis: the warm, sharp, practical aroma commander.
- 肉哥 / Meat Bro: the protein protector and dependable muscle.
- 鱼叔 / Fish Uncle: the calm seafood sage.
- 鸡蛋小黄 / Egg Xiaohuang: the anxious but lovable fresh-egg mascot.
- 辣椒姐 / Chili Sis: the fiery energy booster.

## Extended Characters

- 洋葱哥 / Onion Bro: a calm, Buddhist-style onion wisdom character. The supplied reference sheet is stored in `characters/onion_bro/reference/onion_bro.png`.

## Repository Map

- `docs/`: world building, character bible, naming rules, and visual style guide.
- `characters/`: one folder per character, each with README, prompts, references, expressions, comic, and animation assets.
- `story_templates/`: reusable comic, short video, and rescue episode formats.
- `marketing/`: social media, TikTok/Douyin-style, and Xiaohongshu idea banks.
- `legal/`: copyright notes, trademark plan, and usage guidelines.
- `assets/`: shared logos, icons, backgrounds, and AI reference material.

## Asset Rules

1. Keep this repository brand-only. Do not add app source code, credentials, build outputs, or product backend files.
2. Store source references and generated variants separately.
3. When creating new images, record the prompt, model, date, and intended usage.
4. Preserve each character’s silhouette, personality, color palette, and catchphrases across all media.
5. Use branch and commit messages that describe brand changes clearly.

## Current Asset Mapping Notes

- Character images were mapped by the role name and visible design in each image, not by upload order.
- 姜姐 / Ginger Sis source reference image is stored in `characters/ginger_sis/reference/ginger_sis.png`.
- 洋葱哥 / Onion Bro was provided as a source image and has been added as an extended character.


## Character Asset Standard

All character assets now use a unified folder pattern:

`characters/<character_id>/README.md`, `prompts.md`, `reference/<character_id>_concept_sheet.png`, `expressions/`, `comic/`, and `animation/`.

See `docs/character_asset_standard.md` for the full rule.
