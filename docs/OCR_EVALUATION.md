# Local OCR evaluation for the image milestone

Status: the v0.2 local image OCR implementation is complete. The owner chose to defer the outstanding production verification described below; those checks and licensing questions remain unresolved.

## Candidate

Tesseract.js runs recognition in a browser worker and supports language data for English and Vietnamese. Its default setup may fetch the worker, WebAssembly core and trained data from third-party hosts. Language models can also be cached in the browser. These defaults must not be mistaken for fully offline operation or used without explaining the network and storage behavior.

Sources: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [API options](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), and [performance guidance](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md).

## Implementation gates

- Pin and review the library and English/Vietnamese language assets, including licenses and sizes.
- Serve worker, compatible WASM variants, and language assets from the application origin; do not upload images. Describe any downloads and avoid persisting user images or OCR text without consent.
- Lazy-load OCR only when selected; bound image dimensions and file sizes; terminate workers and release object URLs.
- Test startup and recognition failures, slow loading, cancellation, invalid formats, and low quality images. Review worker error handling and memory costs before choosing a version.
- Show extracted text for user correction before the existing deadline review. Do not claim perfect OCR or offline availability without end-to-end verification.

The feature uses same-origin resources; a complete browser privacy/network inspection and broader accessibility checks remain required before release.

## Candidate comparison and decision criteria

