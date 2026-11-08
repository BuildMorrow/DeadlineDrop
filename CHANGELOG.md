# Changelog

## Unreleased — v0.3 smart extraction (in progress)

- Interpret today/tomorrow, hôm nay/ngày mai and day counts using a user-selected reference date and IANA timezone; convert unambiguous timed results to the browser timezone.
- Detect weekday expressions for manual correction and separate independently dated sentences with a review warning.
- Block mixed or unclear relative-date expressions for manual correction and clear review when the reference changes.
- Recognize Vietnamese times such as “9 giờ” at the end of a sentence.

## Unreleased — v0.2 image workflow

- Read supported PNG, JPEG and WebP images locally using English or Vietnamese OCR.
- Edit recognized text before transferring it to the existing event review and export workflow.
- Validate image size and dimensions, handle errors and cancellation, and stop stalled OCR startup.
- Add automated synthetic OCR samples and third-party license notices; broader browser, network privacy and compiled-core license verification remain outstanding.

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

PDF support remains planned for a later release.
