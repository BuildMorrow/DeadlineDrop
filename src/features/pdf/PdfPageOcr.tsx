import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { translate, type Language } from '../../app/i18n'
import type { OcrWorker } from '../ocr/startWorker'

export function PdfPageOcr({ file, pageCount, language, onAppend }: { file: File; pageCount: number; language: Language; onAppend: (text: string) => void }) {
  const t = (value: string) => translate(language, value)
  const [page, setPage] = useState('1')
  const [ocrLanguage, setOcrLanguage] = useState('eng')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const worker = useRef<OcrWorker | null>(null)
  const readButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => () => { generation.current++; controller.current?.abort(); void worker.current?.terminate().catch(() => {}) }, [])
  useLayoutEffect(() => { if (!busy && returnFocus.current) { returnFocus.current = false; readButton.current?.focus() } }, [busy])
  function finish() { returnFocus.current = document.activeElement === cancelButton.current; setBusy(false) }
  function cancel() {
    generation.current++; controller.current?.abort(); void worker.current?.terminate().catch(() => {})
    controller.current = null; worker.current = null; finish(); setStatus('PDF OCR cancelled.')
  }
  async function recognize() {
    if (busy) return
    const number = Number(page)
    if (!Number.isInteger(number) || number < 1 || number > pageCount) { setStatus('Choose a valid PDF page.'); return }
    const run = ++generation.current
    const current = new AbortController(); controller.current = current
    setBusy(true); setResult(''); setStatus('Reading the PDF page locally…')
    let active: OcrWorker | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const { renderPdfPage } = await import('./renderPage')
      const image = await renderPdfPage(file, number, current.signal)
      if (run !== generation.current) return
      const { startWorker } = await import('../ocr/startWorker')
      const base = new URL(import.meta.env.BASE_URL, window.location.href)
      const asset = (path: string) => new URL(`ocr/${path}`, base).href
      active = await startWorker(ocrLanguage, { workerPath: asset('worker.min.js'), corePath: asset('core'), langPath: asset('models'), cacheMethod: 'none', workerBlobURL: false }, 120_000, current.signal)
      if (run !== generation.current) return
      worker.current = active
      timeout = setTimeout(() => { void active?.terminate().catch(() => {}) }, 120_000)
      const recognized = (await active.recognize(image)).data.text
      if (run !== generation.current) return
      if (recognized.length > 100_000) throw new Error('OCR text too long')
      setResult(recognized)
      setStatus(recognized.trim() ? 'Review OCR text against the PDF before adding it.' : 'No text found on this page.')
    } catch {
      if (run === generation.current) setStatus('Could not read this PDF page. Check its size or OCR resources and try again.')
    } finally {
      if (timeout) clearTimeout(timeout)
      if (worker.current === active) worker.current = null
      if (active) await active.terminate().catch(() => {})
      if (controller.current === current) controller.current = null
      if (run === generation.current) finish()
    }
  }
  return <details className="pdf-ocr"><summary>{t('Read a scanned PDF page (experimental)')}</summary>
    <p>{t('Choose one page and language. OCR runs on your device but downloads resources from this site. It can misread dates; compare with the PDF.')}</p>
    <label className="field-label">{t('PDF PAGE')}<input className="field-input" type="number" min="1" max={pageCount} value={page} disabled={busy} onChange={e => setPage(e.target.value)} /></label>
    <label className="field-label">{t('IMAGE LANGUAGE')}<select className="field-input" value={ocrLanguage} disabled={busy} onChange={e => setOcrLanguage(e.target.value)}><option value="eng">{t('English')}</option><option value="vie">{t('Vietnamese')}</option></select></label>
    <div className="resolution-actions"><button ref={readButton} type="button" className="button button-outline" aria-disabled={busy} onClick={() => void recognize()}>{t('Read page')}</button>{busy && <button ref={cancelButton} type="button" className="button button-outline" onClick={cancel}>{t('Cancel')}</button>}</div>
    <p role="status" aria-live="polite">{t(status)}</p>
    {result && <><label className="field-label">{t('PAGE OCR TEXT')}<textarea className="source-input" value={result} onChange={e => setResult(e.target.value)} /></label><button type="button" className="button button-outline" disabled={busy || !result.trim()} onClick={() => { onAppend(result.trim()); setResult(''); setStatus('OCR text added. Review the combined text before using it.') }}>{t('Add OCR text')}</button></>}
  </details>
}
