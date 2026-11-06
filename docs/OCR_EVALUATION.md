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

No engine is selected for production yet. The comparison below uses locally generated, non-sensitive Vietnamese and English examples and records measured results and outstanding gaps. OCR remains planned; complete license notices, representative accuracy, browser support, and failure handling must be verified before shipping it.

## Initial local experiment — 2026-11-05

On Windows x64 with Node.js 20.20.0, two synthetic 1100 × 120 PNGs were generated locally using Arial at 38px on a white background. No user content was used. The runs used local npm packages and local language files; times are single runs, including Tesseract worker startup and termination, so they are not a benchmark of browser startup or typical screenshots.

| Engine | English sample | Vietnamese sample | Single-run elapsed time |
| --- | --- | --- | --- |
| Tesseract.js 7.0.0, core 7.0.0 | Exact: `Submit report 2027-05-20 14:30` | Exact: `Nộp bài 25 tháng 5 năm 2027 lúc 14 giờ 30` | 0.46s English; 0.42s Vietnamese |
| Ocrad.js 0.0.1 | Exact | `N_p bài 25 tháng 5 näm 2027 lúc 14 giò 30` | 0.018s English; 0.020s Vietnamese |

The compressed `4.0.0_best_int` English and Vietnamese model files from npm data packages 1.0.0 measured 2,952,873 and 1,423,003 bytes respectively. The installed package metadata declares Apache-2.0 for Tesseract.js and its core, MIT for the data wrappers, and GPL-3.0 for Ocrad.js. Wrapper metadata does not establish the licenses of all bundled model files or transitive artifacts; those still require review.

These two clean images do not establish real-world accuracy, browser compatibility, peak memory, network isolation, or low-quality image behavior. Tesseract.js merits further investigation; this is not a production selection. Browser tests with varied screenshots, exact asset license review, and a resource/privacy audit remain necessary before closing the evaluation.

### Additional synthetic image checks

Using the same machine and packages, one English and one Vietnamese line were rendered in Arial at 28px on 1000 × 100 PNGs. Three variants per line were tested: clear, Gaussian blur radius 1.3, and four-degree rotation. Tesseract.js returned the exact source text for all six images. Ocrad.js made character errors in all six, including errors in dates as well as Vietnamese diacritics. This tiny synthetic set is not a representative accuracy estimate; actual screenshots, compression, backgrounds and handwriting may behave differently.

In these single local Node runs, worker creation took about 0.27s per language. Reported process RSS ranged from 88 to 112 MiB during the runs; this includes the Node runtime and both engines, is not isolated peak memory, and does not predict browser memory. Recognition timings combined both engines and file reading and should not be compared as individual engine speeds.

Uncompressed installed artifacts measured 62,961 bytes for `tesseract.min.js`, 111,307 bytes for its worker, and 2,855,361 bytes for one LSTM WASM variant; other core variants differ and may be required for browser compatibility. The Ocrad.js file measured 1,154,934 bytes. These exclude the language files and transport compression; actual app bundle and network behavior remain unmeasured. OCR is not part of the application.

## Browser prototype — 2026-11-06

A disposable prototype was served on localhost in the in-app browser on Windows. Using Tesseract.js 7.0.0 with worker, core and language paths pointed to local copies, `cacheMethod: 'none'` and `workerBlobURL: false`, the English and Vietnamese clear synthetic images produced the exact source text. The recognized Vietnamese text was edited in a textarea, and attempting recognition without an image displayed a message. The prototype was removed after the experiment and is not an application feature.

The configuration specifies same-origin resources, but a complete browser network trace, offline test, failed-model/cancellation handling, and memory profiling were not performed. In particular, the prototype retained earlier text while a new recognition was loading, so a future implementation must avoid presenting stale output as a new result. The observed package metadata licenses are recorded above. Upstream [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) describes Apache-2.0 data, but the exact provenance and notices of the packaged `4.0.0_best_int` artifacts remain to be checked before distribution.

**Evaluation outcome:** Tesseract.js is the preferred candidate for a future, separately reviewed prototype because it recognized Vietnamese more accurately than Ocrad.js on these samples and its package license is permissive. This is not a production approval. Real screenshot quality, complete license provenance, browser compatibility, network/privacy inspection, resource limits, error handling, and accessibility remain release gates for any OCR feature.
