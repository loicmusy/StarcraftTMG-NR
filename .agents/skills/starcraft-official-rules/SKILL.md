---
name: starcraft-official-rules
description: Download current StarCraft TMG Command Center data and update this project's New Recruit catalogs, keyword glossary and searchable core rulebook. Use for official rule refreshes or checking whether a new wave has reached the app database.
---

Work from the repository root containing `update-official.mjs`. Use Node.js 22+; `npm test` also needs Python 3.

## Official source and replay

The official app is https://sc.starcraft-tmg.com/. The importer reads its public Firestore REST collections `army_units`, `tactical_cards`, and `rules_sections` from the endpoint already configured in `update-official.mjs`. Use that importer, not a separate PDF-to-catalog conversion. The database has chapter and subsection headings and can be replayed without another download.

1. Inspect `git status --short` and the existing diff so local edits are preserved.
2. Fetch and preview with `node update-official.mjs --source-output=/tmp/starcraft-official.json`. Report collection counts and unmatched/unsupported records. Verify requested units in the snapshot before claiming a wave is available; previews may still contain independently imported local leak entries.
3. If the user requests an update, run `node update-official.mjs --source-input=/tmp/starcraft-official.json --apply` within that authorization. A read-only request authorizes the preview only.
4. Run `npm test`, check generated XML/IDs/targets, inspect the diff, and repeat the same snapshot preview. It should report zero changes.

## Catalog behavior

Preserve hand-authored IDs and roster restrictions. New compatible units and tactical/faction cards are added, zero costs are explicit, and malformed records are reported. Singular/plural aliases prevent duplicate units. Additional units are under `Other`, hidden until their source unit or optional summoning upgrade is selected; preserve existing Raven/Nova mappings. Source relationships that cannot be inferred need a small explicit mapping and regression test.

The core rulebook is imported as shared rules named by chapter/subsection. Every catalog has a `Rules Reference` entry under Pre-Game, with links to the rules; relevant entries also link to glossary and template/RoA/Surge topics. Tables must become readable text rather than escaped HTML. Keep the glossary and its existing aliases.

Known manual special case: Nova's source has two modes but the existing catalog uses one entry with mode selections. Do not replace that structure with duplicate models. Unsupported faction restrictions and cross-catalog units need inspection, not guessed enforcement.

For a requested PDF archive, download the current core PDF linked from the official site's downloads page, and save its source URL/version/date. Treat PDFs as corroborating references; do not assume an older PDF supersedes the current database.

Report what changed, actual validation, and unresolved mapping warnings. Do not claim New Recruit's visual behavior was tested unless inspected there. Do not commit or push unless requested in the session.
