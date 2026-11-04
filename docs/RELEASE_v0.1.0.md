# DeadlineDrop v0.1.0 — draft release notes

DeadlineDrop is a free, open-source, browser-based tool for turning text into reviewed calendar events. This release is pending review and verification.

## Features

- Extract candidate dates and times from English and Vietnamese text.
- Review, edit, remove and confirm events before exporting an ICS file.
- Support all-day events, explicit UTC offsets, time ranges and DST disambiguation with user review.

## Privacy and security

Content is processed locally in the browser; no account, backend or paid API is required. See SECURITY.md for reporting vulnerabilities.

## Limitations

Parsing is deterministic and limited. Review the source and every result, especially ambiguous dates, time zones and ranges. Natural-language timezone references are not all recognized. No duration is invented for timed events without an end time. Image OCR and PDF input are planned, not implemented. External calendar compatibility and the public demo still require verification.

## Getting started

Install Node.js 20 or newer, run `npm install` and `npm run dev`, and open the local URL printed by Vite. A live demo link will be added after deployment and verification.
