# Architecture

DeadlineDrop is a static React and TypeScript frontend. It keeps input and candidates in browser memory.

## Responsibilities and flow

src/app owns the interface and review state; src/features/extraction detects explicit dates and times; src/features/calendar validates confirmed events and serializes ICS; src/styles holds shared styling. Tests live in tests, project documents in docs, and collaboration and CI configuration in .github.

Text input -> deterministic local extraction with source context and warnings -> user editing and explicit confirmation -> ICS generation and browser download. Ambiguous or missing dates are left empty. Missing times are flagged for review. Temporal converts supported explicit offsets to browser-local values and detects nonexistent or repeated local times. Repeated times require an occurrence choice; unsupported zones and time ranges require explicit review. Timed events are exported as UTC instants, with an end only when supplied; all-day events use timezone-independent calendar dates and require an exclusive end date within the four-digit ICS year range. No duration is inferred.

Experimental image input runs Tesseract.js in a browser worker. The build copies the pinned worker, WASM variants and language data from installed dependencies into same-origin static assets; they are loaded on demand and language caching is disabled. Images are not uploaded. OCR text is editable and must be explicitly transferred to the text input before the existing review flow. File type, byte size and decoded pixel count are limited; OCR may still fail or misread text.

## Testing and privacy

Vitest covers representative extraction and calendar serialization cases. CI runs lint, type checking, tests and build. User content remains in the browser; avoid logging, analytics, or network transmission of content. Optional future AI requires explicit consent and a separate privacy design.

Explicit offsets are converted using Temporal. A bare negative offset overlaps with range syntax and requires an explicit choice. Unsupported zone clues require editing both the local date and time before applying a correction. This is a limited parser and cannot identify every natural-language zone. See the manual QA checklist before release.
