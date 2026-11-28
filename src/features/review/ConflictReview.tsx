import { useMemo } from 'react'
import type { Language } from '../../app/i18n'
import type { Candidate } from '../extraction/extract'
import { findConflicts } from './conflicts'

export function ConflictReview({ events, language, onJump }: { events: Candidate[]; language: Language; onJump: (id: string) => void }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const report = useMemo(() => findConflicts(events), [events])
  return <details className="conflict-review"><summary>{v(`Possible duplicates or overlaps (${report.pairs.length}${report.limited ? '+' : ''})`, `Có thể trùng hoặc giao giờ (${report.pairs.length}${report.limited ? '+' : ''})`)}</summary>
    <p>{v('This checks all candidates, including unconfirmed ones. Matches are suggestions, not automatic changes. Check the original information before deciding.', 'Kiểm tra tất cả sự kiện, kể cả chưa xác nhận. Đây là gợi ý, không tự thay đổi sự kiện. Hãy đối chiếu nội dung gốc trước khi quyết định.')}</p>
    <p>{v('Possible duplicates have the same title and start. Overlaps require explicit start and end times; all-day events are not treated as blocked time.', 'Trùng có thể xảy ra khi tên và thời điểm bắt đầu giống nhau. Chỉ kiểm tra giao giờ khi cả hai sự kiện có giờ bắt đầu và kết thúc; sự kiện cả ngày không được coi là chiếm toàn bộ thời gian.')}</p>
    {report.unresolved > 0 && <p className="validation">{v(`${report.unresolved} events need correction before they can be compared.`, `${report.unresolved} sự kiện cần chỉnh sửa trước khi có thể so sánh.`)}</p>}
    {report.withoutEnd > 0 && <p className="validation">{v(`${report.withoutEnd} timed events have no end time and cannot be checked for overlaps.`, `${report.withoutEnd} sự kiện có giờ nhưng thiếu giờ kết thúc nên không thể kiểm tra giao giờ.`)}</p>}
    {report.limited && <p className="validation">{v('Results are limited to the first 500 events and 100 matching pairs; more may exist.', 'Chỉ kiểm tra 500 sự kiện đầu và hiển thị tối đa 100 cặp; có thể còn trường hợp khác.')}</p>}
    {report.pairs.length === 0 ? <p>{v('No possible matches found within the checks above.', 'Không tìm thấy trường hợp phù hợp trong phạm vi kiểm tra trên.')}</p> : <ol className="conflict-list">{report.pairs.map(pair => <li key={`${pair.first}-${pair.second}`}><strong>{pair.duplicate && pair.overlap ? v('Possible duplicate and overlapping times', 'Có thể trùng và giao giờ') : pair.duplicate ? v('Possible duplicate', 'Có thể trùng') : v('Overlapping times', 'Giờ giao nhau')}</strong><div className="resolution-actions">{[pair.first, pair.second].map(index => <button type="button" key={events[index].id} className="button button-outline" onClick={() => onJump(events[index].id)} aria-label={v(`Review event ${index + 1}`, `Kiểm tra sự kiện ${index + 1}`)}>{v(`Event ${index + 1}`, `Sự kiện ${index + 1}`)}</button>)}</div></li>)}</ol>}
  </details>
}
