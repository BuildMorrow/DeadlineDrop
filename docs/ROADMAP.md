# Roadmap

The v0.1 text workflow and v0.2 image workflow are implemented with limited deterministic parsing. Public release verification remains outstanding; later milestones are planned.

## v0.1 — Text to calendar

- Local English and Vietnamese text extraction with explicit uncertainty.
- Review, edit, remove and select candidates before export.
- All-day and timed events and ICS export.

## v0.2 — Image to calendar (implementation complete)

- Local English and Vietnamese OCR for PNG, JPEG and WebP, with editable recognized text feeding the existing review and export workflow.
- The owner has deferred broader accuracy, browser, privacy-network, accessibility and OCR-core licensing verification; these remain unresolved release risks, not completed checks.

## v0.3 — Smart extraction (in progress)

- Today/tomorrow, hôm nay/ngày mai and day counts use a user-selected reference date and IANA timezone; unambiguous times are converted to the browser timezone.
- Independently dated sentences can be separated; ambiguous weekdays and linked dates require correction.
- Broader language understanding, source-zone DST disambiguation and representative real-world evaluation remain future improvements.

## v1.0 — Document to calendar

- PDF input and multiple deadlines, event checklists, and improved language understanding.
- Optional AI-assisted extraction with an explicit privacy design.

