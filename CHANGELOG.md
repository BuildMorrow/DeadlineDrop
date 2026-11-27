# Changelog

## Unreleased — v1.0 document input (in progress)

- Add experimental local PDF selectable-text extraction, with file, page and extracted-text limits, cancellation and required text review.
- Warn when pages have no selectable text; scanned PDF OCR remains unsupported.
- Allow users to write an optional checklist for each event, exported as plain text in its calendar description.
- Allow checklist completion to be reviewed before export; preserve completion markers in the description.

## Unreleased — v0.6 PWA and offline (in progress)

- Notify users when an update is waiting without automatically reloading or discarding their work.
- Fall back to the network if the application shell cache cannot be read.
- Add a scoped web app manifest and offline cache for the production text-workflow shell.
- Keep user content and OCR assets out of the service worker cache; updates do not force active pages to reload.

## Unreleased — v0.5 calendar integration

- Reject event titles containing invalid control characters or unpaired Unicode surrogates instead of generating invalid calendar content.
- Test multi-event downloads and calendar interoperability; document import steps and provider privacy.

## Unreleased — v0.4 UX and accessibility

- Add English/Vietnamese interface and dark/light theme controls without persisting user content.
- Preserve keyboard focus after removing events and announce review counts.
- Label event groups and associate date and time fields with their uncertainty warnings.

## Unreleased — v0.3 smart extraction

- Interpret today/tomorrow, hôm nay/ngày mai and day counts using a user-selected reference date and IANA timezone; convert unambiguous timed results to the browser timezone.
- Detect weekday expressions for manual correction and separate independently dated sentences with a review warning.
- Require a source-timezone DST occurrence choice before converting repeated relative times; preserve the chosen instant in ICS.
- Require both endpoints when correcting unsupported am/pm and Vietnamese time ranges.
- Permit explicit all-day correction for an uncertain date.
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
