import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { translate, type Language } from '../../app/i18n'
import { validatePdf } from './limits'
import { PdfPageOcr } from './PdfPageOcr'
import { useUnsavedWarning } from '../../lib/useUnsavedWarning'

export function PdfToText({ onUseText, language = 'en' }: { onUseText: (text: string) => void; language?: Language }) {
  const t = (value: string) => translate(language, value)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [pages, setPages] = useState<string[]>([])
  const [selectedPages, setSelectedPages] = useState<boolean[]>([])
  const [appliedPages, setAppliedPages] = useState<boolean[]>([])
  const [hasResult, setHasResult] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useUnsavedWarning(Boolean(file))
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
    setBusy(true); setText(''); setPages([]); setSelectedPages([]); setAppliedPages([]); setHasResult(false); setStatus('Reading PDF locally…')
    try {
      const { readPdf } = await import('./readPdf')
      const result = await readPdf(file, current.signal)
      if (run !== generation.current) return
      const initialPages = result.pages.map(page => Boolean(page.trim()))
      setText(result.text); setPages(result.pages); setSelectedPages(initialPages); setAppliedPages(initialPages); setHasResult(Boolean(result.text.trim()))
      setStatus(!result.text ? 'No selectable text found. Try experimental page OCR below.' : result.pages.some(page => !page.trim()) ? 'Some pages contained no selectable text. Review the original PDF carefully.' : 'Review the extracted text against the original PDF before using it.')
    } catch (error) {
      if (run === generation.current) setStatus(error instanceof Error && ['PDF exceeds the 20-page limit.', 'PDF text exceeds the 100,000-character limit.'].includes(error.message) ? error.message : 'Could not read this PDF. It may be invalid, encrypted, or unsupported.')
    } finally {
      if (controller.current === current) controller.current = null
      if (run === generation.current) finish()
    }
  }
  const selectionChanged = selectedPages.some((selected, index) => selected !== appliedPages[index])
  return <details className="image-ocr"><summary>{t('Read text from a PDF')}</summary>
    <p>{t('The PDF stays on your device. Selectable text is read first; scanned pages can be read individually using experimental OCR below. Review all text before using it.')}</p>
    <label className="field-label">{t('PDF (MAX 8 MB, 20 PAGES)')}<input className="field-input" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setText(''); setPages([]); setSelectedPages([]); setAppliedPages([]); setHasResult(false); setStatus('') }} /></label>
    <div className="resolution-actions"><button ref={readButton} type="button" className="button button-outline" aria-disabled={busy} onClick={() => void read()}>{t('Read PDF')}</button>{busy && <button ref={cancelButton} type="button" className="button button-outline" onClick={cancel}>{t('Cancel')}</button>}</div>
    <p role="status" aria-live="polite">{t(status)}</p>
    {pages.length > 0 && <details><summary>{t('Review original extracted text by page')}</summary><p>{t('These pages show the original extraction. Edits below are not reflected here. Check the PDF for missing text and reading order.')}</p><p>{t('Choose pages and rebuild the text to work with only those pages. Rebuilding replaces any edits below.')}</p><ol>{pages.map((page, index) => <li key={index}><label><input type="checkbox" disabled={!page.trim()} checked={selectedPages[index] ?? false} onChange={e => { const checked = e.target.checked; setSelectedPages(current => current.map((selected, i) => i === index ? checked : selected)) }} /> {t('Page')} {index + 1}</label><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{page || t('No selectable text on this page.')}</pre></li>)}</ol><button type="button" className="button button-outline" disabled={!selectedPages.some(Boolean)} onClick={() => { setText(pages.filter((_, index) => selectedPages[index]).join('\n\n')); setAppliedPages([...selectedPages]); setHasResult(true); setStatus('Text rebuilt from the selected pages. Review it before using it.') }}>{t('Rebuild text from selected pages')}</button></details>}
    {file && pages.length > 0 && <PdfPageOcr file={file} pageCount={pages.length} language={language} onAppend={value => { setText(current => current.trim() ? `${current}\n\n${value}` : value); setHasResult(true) }} />}
    {hasResult && <><label className="field-label">{t('PDF TEXT')}<textarea className="source-input" value={text} onChange={e => setText(e.target.value)} /></label><p id="pdf-selection-status" aria-live="polite">{selectionChanged ? t('Page selection changed. Rebuild the text or restore the previous selection before using it.') : ''}</p><button type="button" className="button button-primary" aria-describedby="pdf-selection-status" disabled={!text.trim() || busy || selectionChanged} onClick={() => onUseText(text)}>{t('Use this text')}</button></>}
  </details>
}