- **Tesseract.js**: browser worker architecture with separate worker, core and language resources. The [project documentation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) explains local paths; see the experiments and remaining licensing and performance checks below.
- **Ocrad.js**: browser-oriented OCR with no separately trained model download according to its [project documentation](https://github.com/antimatter15/ocrad.js). Its repository states GPL-3.0 licensing, and Vietnamese accuracy and compatibility with this project's distribution requirements have not been established. A smaller download alone is not sufficient to select it.

Tesseract.js is used in the implemented workflow. The historical comparison below uses locally generated, non-sensitive Vietnamese and English examples and records measured results and outstanding gaps. Complete license notices, representative accuracy and broader browser support remain unverified.

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

Uncompressed installed artifacts measured 62,961 bytes for `tesseract.min.js`, 111,307 bytes for its worker, and 2,855,361 bytes for one LSTM WASM variant; other core variants differ and may be required for browser compatibility. The Ocrad.js file measured 1,154,934 bytes. These exclude the language files and transport compression; actual app bundle and network behavior remain unmeasured. The application now includes experimental OCR using Tesseract.js.

## Browser prototype — 2026-11-06

A disposable prototype was served on localhost in the in-app browser on Windows. Using Tesseract.js 7.0.0 with worker, core and language paths pointed to local copies, `cacheMethod: 'none'` and `workerBlobURL: false`, the English and Vietnamese clear synthetic images produced the exact source text. The recognized Vietnamese text was edited in a textarea, and attempting recognition without an image displayed a message. The prototype was removed after the experiment and is not an application feature.

The configuration specifies same-origin resources, but a complete browser network trace, offline test, failed-model/cancellation handling, and memory profiling were not performed. In particular, the prototype retained earlier text while a new recognition was loading; the application clears previous results before starting a new run. The observed package metadata licenses are recorded above.

**Evaluation outcome:** Tesseract.js is the preferred candidate for a future, separately reviewed prototype because it recognized Vietnamese more accurately than Ocrad.js on these samples and its package license is permissive. This is not a production approval. Real screenshot quality, complete license provenance, browser compatibility, network/privacy inspection, resource limits, error handling, and accessibility remain release gates for any OCR feature.

## Experimental workflow follow-up

The current UI retains the recognized-text editor even if a user deletes every character; transfer remains disabled until it contains non-whitespace text. Automated component tests cover image size and decode failures, OCR worker failures, cancellation during startup and recognition, editable output, and an explicit transfer to the main input. PNG, JPEG and WebP dimensions are checked from image headers before decoding and checked again after decoding. This reduces exposure to oversized images but does not guarantee safety for malformed files or prevent all browser decoder memory costs. Actual recognition accuracy and device resource usage remain to be evaluated with a broader image set.

On 2026-11-07, a locally generated 900 × 90 JPEG was processed through the application in the Windows in-app browser and returned `Submit report 2027-05-20 14:30`. Automated header tests also cover locally generated PNG and WebP files. This does not establish compatibility with all images or browsers.

The [upstream language-data repository](https://github.com/naptha/tessdata) identifies `4.0.0_best_int` as integerized Tessdata Best and is Apache-2.0 licensed. On 2026-11-07, Git blob hashes of the installed `@tesseract.js-data` 1.0.0 English and Vietnamese model files matched the upstream `gh-pages` files: `730a6a59010b9440e38dd85f9fe6b6bf0637e6eb` and `1bea8846e553fa31a93d556b58f757086ab2bb43`, respectively. This verifies those files against that upstream state, not all transitive licenses in the compiled core. The built site includes a third-party notice and the Apache license text; a full transitive notice audit remains a release gate.

Upstream's [core license issue](https://github.com/naptha/tesseract.js-core/issues/44) identifies multiple libraries in the compiled WASM and remains open; its discussion also notes that a release-specific compiler/runtime notice list has not been established. The current third-party notice is therefore preliminary. Verify exact shipped artifacts and retain all required copyright and license texts before publishing OCR.

Integration tests now run the real Tesseract.js engine in Node using local model files and synthetic English/Vietnamese images, pass recognized text through extraction, and check that an event cannot be exported without confirmation. Component tests check same-origin asset configuration and disabled OCR language caching. These are not a browser network trace or a representative accuracy benchmark.

The integration corpus includes the original clear PNG for each language, a mildly blurred PNG (Gaussian radius 0.8), a JPEG compressed at quality 50, and a WebP at quality 75. In the automated runs all eight synthetic samples yielded the expected explicit date and time and required confirmation before ICS export. These test fixtures use simple, high-contrast text; they do not establish accuracy on real screenshots, small text, complex layouts, handwriting, or severely degraded images.

DeadlineDrop reads the selected `File` as bytes and passes those bytes to the local worker. It sets explicit same-origin worker, core and language paths and disables language caching. This is a source-level inspection and configuration check, not a substitute for observing network requests in a real browser. Hosting the site still involves normal network requests for application and OCR assets.

Tesseract.js 7.0.0 can leave worker creation pending after initialization errors. DeadlineDrop owns the browser Worker directly through a small adapter for the pinned Tesseract.js 7 worker protocol, allowing cancellation, errors and the two-minute startup timeout to terminate it even before initialization completes. Automated lifecycle tests cover a stalled worker, failure and cancellation. On 2026-11-08, the adapter recognized a synthetic English JPEG and Vietnamese WebP in the Windows in-app browser. This protocol is internal to Tesseract.js: upgrades require reviewing the adapter and rerunning real browser OCR tests. Broader browser and device coverage remains necessary.

The npm registry identifies the source revision of `tesseract.js-core@7.0.0` as `acffef2b66eb44a31df297e11d905f4b39001068`. Its upstream `third_party` tree pins giflib `fa37672085ce4b3d62c51627ab3c8cf2dda8009a`, leptonica `4af068b56a9674da915debea4ed7e1b9885b17e8`, libjpeg `6c0fcb8ddee365e7abc4d332662b06900612e923`, libpng `a37d4836519517bdce6cb9d956092321eca3e73b`, libtiff `b51bb157123264e26d34c09cc673d213aea61fc7`, libwebp `20ef03ee351d4ff03fc5ff3ec4804a879d1b9d5c`, openlibm `ae2d91698508701c83cab83714d42a1146dccf85`, tesseract `2a9c1c49c360462733c386d2a44fcd22c4e21411`, and zlib `21767c654d31d2dccdde4330529775c6c5fd5389`. These revision identifiers support further audit; they do not establish which files or compiler/runtime notices are included in each published WASM binary.

On 2026-11-08, the Git blob hashes of all six `tesseract-core*.wasm.js` artifacts installed from `tesseract.js-core@7.0.0` matched their files at that upstream source revision. This verifies artifact identity, not the complete set of required notices.

License and copyright files from the nine pinned upstream libraries are included under `public/ocr-licenses/`, with exact source links and revisions in its README. This conservative bundle does not determine which compiled libraries, compiler or runtime components are actually present in each shipped WASM variant; complete attribution review remains necessary.
