# DeadlineDrop master roadmap

This document describes planned work, dependencies and release gates. Complexity estimates are relative (S, M, L, XL), not delivery dates. Only verified behavior should be described as complete.

## Current audit

Phase 0 foundation and the v0.1 text workflow are implemented. The app runs locally in React, TypeScript and Vite, uses Temporal for local timezone resolution, and generates ICS after review. It has deterministic parsing with known language and timezone limitations. Representative ICS output is parsed by an independent iCalendar parser and four synthetic events were imported into Google Calendar; Google added a one-hour duration for timed events without an end. The owner chose to close issue #5 while deferring screen-reader verification; full accessibility and physical-device QA remain incomplete. GitHub Pages deployment and v0.1.0 release remain unverified. The v0.2 local image OCR scope is implemented; smart relative dates, PWA and PDF support are planned, not implemented.

## Milestones

| Priority | Phase | Status | Complexity | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| P0 | 2 — v0.1.0 public preview | In progress | L | Existing text workflow | Regression and integration tests pass; browser, keyboard and mobile QA recorded; valid ICS imported into real calendar apps; production subpath verified; privacy and known limits documented; owner approves deployment and release. |
| P1 | 3 — v0.2 image to calendar | Implementation complete; release verification deferred | XL | Phase 2 review/export and local OCR evaluation | Validated image input and local English/Vietnamese OCR; editable extracted text; error states; user-reviewed ICS; sample-image tests; resources and privacy documented. |
| P1 | 4 — v0.3 smart extraction | Planned | XL | Phase 2 correctness baseline | Regression corpus for paragraphs, ranges and language formats; editable reference date/timezone for relative dates; unsupported information remains unresolved and blocks unsafe export. |
| P1 | 5 — v0.4 UX and accessibility | Planned | L | Phase 2 usable UI; phase 3/4 interactions | Responsive dark/light themes, English/Vietnamese localization, keyboard and assistive technology checks, WCAG 2.2 AA review, optional disclosed local drafts if implemented. |
| P1 | 6 — v0.5 calendar integration | Planned | L | Stable event data model | Standards validation of ICS, correct times and encoding, tested imports, batch export and documented calendar instructions; no automatic event creation or OAuth without approval. |
| P2 | 7 — v0.6 PWA and offline | Planned | L | Stable static app and asset strategy | Installable manifest; tested offline support and safe update/cache behavior; no sensitive content cached unintentionally; offline OCR only claimed after verification. |
| P2 | 8 — v1.0 documents | Planned | XL | OCR, extraction and event review | Local PDF text extraction, safe file limits and errors, multi-page review, scanned-document handling where feasible, event checklists and local privacy verification. |
| P2 | 9 — open-source growth | Planned / ongoing | M | Verified product and release evidence | Accurate documentation, verified screenshots, contributor tasks and launch copy; publication requires owner approval. |

## Actionable tasks and risks

1. **P0 correctness:** Expand regression and browser tests for ISO, invalid dates, explicit offsets, ranges, DST gaps/overlaps and user confirmation; preserve source context and never fabricate details.
2. **P0 calendar compatibility:** Validate ICS escaping, folding, dates and timezone instants; manually import into real calendar clients. External imports remain a release blocker until recorded.
3. **P0 accessibility and QA:** Check mobile at narrow and wide viewports, keyboard focus, labels, warnings, long text, and screen readers. Record actual results in `QA_CHECKLIST.md`.
4. **P0 release:** Run clean install, lint, typecheck, tests in three timezones, build and audit; verify Pages asset paths and live URL only after approval; prepare release notes without creating a tag.
5. **P1 OCR evaluation:** Compare client-side OCR engines, language resources, licensing, memory use, cold-start time and offline/network behavior before selecting a dependency; avoid uploading images.
6. **P1 extraction:** Expand the explicit-date regression corpus and refine the proposed reference-date model in `RELATIVE_DATES.md` before implementing relative expressions or multiple dates per paragraph.
7. **P1 usability:** Apply accessible semantics, contrast, focus management and non-decorative visual design; verify with actual users and assistive technologies.
8. **P2 privacy/security:** Treat image/PDF inputs as untrusted, limit resource use, avoid persistent content caches and third-party tracking. Optional AI requires separate approval.
9. **P2 community:** Maintain issues and contributor guidance with accurate, non-fabricated screenshots and release history.

## Release requirements

A milestone requires implementation, relevant automated tests, passing lint/typecheck/test/build, documented security status, updated documentation and recorded manual QA or an explicit release blocker. The owner has accepted deferring the outstanding v0.2 verification to close its implementation phase; this does not establish production readiness or resolve licensing obligations. Deployment and publication require owner approval. GitHub green checks alone do not prove calendar compatibility or accessibility. Avoid adding a backend, database, paid service or mandatory API key without approval.
