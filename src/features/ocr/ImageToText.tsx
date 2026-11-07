import { useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'
import { validateImage } from './validateImage'

export function ImageToText({ onUseText }: { onUseText: (text: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('eng')
  const [text, setText] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => { generation.current++; void worker.current?.terminate().catch(() => {}) }, [])

  function cancel() {
    generation.current++
    const current = worker.current
    worker.current = null
    if (current) void current.terminate().catch(() => {})
    setBusy(false)
    setStatus('Recognition cancelled.')
  }

  async function recognize() {
    if (!file) { setStatus('Choose an image first.'); return }
    const error = validateImage(file)
    if (error) { setStatus(error); return }
    const run = ++generation.current
    setText(''); setHasResult(false); setBusy(true); setStatus('Loading local OCR resources and reading the image…')
    let current: Worker | null = null
    try {
      const bitmap = await createImageBitmap(file)
      const pixels = bitmap.width * bitmap.height
      bitmap.close()
      if (pixels > 16_000_000) throw new Error('Image dimensions exceed 16 megapixels.')
      if (run !== generation.current) return
      const { createWorker } = await import('tesseract.js')
      const base = new URL(import.meta.env.BASE_URL, window.location.href)
      const asset = (path: string) => new URL(`ocr/${path}`, base).href
      current = await createWorker(language, 1, { workerPath: asset('worker.min.js'), corePath: asset('core'), langPath: asset('models'), cacheMethod: 'none', workerBlobURL: false })
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
      if (current && worker.current === current) worker.current = null
      if (current) await current.terminate().catch(() => {})
      if (run === generation.current) setBusy(false)
    }
  }

  return <details className="image-ocr"><summary>Read text from an image</summary>
    <p>Images stay on your device. OCR resources download from this site when needed. Review the text for mistakes. Using it replaces your message and clears the current event review.</p>
    <label className="field-label">IMAGE (PNG, JPEG, WEBP; MAX 8 MB)<input className="field-input" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setText(''); setHasResult(false); setStatus('') }} /></label>
    <label className="field-label">IMAGE LANGUAGE<select className="field-input" value={language} disabled={busy} onChange={e => { setLanguage(e.target.value); setText(''); setHasResult(false); setStatus('') }}><option value="eng">English</option><option value="vie">Vietnamese</option></select></label>
    <div className="resolution-actions"><button type="button" className="button button-outline" disabled={busy} onClick={() => void recognize()}>Read image</button>{busy && <button type="button" className="button button-outline" onClick={cancel}>Cancel</button>}</div>
    <p role="status" aria-live="polite">{status}</p>
    {hasResult && <><label className="field-label">RECOGNIZED TEXT<textarea className="source-input" value={text} onChange={e => setText(e.target.value)} /></label><button type="button" className="button button-primary" disabled={!text.trim() || busy} onClick={() => onUseText(text)}>Use this text</button></>}
  </details>
}
