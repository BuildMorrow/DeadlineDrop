# DeadlineDrop

**Turn anything into a deadline.**

DeadlineDrop is a free, open-source, privacy-first tool for turning scheduling information into calendar events. Manually transferring dates from messages is repetitive and error-prone.

## Current status

The v0.1 text workflow is available for initial use: paste English or Vietnamese text, review and edit candidate events, confirm them, and export an ICS file. Processing happens locally in your browser. This is deterministic, limited parsing, not general language understanding: check every result against the original.

The v0.2 image-to-text workflow is implemented: choose a PNG, JPEG, or WebP image (up to 8 MB and 16 megapixels), select English or Vietnamese, and review the recognized text before replacing the input. OCR can misread text and dates. The image stays in the browser; OCR code and language models are downloaded from the same site when used. Initial loading may be slow and offline availability is not guaranteed.

An experimental PDF-to-text workflow reads selectable text from PDF files locally (up to 8 MB, 20 pages and 100,000 extracted characters). Empty pages are reported. Experimental OCR reads up to five selected pages sequentially in English or Vietnamese; it renders pages locally, downloads OCR resources from this site when needed, and requires review before adding each result. Each rendered page is limited to 16 megapixels, and each batch to 100,000 recognized characters. Browser and real scanned-document verification remain outstanding; OCR can misread dates. Check all extracted text against the original before using it.

During event review, an optional user-written checklist can be marked complete and included as plain text in the exported event description. Completion is shown as `[x]` or `[ ]`; it is not an interactive task list in the calendar and is not saved between page sessions. Changing a checklist requires event confirmation again.

Optional local drafts save the current message and reference date/time zone only when you choose to save. You can keep up to ten named drafts, load them and delete them in the same browser profile. Event edits, confirmations, images and PDFs are not saved; loaded text must be extracted and reviewed again.

Drafts can also be exported as an unencrypted JSON file and imported after reviewing the draft names. Import adds drafts without replacing existing ones; conflicts or limits prevent the whole import. Keep backup files private because they contain the original text.

Use one event per line and include a four-digit year. Supported dates include ISO (2027-05-25), numeric dates (25/05/2027 or 05/25/2027), Vietnamese (25 tháng 5 năm 2027), and English month names (May 25, 2027). Ambiguous numeric dates require manual entry. Times include 14:30, 2:30 pm and 14 giờ 30. A missing time requires an explicit all-day confirmation or a time. Supported timezone clues include UTC/GMT, UTC/GMT with numeric offsets (for example GMT+7 or UTC-05:00), positive numeric offsets after the time, and ISO timestamps with optional `00` seconds and an offset or Z. The result is converted to the browser's displayed timezone and offset. A bare negative offset such as `14:30-05:00` is indistinguishable from a time range: choose the intended interpretation before confirming. Ranges require explicit selection and an end date; am/pm and Vietnamese ranges require manual entry of both endpoints; cross-midnight ranges require correction of that end date. Malformed offsets, conflicting timezone expressions, and ISO offsets without a colon are flagged for manual correction. IANA zone names and common timezone abbreviations such as PST are not interpreted: edit the local date and time to resolve them. Detection cannot cover every natural-language timezone reference; check the source carefully. Repeated daylight-saving times require an occurrence choice, including in the selected reference timezone; nonexistent times must be corrected. The v0.3 parser supports today/tomorrow, hôm nay/ngày mai, “in N days” and “sau N ngày” with a user-selected reference date and IANA time zone. It converts unambiguous timed results to the browser time zone. Weekdays, mixed or unclear expressions require manual correction. Some independently dated sentences can be separated, but check each result against the whole message; date ranges and other multi-event text are not reliably interpreted. Timed events without an end time have no inferred duration. Manual browser and calendar import checks are listed in [QA checklist](docs/QA_CHECKLIST.md).

## How to use

Use the language selector to choose English or Vietnamese, and the theme button to switch between dark and light. These choices last for the current page session and are not saved. Loading an example or transferring image/PDF text asks for confirmation before replacing an existing message and clearing its review.

To start from an image, open **Read text from an image**, choose a supported file and its language, and select **Read image**. Correct the recognized text, then select **Use this text** to replace the current message or **Add to message** to append it. Either action clears the current event review. Continue with the text workflow below; check all dates against the original image.

