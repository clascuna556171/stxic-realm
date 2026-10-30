# Home and Hall interaction polish — 30 October 2026

The review uses the Apple design skill's platform-independent HIG principles for Realm's React web interface on desktop and mobile. Realm retains its obsidian shell, chosen accent and pixel artwork.

## Findings and changes

| Finding | Design principle | Change |
|---|---|---|
| High: clicking an object or entrance repeatedly appeared to zoom the world. At 1280 × 720, arrival reduced both Home and Hall scene height by 56 px, and the next destination expanded them again. Browser viewport scale remained 1. | **Layout — Adaptability:** minimize unexpected interface changes. **Motion — Feedback:** frequent interactions should avoid unnecessary motion. | Arrival actions now share a fixed-size movement toolbar. Status, arriving, sitting, stopping and opening controls cannot change scene geometry. The existing renderer still responds to genuine window/layout changes. |
| Medium: status, Stop, sitting and movement controls were repeated across the scene, header and inspector. | **Layout — Visual hierarchy:** group related controls and disclose secondary tasks progressively. **Feedback — Best practices:** keep routine feedback passive and in context. | One primary scene status/action toolbar; arrows and optional coordinate entry under Movement. Home's inspector coordinate alternative is collapsed by default. The duplicate header sitting control is removed; Wander is in Movement. Wide Home inspectors leave sitting actions to the scene; compact Details retains its text actions. |
| Medium: Hall objects preceded the server directory and search. | **Layout — Visual hierarchy:** place the primary task first. | Servers and search come first. Hall objects have a separate labeled disclosure below the directory. |
| Medium: Appearance wrapped its icon, mobile control placement was inconsistent, and coordinate fields inherited small text. | **Typography — Legibility**, **Accessibility — Mobility**, **Color — Inclusive color**. | Aligned Appearance link, explicit compact toolbar columns, 44 px interactive targets, 16 px coordinate fields, visible keyboard focus, and labeled controls using existing semantic colors. No browser zoom restriction was introduced. |

Movement disclosure closes on outside interaction or focus leaving it. Escape stops movement, closes the disclosure and returns focus to its summary. Its scrollable panel fits the space above the toolbar. Home/Hall movement validation, Studio placement/history, saved layouts, shared-home RPCs and permission-checked portal entry are preserved.

References supplied by the Apple design skill: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color). This is an application of the guidance, not an accessibility certification.

## Verification

- `pnpm test`: all 47 unit tests passed; typecheck and production build passed, with the existing large Phaser bundle warning.
- `pnpm test:world:polish:ui`: geometry is observed throughout repeated selections, arrival/sitting, blocked targets, movement disclosure, Escape/focus restoration and outside dismissal at 1440 × 900, 1280 × 720, 390 × 844, 320 × 740 and 844 × 390. Touch is emulated for phone sizes; coordinate fields and reduced motion are checked.
- Existing direct-interaction browser checks passed, including Studio drag validation/history and actual Phaser directional graphics. Existing world UI and seven-size viewport checks passed after adapting selectors to the disclosed controls.
- Intercepted Auth/PostgREST with disposable PGlite SQL/RLS verifies shared-home arrival geometry and shared-hall portal-arrival geometry alongside existing permissions, revision conflicts, movement, access-loss and chat recovery checks.
- The UI mechanical detector returned no findings. Desktop/phone captures were inspected; reports and screenshots are under ignored `.impeccable/review/world-polish` and the existing world/social review folders.

These are local and simulated checks. Physical iPhone/Safari focus zoom, assistive technology and live multi-user network behavior remain unverified. No hosted data, migrations, deployments, commits or pushes are included.
