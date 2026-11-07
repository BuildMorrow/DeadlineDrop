import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Copy pinned assets during development/build; no user files are involved.
const destination = 'public/ocr'
mkdirSync(join(destination, 'core'), { recursive: true })
mkdirSync(join(destination, 'models'), { recursive: true })
copyFileSync('node_modules/tesseract.js/dist/worker.min.js', join(destination, 'worker.min.js'))
copyFileSync('node_modules/tesseract.js/LICENSE.md', join(destination, 'APACHE-2.0.txt'))
for (const file of readdirSync('node_modules/tesseract.js-core')) {
  if (/^tesseract-core.*\.wasm\.js$/.test(file)) copyFileSync(join('node_modules/tesseract.js-core', file), join(destination, 'core', file))
}
for (const lang of ['eng', 'vie']) {
  copyFileSync(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, join(destination, 'models', `${lang}.traineddata.gz`))
}
