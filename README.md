# DeadlineDrop

**Turn anything into a deadline.**

DeadlineDrop is a free, open-source, privacy-first tool for turning scheduling information into calendar events. Manually transferring dates from messages is repetitive and error-prone.

## Current status

The v0.1 text workflow is available for initial use: paste English or Vietnamese text, review and edit candidate events, confirm them, and export an ICS file. Processing happens locally in your browser. This is deterministic, limited parsing, not general language understanding: check every result against the original.

The v0.2 image-to-text workflow is implemented: choose a PNG, JPEG, or WebP image (up to 8 MB and 16 megapixels), select English or Vietnamese, and review the recognized text before replacing the input. OCR can misread text and dates. The image stays in the browser; OCR code and language models are downloaded from the same site when used. Initial loading may be slow and offline availability is not guaranteed.

Use one event per line and include a four-digit year. Supported dates include ISO (2027-05-25), numeric dates (25/05/2027 or 05/25/2027), Vietnamese (25 tháng 5 năm 2027), and English month names (May 25, 2027). Ambiguous numeric dates require manual entry. Times include 14:30, 2:30 pm and 14 giờ 30. A missing time requires an explicit all-day confirmation or a time. Supported timezone clues include UTC/GMT, UTC/GMT with numeric offsets (for example GMT+7 or UTC-05:00), positive numeric offsets after the time, and ISO timestamps with optional `00` seconds and an offset or Z. The result is converted to the browser's displayed timezone and offset. A bare negative offset such as `14:30-05:00` is indistinguishable from a time range: choose the intended interpretation before confirming. Ranges require explicit selection and an end date; cross-midnight ranges require correction of that end date. Malformed offsets, conflicting timezone expressions, and ISO offsets without a colon are flagged for manual correction. IANA zone names and common timezone abbreviations such as PST are not interpreted: edit the local date and time to resolve them. Detection cannot cover every natural-language timezone reference; check the source carefully. Repeated daylight-saving times require an occurrence choice, including in the selected reference timezone; nonexistent times must be corrected. The v0.3 parser supports today/tomorrow, hôm nay/ngày mai, “in N days” and “sau N ngày” with a user-selected reference date and IANA time zone. It converts unambiguous timed results to the browser time zone. Weekdays, mixed or unclear expressions require manual correction. Some independently dated sentences can be separated, but check each result against the whole message; date ranges and other multi-event text are not reliably interpreted. Timed events without an end time have no inferred duration. Manual browser and calendar import checks are listed in [QA checklist](docs/QA_CHECKLIST.md).

## How to use

To start from an image, open **Read text from an image**, choose a supported file and its language, and select **Read image**. Correct the recognized text, then select **Use this text**. This replaces the current input and clears its event review. Continue with the text workflow below; check all dates against the original image.

Paste a message containing dates, preferably one event per line. For relative dates, choose the date and IANA time zone the message refers to, then select **Find dates**. Changing either reference clears the current review. Review the original text and each candidate, edit any details, resolve warnings and confirm the events you want. Choose **Export .ics** and import the downloaded file into your calendar. The app does not infer a duration for timed events without an end time, but calendar applications may add one on import; check the imported event.

## Getting started

Install Node.js 20.19 or newer within the Node 20 LTS line (or Node 22.13+ / 24+) and npm, then run `npm install` and `npm run dev`. Open the local URL printed by Vite.

## Development commands

- `npm run dev` — start the development server.
- `npm run build` — type-check and create a production build.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint.
- `npm run typecheck` — check TypeScript types.
- `npm test` — run Vitest.

## Technology and roadmap

React, TypeScript, Vite, Tailwind CSS, Tesseract.js, Vitest, ESLint and GitHub Actions. The app can be hosted as a static website. The v0.2 image workflow is implemented; PDF support, checklists and optional AI are planned for v1.0. Broader browser, device, privacy-network and OCR-core license reviews remain outstanding before a public release. See the [roadmap](docs/ROADMAP.md) and [master roadmap](docs/MASTER_ROADMAP.md).

## Privacy and security

Input stays in the browser; the application has no backend, account, database, mandatory API key or analytics. Review all results before exporting. Future optional AI features require a separate privacy design.

For vulnerability reporting, see [SECURITY.md](SECURITY.md).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). DeadlineDrop is licensed under the [MIT License](LICENSE); OCR components have separate [third-party notices](public/third-party-notices.txt).

## Screenshots

Screenshots will be added after the public demo has been reviewed; none are available yet.

## GitHub Pages deployment

The deployment workflow is manual to avoid publishing without approval. After the changes are merged, open repository **Settings → Pages**, choose **GitHub Actions** as the build source, then run **Deploy GitHub Pages** from the Actions tab on the approved main revision. Check the workflow result and open the reported Pages URL, including `/DeadlineDrop/`, to verify the live site and assets. The live demo has not yet been verified.

## Repository topics

Suggested GitHub topics: `open-source`, `productivity`, `calendar`, `typescript`, `react`, `privacy`, and `ics`.
