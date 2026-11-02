# Badge capture sources

These 32 PNGs preserve the existing Realm crest artwork before the 2 November 2026 capture correction. The last 16 originals contain sheet captions, including truncated labels. They are source inputs only; the application consumes `apps/web/public/badges`.

Regenerate the production files from the repository root:

```powershell
node apps/web/scripts/recapture-badges.mjs
```

The exporter uses installed Chrome/Playwright and local browser canvas capture. It excludes each source caption, isolates the crest where label fragments approach its edge, then centers it on a transparent 128×128 canvas with a 112px maximum art extent and at least 8px clear padding. It preserves all badge filenames, IDs, colors and subjects. No new generated artwork, model call, account grant or dependency is involved. `captures.json` records source/output bounds for all 32 exports. The first 16 originals contain no sheet caption and retain all their artwork components.

Keep display names in the React interface. Future assets must include the complete crest silhouette with clear transparent edges and no caption baked into the PNG. Source capture bounds belong in the exporter rather than ad hoc CSS clipping in each consumer.

The profile strip uses explicit 36px images inside 44px controls, with selectors that outrank general profile button padding. Wrapping and measured tooltip anchors support narrow windows. Local visual evidence: `.impeccable/review/badge-sizing/`.
