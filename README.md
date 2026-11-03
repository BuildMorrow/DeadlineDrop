# DeadlineDrop

**Turn anything into a deadline.**

DeadlineDrop is a free, open-source, privacy-first project intended to turn natural-language messages and documents into structured calendar events. Important dates arrive in many places; copying them into a calendar by hand is repetitive and error-prone.

## Status

Phase 0 provides a development foundation and an informational application shell. Extraction, review, and calendar export are not implemented yet.

## Planned features

- v0.1: paste English or Vietnamese text, review and edit potential events, and export selected events as an ICS file.
- v0.2: extract text from images and screenshots using OCR.
- v1.0: support PDFs, multiple deadlines, checklists, improved language understanding, and optional AI assistance.

See the [roadmap](docs/ROADMAP.md) for milestones. These are plans, not available features.

## Getting started

Install Node.js 20 or newer and npm, then run `npm install` and `npm run dev`. Open the local URL printed by Vite.

## Development commands

- `npm run dev` — start the development server.
- `npm run build` — type-check and create a production build.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint.
- `npm run typecheck` — check TypeScript types.
- `npm test` — run Vitest.

## Technology

React, TypeScript, Vite, Tailwind CSS, Vitest, ESLint and GitHub Actions. The frontend is intended to be deployable as a static website.

## Privacy

The initial product is intended to process content locally, without a backend, account, database, or mandatory API key. Missing information must not be silently invented, and users must review results before export. Future optional AI features require careful privacy design.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Licensed under the [MIT License](LICENSE).
