---
name: starcraft-leak-rules
description: Find public StarCraft TMG card leak images, archive their provenance in this repository, transcribe them into simulated Command Center records, and test-import unreleased units into New Recruit with agreed dummy prices.
---

Work from the repository root with `update-official.mjs`. This workflow produces a local database simulation; it does not write to the official app database.

## Find and retain the evidence

Search current public posts, galleries, official previews and card images for the requested units. Inspect both sides of every card at original resolution; search follow-up posts when a gallery omits fronts or upgrades. Distinguish card text from commenter guesses. If no readable image exists, report the exact gap rather than inventing an unseen ability.

Download the original files into `assets/rule-leaks/<wave-and-date>/`. Commit the images with the work when a commit is requested, and include them when pushing authorized changes. Do not leave the only evidence under `/tmp`. Record post URL, direct image URL, retrieval date, original filename, SHA-256, pixel dimensions, and covered cards in `sources.json`; note blur/cropped text so better images can replace them later. Preserve older files if replacing one would lose the transcription's evidence.

## Build simulated source records

Use `wave4-leak-data.mjs` as the existing example. A fixture exports unit/card records in the importer's source shape. Keep the source URLs and assumptions in code comments or the archive manifest. Use normal unit names unless the user requests a visible test label. Use the user's price/size choices; otherwise choose reasonable simulation values and state the assumptions in the fixture/report. Never describe dummy prices as official.

Unit fields: stable `sourceId`, `name`, `faction`, `unitType`, `stats`, `tags`, `small`, optional `large`, `squadProfile`, and `upgrades`. Upgrades include `name`, `phase`, `activation`, `description`, `costS`, `costL`, and `linkedTo`. Weapon descriptions use the existing RANGE/TARGET/RoA/HIT/DMG plus SURGE format. Preserve zero costs and separate activated abilities from paid army-building upgrades.

Check SPECIALIST weapons, multiple modes of one upgrade, cross-phase replacements, Unique limits, and faction requirements. A SPECIALIST replaces one model's weapon, so the normal weapon profile remains for the other models. Preserve the printed replacement target even when its phase differs. Use an explicit mapping and test if the source cannot express a relationship faithfully.

For summoned/additional units (Scarabs, drones, turrets, pylons), include their full profiles too. SUMMON references are inferred; `additionalFrom: [{sourceId, ability?}]` handles other relationships. Additional units should appear under Other only when their source unit/card or paid summoning upgrade is selected, following the Raven/Nova pattern. Do not turn these into unrestricted paid units or leave them permanently hidden. Check the conditions' target IDs and roster scopes.

## Run and verify

`simulate-leak-import.mjs` merges the maintained leak fixtures with a separate official snapshot and invokes the same real importer. It defaults to preview; use `--apply` when the user has requested the local test import:

```
node simulate-leak-import.mjs --source-input=/tmp/starcraft-official.json --source-output=/tmp/starcraft-leak-source.json --apply
node update-official.mjs --source-input=/tmp/starcraft-leak-source.json
npm test
```

Without `--source-input`, the simulation helper fetches official data first. Update its fixture exports if adding another wave. Never hand-edit generated XML as a substitute for exercising the importer. Add regression coverage for newly encountered card structures, verify XML/unique IDs/resolved conditions, compare base/reinforced costs and model counts, and verify a second identical run produces zero changes.

Keep imported core rule references linked so template, RoA and keyword descriptions can be opened. If browser inspection is requested, reload the local New Recruit data and inspect parent selection, Additional Units, upgrades and reinforcement. Report only observed UI results.

Commit/push only when authorized. Include fixtures, importer fixes/tests, original images and provenance together so the run is reproducible and image quality can be improved later. Keep simulated source data separate from the official snapshot.
