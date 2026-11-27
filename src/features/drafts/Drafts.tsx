import { useCallback, useEffect, useState } from 'react'
import type { Language } from '../../app/i18n'
import { clearDrafts, deleteDraft, DraftError, DRAFT_KEY, MAX_DRAFTS, MAX_DRAFT_TEXT, readDrafts, saveDraft, type Draft, type DraftContent } from './storage'
import { DraftBackup } from './DraftBackup'

export function Drafts({ language, content, onLoad }: { language: Language; content: DraftContent; onLoad: (draft: DraftContent) => boolean }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const [name, setName] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const failure = useCallback((cause: unknown) => { setNotice(''); setError(cause instanceof DraftError ? cause.code : 'unavailable') }, [])
  const refresh = useCallback(() => {
    try { setDrafts(readDrafts(window.localStorage)); setError('') } catch (cause) { setDrafts([]); failure(cause) }
  }, [failure])
  useEffect(() => {
    refresh()
    const changed = (event: StorageEvent) => { if (event.key === DRAFT_KEY || event.key === null) refresh() }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [refresh])
  function save() {
    try { setDrafts(saveDraft(window.localStorage, name, content)); setName(''); setError(''); setNotice('saved') } catch (cause) { failure(cause) }
  }
  function remove(draft: Draft) {
    if (!window.confirm(v('Delete this saved draft from this browser?', 'Xóa bản nháp đã lưu khỏi trình duyệt này?'))) return
    try { setDrafts(deleteDraft(window.localStorage, draft.id)); setError(''); setNotice('deleted') } catch (cause) { failure(cause) }
  }
  function clear() {
    if (!window.confirm(v('Delete all saved drafts from this browser? This cannot be undone.', 'Xóa tất cả bản nháp khỏi trình duyệt này? Không thể hoàn tác.'))) return
    try { clearDrafts(window.localStorage); setDrafts([]); setError(''); setNotice('cleared') } catch (cause) { failure(cause) }
  }
  const errorMessage = error === 'invalid' ? v('Enter a draft name and valid message, reference date and time zone.', 'Nhập tên bản nháp, nội dung, ngày và múi giờ tham chiếu hợp lệ.') : error === 'duplicate' ? v('That name is already used. Choose a different name.', 'Tên này đã được sử dụng. Hãy chọn tên khác.') : error === 'storage_limit' ? v('Saved text exceeds the storage size limit. Delete a draft or shorten the message.', 'Văn bản vượt giới hạn lưu trữ. Hãy xóa bản nháp hoặc rút ngắn nội dung.') : error === 'full' ? v('The limit is 10 drafts. Delete one before saving another.', 'Tối đa 10 bản nháp. Hãy xóa một bản trước khi lưu thêm.') : error === 'corrupt' ? v('Saved drafts are unreadable or use an unsupported version. They were not changed.', 'Không đọc được bản nháp hoặc phiên bản không được hỗ trợ. Dữ liệu chưa bị thay đổi.') : error === 'missing' ? v('This draft no longer exists. Refresh the list.', 'Bản nháp này không còn tồn tại. Hãy tải lại danh sách.') : error ? v('Browser storage is unavailable or full. Your current work remains on this page.', 'Không thể dùng bộ nhớ trình duyệt hoặc bộ nhớ đã đầy. Nội dung hiện tại vẫn ở trên trang.') : ''
  const noticeMessage = notice === 'saved' ? v('Draft saved on this browser.', 'Đã lưu bản nháp trong trình duyệt này.') : notice === 'deleted' ? v('Draft deleted.', 'Đã xóa bản nháp.') : notice === 'cleared' ? v('All saved drafts deleted.', 'Đã xóa tất cả bản nháp.') : notice === 'loaded' ? v('Draft loaded. Find and review events again.', 'Đã mở bản nháp. Hãy tìm và kiểm tra lại sự kiện.') : ''
  return <details className="drafts-panel"><summary>{v('Saved drafts on this device', 'Bản nháp trên thiết bị này')}</summary>
    <p>{v('Saving is optional. The message and reference settings are stored unencrypted in this browser until deleted or browser storage is cleared. Anyone using this browser profile may see them. Event edits, confirmations, images and PDFs are not saved.', 'Việc lưu là tùy chọn. Nội dung và thiết lập tham chiếu được lưu không mã hóa trong trình duyệt này cho đến khi bạn xóa hoặc bộ nhớ trình duyệt bị xóa. Người dùng chung hồ sơ trình duyệt có thể xem. Các chỉnh sửa sự kiện, xác nhận, ảnh và PDF không được lưu.')}</p>
    <label className="field-label">{v('DRAFT NAME', 'TÊN BẢN NHÁP')}<input className="field-input" maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
    <p>{v(`Up to ${MAX_DRAFTS} drafts, ${MAX_DRAFT_TEXT.toLocaleString('en')} characters each.`, `Tối đa ${MAX_DRAFTS} bản nháp, mỗi bản ${MAX_DRAFT_TEXT.toLocaleString('vi')} ký tự.`)}</p>
    <div className="resolution-actions"><button type="button" className="button button-outline" onClick={save}>{v('Save current message', 'Lưu nội dung hiện tại')}</button><button type="button" className="button button-outline" onClick={refresh}>{v('Refresh drafts', 'Tải lại danh sách')}</button></div>
    <p role="status" aria-live="polite">{errorMessage || noticeMessage}</p>
    {drafts.length > 0 && <ul className="drafts-list">{drafts.map(draft => <li key={draft.id}><div><strong>{draft.name}</strong><span>{new Date(draft.savedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span></div><div className="resolution-actions"><button type="button" className="button button-outline" aria-label={v(`Load draft ${draft.name}`, `Mở bản nháp ${draft.name}`)} onClick={() => { if (onLoad(draft)) { setError(''); setNotice('loaded') } }}>{v('Load', 'Mở')}</button><button type="button" className="button button-outline" aria-label={v(`Delete draft ${draft.name}`, `Xóa bản nháp ${draft.name}`)} onClick={() => remove(draft)}>{v('Delete', 'Xóa')}</button></div></li>)}</ul>}
    {(drafts.length > 0 || error === 'corrupt') && <button type="button" className="button button-outline" onClick={clear}>{v('Delete all saved drafts', 'Xóa tất cả bản nháp')}</button>}
    <DraftBackup language={language} hasDrafts={drafts.length > 0 && error !== 'corrupt' && error !== 'unavailable'} onImported={items => { setDrafts(items); setError(''); setNotice('') }} />
  </details>
}
