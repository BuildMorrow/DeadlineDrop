# Offline and installation

The production build contains a web app manifest and a service worker scoped to the application base path. Browser installation support and prompts vary by browser and platform. The app must be served on HTTPS or localhost; opening the files directly is not supported.

During the first successful online visit, the service worker downloads a fixed list of application shell files (HTML, JavaScript, CSS, manifest and icons). It does not cache input text, uploaded images, OCR results, exported calendar files, arbitrary URLs, OCR worker/core/model resources, or lazily loaded PDF resources. After the shell has been successfully installed, a later visit can load the text workflow without reaching the server. A first visit, a failed installation, cleared browser storage, or missing cache may still need a connection. Browser storage is subject to eviction.

If cache storage cannot be read, the worker attempts to retrieve the requested application file from the network. This fallback does not guarantee the app will work if the network is unavailable or an older asset is no longer hosted.

Image OCR and PDF reading are not included in the offline cache and may need a connection even after the app shell was installed. A normal browser HTTP cache may also exist independently of the service worker; this project does not claim offline OCR or PDF support.

Updates install a new shell without forcing an open page to reload. When an update is waiting, the app can display a notice asking users to export their work before closing all DeadlineDrop tabs and reopening the app. The browser normally activates the update once pages controlled by the old worker close; update detection has not yet been verified across browsers. The worker removes only old DeadlineDrop caches for its own path. As with the online app, input and events are held in memory: refreshing or closing the page clears them. Export confirmed events before closing if needed.

The connection notice uses the browser's online/offline signal; it cannot prove that a particular server is reachable. The first release should be verified on the actual GitHub Pages path and representative browsers and devices. See [QA checklist](QA_CHECKLIST.md) for observations, not a blanket guarantee of offline operation.
