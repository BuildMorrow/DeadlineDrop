# Architecture

DeadlineDrop is a static React and TypeScript frontend. It keeps active input and candidates in browser memory. Optional user-initiated drafts store only message text and reference settings in localStorage; they never restore candidates or confirmations. Saved draft data is versioned and validated before use. JSON backup import validates the entire file, previews names and performs one storage write only after explicit approval; duplicate names or IDs, invalid data and size limits prevent import without changing existing drafts.

## Responsibilities and flow

src/app owns the interface and review state; src/features/extraction detects explicit dates and times; src/features/calendar validates confirmed events and serializes ICS; src/styles holds shared styling. Tests live in tests, project documents in docs, and collaboration and CI configuration in .github.

For supported relative expressions, users provide a reference calendar date and IANA timezone; changing either clears the review. Unambiguous timed results are converted to the browser timezone. DST overlaps in the reference zone require selecting an occurrence; gaps and mixed or unclear expressions require manual correction. Weekday expressions are detected but not automatically resolved. Independently dated sentences may be separated; contextual or range clues keep candidates blocked for review.

Text input -> deterministic local extraction with source context and warnings -> user editing and explicit confirmation -> ICS generation and browser download. Ambiguous or missing dates are left empty. Missing times are flagged for review. Temporal converts supported explicit offsets to browser-local values and detects nonexistent or repeated local times. Repeated times require an occurrence choice; unsupported zones and time ranges require explicit review. Unsupported am/pm and Vietnamese time ranges require explicit correction of both endpoints. Timed events are exported as UTC instants, with an end only when supplied; all-day events use timezone-independent calendar dates and require an exclusive end date within the four-digit ICS year range. No duration is inferred.

Image input runs Tesseract.js in a browser worker. The build copies the pinned worker, WASM variants and language data from installed dependencies into same-origin static assets; they are loaded on demand and language caching is disabled. Images are not uploaded. OCR text is editable and must be explicitly transferred to the text input before the existing review flow. File type and byte size are limited; PNG, JPEG and WebP dimensions are checked from headers before decoding and again after decoding. These checks reduce but do not eliminate risks from malformed files. The application owns the native worker so it can stop startup on cancellation or timeout. Its adapter uses the pinned Tesseract.js 7 worker protocol and must be reviewed and browser-tested when upgrading. OCR may still fail or misread text.

## Testing and privacy

Vitest covers representative extraction and calendar serialization cases. CI runs lint, type checking, tests and build. User content remains in the browser; avoid logging, analytics, or network transmission of content. Optional drafts are unencrypted and available to the same browser profile, and browser storage may be cleared or evicted. Optional future AI requires explicit consent and a separate privacy design.

Explicit offsets are converted using Temporal. A bare negative offset overlaps with range syntax and requires an explicit choice. Unsupported zone clues require editing both the local date and time before applying a correction. This is a limited parser and cannot identify every natural-language zone. See the manual QA checklist before release.


Experimental PDF input reads local file bytes with the pinned PDF.js 5.5.207 in a same-origin worker. The version supports the project Node 20 baseline; review advisories and upgrade to a supported patched release when the Node baseline can be raised. It limits file size, page count, and extracted characters, disables script evaluation and XFA, and requires the user to review and explicitly transfer text. No OCR is performed for scanned pages; empty pages are reported. PDF reading order may not match the visual layout. PDF code and worker are loaded on demand and are excluded from the PWA offline shell.
