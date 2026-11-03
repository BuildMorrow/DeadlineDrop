# Architecture

DeadlineDrop is a static React and TypeScript frontend. It keeps input and candidates in browser memory.

## Responsibilities and flow

src/app owns the interface and review state; src/features/extraction detects explicit dates and times; src/features/calendar validates confirmed events and serializes ICS; src/styles holds shared styling. Tests live in tests, project documents in docs, and collaboration and CI configuration in .github.

Text input -> deterministic local extraction with source context and warnings -> user editing and explicit confirmation -> ICS generation and browser download. Ambiguous or missing dates are left empty. Missing times are flagged for review. Timed events are converted from browser-local time to UTC; all-day events use calendar dates. No duration is inferred for timed events.

## Testing and privacy

Vitest covers representative extraction and calendar serialization cases. CI runs lint, type checking, tests and build. User content remains in the browser; avoid logging, analytics, or network transmission of content. Optional future AI requires explicit consent and a separate privacy design.
