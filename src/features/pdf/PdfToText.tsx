import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { translate, type Language } from '../../app/i18n'
import { validatePdf } from './limits'

export function PdfToText({ onUseText, language = 'en' }: { onUseText: (text: string) => void; language?: Language }) {
  const t = (value: string) => translate(language, value)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const readButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  useEffect(() => () => { generation.current++; controller.current?.abort() }, [])
  useLayoutEffect(() => { if (!busy && restoreFocus.current) { restoreFocus.current = false; readButton.current?.focus() } }, [busy])
  function finish() { restoreFocus.current = document.activeElement === cancelButton.current; setBusy(false) }
  function cancel() { generation.current++; controller.current?.abort(); controller.current = null; finish(); setStatus('PDF reading cancelled.') }
  async function read() {
    if (busy) return
    if (!file) { setStatus('Choose a PDF file.'); return }
    const error = validatePdf(file)
    if (error) { setStatus(error); return }
    const run = ++generation.current
    const current = new AbortController(); controller.current = current
    setBusy(true); setText(''); setHasResult(false); setStatus('Reading PDF locally…')
    try {
      const { readPdf } = await import('./readPdf')
      const result = await readPdf(file, current.signal)
      if (run !== generation.current) return
      setText(result.text); setHasResult(Boolean(result.text.trim()))
      setStatus(!result.text ? 'No selectable text found. Scanned pages are not supported yet.' : result.emptyPages ? 'Some pages contained no selectable text. Review the original PDF carefully.' : 'Review the extracted text against the original PDF before using it.')
    } catch (error) {
      if (run === generation.current) setStatus(error instanceof Error && ['PDF exceeds the 20-page limit.', 'PDF text exceeds the 100,000-character limit.'].includes(error.message) ? error.message : 'Could not read this PDF. It may be invalid, encrypted, or unsupported.')
    } finally {
      if (controller.current === current) controller.current = null
      if (run === generation.current) finish()
    }
  }
  return <details className="image-ocr"><summary>{t('Read text from a PDF')}</summary>
    <p>{t('The PDF stays on your device. Only selectable text is read; scanned pages are not supported. Review all extracted text. Using it replaces your message and clears the current event review.')}</p>
    <label className="field-label">{t('PDF (MAX 8 MB, 20 PAGES)')}<input className="field-input" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setText(''); setHasResult(false); setStatus('') }} /></label>
    <div className="resolution-actions"><button ref={readButton} type="button" className="button button-outline" aria-disabled={busy} onClick={() => void read()}>{t('Read PDF')}</button>{busy && <button ref={cancelButton} type="button" className="button button-outline" onClick={cancel}>{t('Cancel')}</button>}</div>
    <p role="status" aria-live="polite">{t(status)}</p>
    {hasResult && <><label className="field-label">{t('PDF TEXT')}<textarea className="source-input" value={text} onChange={e => setText(e.target.value)} /></label><button type="button" className="button button-primary" disabled={!text.trim() || busy} onClick={() => onUseText(text)}>{t('Use this text')}</button></>}
  </details>
}
