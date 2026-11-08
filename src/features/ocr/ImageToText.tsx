import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { OcrWorker } from './startWorker'
import { imageDimensions, validImageDimensions, validateImage } from './validateImage'

export function ImageToText({ onUseText }: { onUseText: (text: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('eng')
  const [text, setText] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const worker = useRef<OcrWorker | null>(null)
  const startup = useRef<AbortController | null>(null)
  const readButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => () => { generation.current++; startup.current?.abort(); void worker.current?.terminate().catch(() => {}) }, [])
  useLayoutEffect(() => {
    if (!busy && returnFocus.current) {
      returnFocus.current = false
      readButton.current?.focus()
    }
  }, [busy])

  function finish() {
    returnFocus.current = document.activeElement === cancelButton.current
    setBusy(false)
  }

  function cancel() {
    generation.current++
    startup.current?.abort()
    const current = worker.current
    worker.current = null
    if (current) void current.terminate().catch(() => {})
    finish()
    setStatus('Recognition cancelled.')
  }

  async function recognize() {
    if (busy) return
    if (!file) { setStatus('Choose an image first.'); return }
    const error = validateImage(file)
    if (error) { setStatus(error); return }
    const run = ++generation.current
    const controller = new AbortController()
    startup.current = controller
    setText(''); setHasResult(false); setBusy(true); setStatus('Loading local OCR resources and reading the image…')
    let current: OcrWorker | null = null
    try {
      const dimensions = imageDimensions(new Uint8Array(await file.arrayBuffer()), file.type)
      if (!dimensions) throw new Error('Unsupported or invalid image header.')
      if (!validImageDimensions(dimensions)) throw new Error('Image dimensions exceed 16 megapixels.')
      if (run !== generation.current) return
      const bitmap = await createImageBitmap(file)
      const decodedDimensions = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      if (!validImageDimensions(decodedDimensions)) throw new Error('Image dimensions exceed 16 megapixels.')
      if (run !== generation.current) return
      const { startWorker } = await import('./startWorker')
      const base = new URL(import.meta.env.BASE_URL, window.location.href)
      const asset = (path: string) => new URL(`ocr/${path}`, base).href
      current = await startWorker(language, { workerPath: asset('worker.min.js'), corePath: asset('core'), langPath: asset('models'), cacheMethod: 'none', workerBlobURL: false }, 120_000, controller.signal)
      if (run !== generation.current) return
      worker.current = current
      const result = await current.recognize(file)
      if (run !== generation.current) return
      setText(result.data.text)
      setHasResult(Boolean(result.data.text.trim()))
      setStatus(result.data.text.trim() ? 'Review and correct the recognized text before using it.' : 'No text found. Try a clearer image.')
    } catch (error) {
      if (run === generation.current) setStatus(error instanceof Error && error.message === 'Image dimensions exceed 16 megapixels.' ? error.message : 'Could not read this image. Try another image or check that OCR resources loaded.')
    } finally {
      if (startup.current === controller) startup.current = null
      if (current && worker.current === current) worker.current = null
      if (current) await current.terminate().catch(() => {})
      if (run === generation.current) finish()
    }
  }

  return <details className="image-ocr"><summary>Read text from an image</summary>
    <p>Images stay on your device. OCR resources download from this site when needed. Review the text for mistakes. Using it replaces your message and clears the current event review.</p>
    <label className="field-label">IMAGE (PNG, JPEG, WEBP; MAX 8 MB)<input className="field-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setText(''); setHasResult(false); setStatus('') }} /></label>
    <label className="field-label">IMAGE LANGUAGE<select className="field-input" value={language} disabled={busy} onChange={e => { setLanguage(e.target.value); setText(''); setHasResult(false); setStatus('') }}><option value="eng">English</option><option value="vie">Vietnamese</option></select></label>
    <div className="resolution-actions"><button ref={readButton} type="button" className="button button-outline" aria-disabled={busy} onClick={() => void recognize()}>Read image</button>{busy && <button ref={cancelButton} type="button" className="button button-outline" onClick={cancel}>Cancel</button>}</div>
    <p role="status" aria-live="polite">{status}</p>
    {hasResult && <><label className="field-label">RECOGNIZED TEXT<textarea className="source-input" value={text} onChange={e => setText(e.target.value)} /></label><button type="button" className="button button-primary" disabled={!text.trim() || busy} onClick={() => onUseText(text)}>Use this text</button></>}
  </details>
}