For a PDF, open **Read text from a PDF**, choose a file, and compare the extracted text by page with the original. Empty pages are identified. Optionally select pages and rebuild the combined text; rebuilding replaces any edits to that text. To try OCR, select a page or a range of up to five pages and the language, then review each result before adding it. A canceled batch retains completed results and marks unprocessed pages; failed or empty pages need separate review. OCR results are appended to the combined text in the order you add them, so check their order against the PDF. Clear the batch before reading another range; clearing unadded results asks for confirmation. Rebuilding selected-page text also replaces any OCR text already added. After changing the selection, rebuild the text or restore the previous selection before using it. Edit the combined text, then choose **Use this text** to replace the message or **Add to message** to append it. The page view shows the original extraction, not subsequent edits. Either transfer clears the event review. Complex layouts may not preserve reading order or spacing; always check dates and times against the PDF.

Paste a message containing dates, preferably one event per line. For relative dates, open **Relative date settings** and choose the date and IANA time zone the message refers to, then select **Find dates**. Changing either reference clears the current review. Open **Original text** for each candidate and compare it with the message, edit any details, resolve warnings and confirm the events you want. Collapsing original text only hides it from view; event titles and the input remain visible. Choose **Export .ics** and import the downloaded file into your calendar. The app does not infer a duration for timed events without an end time, but calendar applications may add one on import; check the imported event. See [calendar import instructions](docs/CALENDAR_IMPORT.md).

For longer messages, open **Event overview** to search titles, filter by review status and jump to a candidate's review card. Dates that cannot be resolved are listed separately. This is a navigation aid: filters do not change which confirmed events are exported.

Inside the overview, **Calendar view** displays the filtered candidates by resolved local date. Use the month controls or arrow keys to navigate days, then choose an event to return to its review card. Candidates with unresolved dates are counted but never placed on a day. The calendar does not create, confirm or export events.

The review also highlights possible duplicates and overlapping timed ranges. Duplicate suggestions require matching normalized titles and start dates or instants. Overlaps are checked only when both timed events have explicit end times; unresolved events and timed events without an end are reported as not fully checked. All-day events are not treated as blocking the whole day. The check is limited to the first 500 candidates and 100 matching pairs, and never automatically merges, changes or blocks events. A clean result does not guarantee there are no conflicts.

## Offline and installation

The production build includes a web app manifest and caches the text-workflow shell after successful installation of the service worker. OCR and PDF resources are not included in the offline cache. Availability depends on the browser and its stored cache; see [offline and installation details](docs/OFFLINE.md).

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

React, TypeScript, Vite, Tailwind CSS, Tesseract.js, Vitest, ESLint and GitHub Actions. The app can be hosted as a static website. The v0.2 image and scoped v0.3 smart-extraction workflows are implemented; experimental PDF text extraction, page OCR and manual checklists are in progress for v1.0; optional AI remains planned. Broader browser, device, privacy-network and OCR-core license reviews remain outstanding before a public release. See the [roadmap](docs/ROADMAP.md) and [master roadmap](docs/MASTER_ROADMAP.md).

## Privacy and security

Input stays in the browser; the application has no backend, account, server database, mandatory API key or analytics. Optional drafts are stored unencrypted in this browser's local storage until deleted or storage is cleared, and are accessible to others using the same browser profile; do not save sensitive content on a shared device. Browser storage can be evicted and is not a backup. Review all results before exporting. Future optional AI features require a separate privacy design.

For vulnerability reporting, see [SECURITY.md](SECURITY.md).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). DeadlineDrop is licensed under the [MIT License](LICENSE); OCR components have separate [third-party notices](public/third-party-notices.txt).

## Screenshots

Screenshots will be added after the public demo has been reviewed; none are available yet.

## GitHub Pages deployment

The deployment workflow is manual to avoid publishing without approval. After the changes are merged, open repository **Settings → Pages**, choose **GitHub Actions** as the build source, then run **Deploy GitHub Pages** from the Actions tab on the approved main revision. Check the workflow result and open the reported Pages URL, including `/DeadlineDrop/`, to verify the live site and assets. The live demo has not yet been verified.

## Repository topics

Suggested GitHub topics: `open-source`, `productivity`, `calendar`, `typescript`, `react`, `privacy`, and `ics`.
