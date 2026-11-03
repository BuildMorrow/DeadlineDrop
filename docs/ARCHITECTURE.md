# Architecture

The planned application is a static React and TypeScript frontend. Phase 0 contains only an informational shell; no extraction or export pipeline exists yet.

## Responsibilities

`src/app` owns application composition, `src/styles` shared styling, and `src/components` will hold reusable UI when needed. Future `src/features/extraction`, `review`, and `calendar` modules will own their respective workflows; `src/lib` will contain genuinely shared utilities. `tests` contains tests; `public` holds static assets; `docs` holds project documentation; `.github` contains collaboration and CI configuration. Empty feature directories are deferred until needed.

## Proposed flow

Text input -> local extraction of candidate events and uncertainty -> user review and correction -> selection -> ICS generation and download. The extraction pipeline should preserve source context and explicitly represent missing or ambiguous values rather than guessing. Dates, time zones, all-day events and ICS escaping require careful design and tests.

## Testing and privacy

Use Vitest for behavior and edge cases, including ambiguous dates and calendar serialization, and test accessible user flows as they are implemented. CI runs lint, type checking, tests and build. User content should remain in the browser; avoid logging, analytics, or network transmission of content. Optional future AI requires explicit consent and a separate privacy design.
