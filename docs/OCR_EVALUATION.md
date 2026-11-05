# Local OCR evaluation for the image milestone

Status: research only. Image upload and OCR are not implemented.

## Candidate

Tesseract.js runs recognition in a browser worker and supports language data for English and Vietnamese. Its default setup may fetch the worker, WebAssembly core and trained data from third-party hosts. Language models can also be cached in the browser. These defaults must not be mistaken for fully offline operation or used without explaining the network and storage behavior.

Sources: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [API options](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), and [performance guidance](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md).

## Implementation gates

- Pin and review the library and English/Vietnamese language assets, including licenses and sizes.
- Serve worker, compatible WASM variants, and language assets from the application origin; do not upload images. Describe any downloads and avoid persisting user images or OCR text without consent.
- Lazy-load OCR only when selected; bound image dimensions and file sizes; terminate workers and release object URLs.
- Test startup and recognition failures, slow loading, cancellation, invalid formats, and low quality images. Review worker error handling and memory costs before choosing a version.
- Show extracted text for user correction before the existing deadline review. Do not claim perfect OCR or offline availability without end-to-end verification.

A separate local sample-image prototype and browser privacy/network inspection are required before enabling the feature. Phase 2 calendar import and accessibility checks remain open.

## Candidate comparison and decision criteria

- **Tesseract.js**: browser worker architecture with separate worker, core and language resources. The [project documentation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) explains local paths; the [project license](https://github.com/naptha/tesseract.js/blob/master/LICENSE.md) and each distributed model and core dependency must be checked at the exact selected version. Its English/Vietnamese models and browser performance have not yet been evaluated in this repository.
- **Ocrad.js**: browser-oriented OCR with no separately trained model download according to its [project documentation](https://github.com/antimatter15/ocrad.js). Its repository states GPL-3.0 licensing, and Vietnamese accuracy and compatibility with this project's distribution requirements have not been established. A smaller download alone is not sufficient to select it.

No engine is selected for production yet. Compare both using locally generated, non-sensitive Vietnamese and English examples and record accuracy, time, memory, download sizes, supported browsers, failure behavior and complete license notices. Until this is done, OCR remains planned and the evaluation issue stays open.
