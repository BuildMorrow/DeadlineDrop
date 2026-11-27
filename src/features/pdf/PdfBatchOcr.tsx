import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Language } from '../../app/i18n'
import type { OcrWorker } from '../ocr/startWorker'

type PageResult = { page: number; text: string; status: 'waiting' | 'done' | 'empty' | 'failed'; added: boolean }
const MAX_BATCH = 5
const MAX_TEXT = 100_000

export function PdfBatchOcr({ file, pageCount, language, onAppend }: { file: File; pageCount: number; language: Language; onAppend: (text: string) => void }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const [start, setStart] = useState('1')
  const [end, setEnd] = useState('1')
  const [ocrLanguage, setOcrLanguage] = useState('eng')
  const [rows, setRows] = useState<PageResult[]>([])
  const [sourceLanguage, setSourceLanguage] = useState('eng')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const worker = useRef<OcrWorker | null>(null)
  const readButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  useEffect(() => () => { generation.current++; controller.current?.abort(); void worker.current?.terminate().catch(() => {}) }, [])
  useLayoutEffect(() => { if (!busy && restoreFocus.current) { restoreFocus.current = false; readButton.current?.focus() } }, [busy])
  function finish() { restoreFocus.current = document.activeElement === cancelButton.current; setBusy(false) }
  function cancel() {
    generation.current++; controller.current?.abort(); void worker.current?.terminate().catch(() => {})
    controller.current = null; worker.current = null; finish(); setStatus('cancelled')
  }
  function updatePage(page: number, update: Partial<PageResult>) { setRows(current => current.map(row => row.page === page ? { ...row, ...update } : row)) }
  async function read() {
    if (busy || controller.current || rows.length) return
    const first = Number(start), last = Number(end)
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > pageCount || last - first + 1 > MAX_BATCH) { setStatus('invalid'); return }
    const run = ++generation.current, current = new AbortController()
    controller.current = current
    setSourceLanguage(ocrLanguage); setRows(Array.from({ length: last - first + 1 }, (_, i) => ({ page: first + i, text: '', status: 'waiting', added: false })))
    setBusy(true); setStatus('loading')
    let active: OcrWorker | null = null
    try {
      const [{ renderPdfPage }, { startWorker }] = await Promise.all([import('./renderPage'), import('../ocr/startWorker')])
      if (run !== generation.current) return
      const base = new URL(import.meta.env.BASE_URL, window.location.href)
      const asset = (path: string) => new URL(`ocr/${path}`, base).href
      active = await startWorker(ocrLanguage, { workerPath: asset('worker.min.js'), corePath: asset('core'), langPath: asset('models'), cacheMethod: 'none', workerBlobURL: false }, 120_000, current.signal)
      if (run !== generation.current) return
      worker.current = active
      let total = 0
      for (let page = first; page <= last; page++) {
        if (run !== generation.current) return
        setStatus(String(page))
        let image: File
        try { image = await renderPdfPage(file, page, current.signal) }
        catch { if (run !== generation.current) return; updatePage(page, { status: 'failed' }); continue }
        if (run !== generation.current) return
        const timer = setTimeout(() => { void active?.terminate().catch(() => {}) }, 120_000)
        try {
          const recognized = (await active.recognize(image)).data.text
          if (run !== generation.current) return
          total += recognized.length
          if (total > MAX_TEXT) { updatePage(page, { status: 'failed' }); setStatus('limit'); return }
          updatePage(page, { text: recognized, status: recognized.trim() ? 'done' : 'empty' })
        } catch {
          if (run !== generation.current) return
          updatePage(page, { status: 'failed' }); setStatus('error'); return
        } finally { clearTimeout(timer) }
      }
      if (run === generation.current) setStatus('complete')
    } catch { if (run === generation.current) setStatus('error') }
    finally {
      if (worker.current === active) worker.current = null
      if (active) await active.terminate().catch(() => {})
      if (controller.current === current) controller.current = null
      if (run === generation.current) finish()
    }
  }
  const message = status === 'invalid' ? v('Choose a valid range of at most five pages.', 'Chọn khoảng trang hợp lệ, tối đa năm trang.') : status === 'loading' ? v('Loading OCR resources…', 'Đang tải tài nguyên OCR…') : status === 'cancelled' ? v('Cancelled. Completed pages remain available; waiting pages were not processed.', 'Đã hủy. Trang hoàn thành vẫn còn; các trang đang chờ chưa được xử lý.') : status === 'error' ? v('OCR stopped. Review failed and unprocessed pages before continuing.', 'OCR đã dừng. Hãy kiểm tra các trang lỗi và chưa xử lý.') : status === 'limit' ? v('OCR stopped at the text limit. Remaining pages were not processed.', 'OCR đã dừng vì vượt giới hạn văn bản. Các trang còn lại chưa được xử lý.') : status === 'complete' ? v('Batch finished. Check each page for errors and review it against the PDF.', 'Đợt đọc đã kết thúc. Hãy kiểm tra lỗi và đối chiếu từng trang với PDF.') : status ? v(`Reading page ${status}…`, `Đang đọc trang ${status}…`) : ''
  return <details className="pdf-ocr"><summary>{v('Read several scanned pages (experimental)', 'Đọc nhiều trang scan (thử nghiệm)')}</summary>
    <p>{v('Read up to five pages sequentially on your device. OCR resources are downloaded from this site. Review each page; OCR may misread dates.', 'Đọc tuần tự tối đa năm trang trên thiết bị. Tài nguyên OCR được tải từ trang này. Hãy đối chiếu từng trang; OCR có thể đọc sai ngày.')}</p>
    <div className="field-grid"><label className="field-label">{v('FIRST PAGE', 'TRANG ĐẦU')}<input className="field-input" type="number" min="1" max={pageCount} value={start} disabled={busy || rows.length > 0} onChange={e => setStart(e.target.value)} /></label><label className="field-label">{v('LAST PAGE', 'TRANG CUỐI')}<input className="field-input" type="number" min="1" max={pageCount} value={end} disabled={busy || rows.length > 0} onChange={e => setEnd(e.target.value)} /></label></div>
    <label className="field-label">{v('PAGE LANGUAGE', 'NGÔN NGỮ TRANG')}<select className="field-input" value={ocrLanguage} disabled={busy || rows.length > 0} onChange={e => setOcrLanguage(e.target.value)}><option value="eng">English</option><option value="vie">Tiếng Việt</option></select></label>
    <div className="resolution-actions"><button ref={readButton} type="button" className="button button-outline" aria-disabled={busy || rows.length > 0} onClick={() => void read()}>{v('Read selected pages', 'Đọc các trang đã chọn')}</button>{busy && <button ref={cancelButton} type="button" className="button button-outline" onClick={cancel}>{v('Cancel', 'Hủy')}</button>}</div>
    <p role="status" aria-live="polite">{message}</p>
    {rows.length > 0 && <><p>{v('Language:', 'Ngôn ngữ:')} {sourceLanguage === 'vie' ? 'Tiếng Việt' : 'English'}. {v('Added pages are appended to the combined text; check their order.', 'Trang được thêm vào cuối văn bản tổng hợp; hãy kiểm tra thứ tự.')}</p><ol>{rows.map(row => <li key={row.page}><strong>{v('Page', 'Trang')} {row.page}</strong>{row.status === 'done' ? <><label className="field-label">{v('RECOGNIZED TEXT', 'VĂN BẢN NHẬN DẠNG')}<textarea className="source-input" value={row.text} disabled={row.added} onChange={e => updatePage(row.page, { text: e.target.value })} /></label><button type="button" className="button button-outline" disabled={busy || row.added || !row.text.trim()} onClick={() => { onAppend(row.text.trim()); updatePage(row.page, { added: true }) }}>{row.added ? v('Added', 'Đã thêm') : v('Add page text', 'Thêm văn bản trang')}</button></> : <p>{row.status === 'waiting' ? v('Not processed yet.', 'Chưa được xử lý.') : row.status === 'empty' ? v('No text recognized.', 'Không nhận dạng được chữ.') : v('Could not read this page.', 'Không đọc được trang này.')}</p>}</li>)}</ol><button type="button" className="button button-outline" disabled={busy} onClick={() => { if (rows.some(row => row.status === 'done' && !row.added && row.text.trim()) && !window.confirm(v('Discard unadded OCR results?', 'Bỏ các kết quả OCR chưa thêm?'))) return; setRows([]); setStatus(''); readButton.current?.focus() }}>{v('Clear batch results', 'Xóa kết quả đợt này')}</button></>}
  </details>
}
