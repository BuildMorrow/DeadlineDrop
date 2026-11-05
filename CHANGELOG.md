# Changelog

## Unreleased — v0.1.0 preparation

- Extract candidate dates and times from English and Vietnamese text locally.
- Review, edit, remove and confirm events before ICS export.
- Support all-day events, explicit offsets, time ranges and DST disambiguation with user review.
- Fix ISO timestamps with a numeric offset and no seconds being interpreted in the browser timezone.
- Block malformed, conflicting or unsupported timezone offsets for manual correction.
- Validate representative ICS exports with an independent iCalendar parser in automated tests.
- Expand English and Vietnamese extraction regression cases and document a proposed relative-date model.
- Keep all-day dates independent of local timezone transitions and reject dates outside the ICS year range.
- Prepare manual GitHub Pages deployment and a public preview QA checklist.

Image OCR and PDF support remain planned for later releases.
