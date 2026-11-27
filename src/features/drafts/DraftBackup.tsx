import { useEffect, useRef, useState } from 'react'
import type { Language } from '../../app/i18n'
import { createBackup, DraftError, importBackup, MAX_BACKUP_BYTES, parseBackup, type Draft } from './storage'

export function DraftBackup({ language, hasDrafts, onImported }: { language: Language; hasDrafts: boolean; onImported: (drafts: Draft[]) => void }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState<Draft[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  function exportFile() {
    try {
      const data = createBackup(window.localStorage)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'deadlinedrop-drafts.json'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('exported')
    } catch { setStatus('export-error') }
  }
  async function selectFile(file: File | undefined) {
    const run = ++generation.current
    setRaw(''); setPreview([]); setStatus(''); setBusy(false)
    if (!file) return
    if (!file.size || file.size > MAX_BACKUP_BYTES) { setStatus('invalid'); return }
    setBusy(true)
    try {
      const data = await file.text()
      const entries = parseBackup(data)
      if (run !== generation.current) return
      setRaw(data); setPreview(entries); setStatus('preview')
    } catch { if (run === generation.current) setStatus('invalid') }
    finally { if (run === generation.current) setBusy(false) }
  }
  function importFile() {
    try {
      const drafts = importBackup(window.localStorage, raw)
      onImported(drafts); setRaw(''); setPreview([]); setStatus('imported')
    } catch (cause) { setStatus(cause instanceof DraftError ? cause.code : 'unavailable') }
  }
  const message = status === 'preview' ? v('Review the names below. Nothing has been imported yet.', 'Kiểm tra các tên bên dưới. Chưa có bản nháp nào được nhập.') : status === 'invalid' ? v('The backup is invalid, unsupported or too large. Nothing was imported.', 'Tệp sao lưu không hợp lệ, không được hỗ trợ hoặc quá lớn. Chưa nhập dữ liệu.') : status === 'duplicate' ? v('A draft name or ID already exists. Nothing was imported; resolve the conflict first.', 'Tên hoặc mã bản nháp đã tồn tại. Chưa nhập dữ liệu; hãy xử lý trùng lặp trước.') : status === 'full' ? v('Import would exceed 10 drafts. Nothing was imported.', 'Nhập vào sẽ vượt quá 10 bản nháp. Chưa nhập dữ liệu.') : status === 'storage_limit' ? v('The combined drafts exceed the storage limit. Nothing was imported.', 'Tổng bản nháp vượt giới hạn lưu trữ. Chưa nhập dữ liệu.') : status === 'corrupt' ? v('Existing drafts cannot be read. Nothing was imported.', 'Không đọc được bản nháp hiện có. Chưa nhập dữ liệu.') : status === 'imported' ? v('Drafts imported. Load and review each message before exporting events.', 'Đã nhập bản nháp. Mở và kiểm tra từng nội dung trước khi xuất sự kiện.') : status === 'exported' ? v('Backup download started.', 'Đã bắt đầu tải tệp sao lưu.') : status === 'export-error' || status === 'unavailable' ? v('Could not access browser storage or the backup. Existing drafts were not changed.', 'Không thể truy cập bộ nhớ trình duyệt hoặc tệp sao lưu. Bản nháp hiện có chưa bị thay đổi.') : ''
  return <details className="drafts-backup"><summary>{v('Back up or import drafts', 'Sao lưu hoặc nhập bản nháp')}</summary>
    <p>{v('Backup files contain your draft text without encryption. Keep them private. Event edits, confirmations, images and PDFs are not included.', 'Tệp sao lưu chứa văn bản bản nháp không mã hóa. Hãy giữ tệp riêng tư. Tệp không chứa chỉnh sửa sự kiện, xác nhận, ảnh hoặc PDF.')}</p>
    <button type="button" className="button button-outline" disabled={!hasDrafts} onClick={exportFile}>{v('Download backup', 'Tải bản sao lưu')}</button>
    <label className="field-label">{v('SELECT BACKUP JSON', 'CHỌN TỆP SAO LƯU JSON')}<input className="field-input" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void selectFile(file) }} /></label>
    <p role="status" aria-live="polite">{busy ? v('Reading backup…', 'Đang đọc tệp sao lưu…') : message}</p>
    {preview.length > 0 && <><p>{v('Drafts to import:', 'Các bản nháp sẽ nhập:')}</p><ul>{preview.map(item => <li key={item.id}>{item.name}</li>)}</ul><div className="resolution-actions"><button type="button" className="button button-outline" onClick={importFile}>{v('Import these drafts', 'Nhập các bản nháp này')}</button><button type="button" className="button button-outline" onClick={() => { generation.current++; setRaw(''); setPreview([]); setStatus('') }}>{v('Cancel import', 'Hủy nhập')}</button></div></>}
  </details>
}
