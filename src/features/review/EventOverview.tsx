import { useState } from 'react'
import type { Language } from '../../app/i18n'
import type { Candidate } from '../extraction/extract'
import { groupOverview, type ReviewStatus } from './overview'
import { ReviewCalendar } from './ReviewCalendar'

export function EventOverview({ events, language, onJump }: { events: Candidate[]; language: Language; onJump: (id: string) => void }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all')
  const [query, setQuery] = useState('')
  const groups = groupOverview(events, filter, query)
  const count = groups.reduce((total, group) => total + group.items.length, 0)
  return <details className="event-overview"><summary>{v('Event overview', 'Tổng quan sự kiện')}</summary>
    <p>{v('Browse candidates by date and jump to their review card. Filtering does not change which events are exported.', 'Xem các sự kiện theo ngày và chuyển đến thẻ kiểm tra. Bộ lọc không thay đổi các sự kiện được xuất.')}</p>
    <label className="field-label">{v('SEARCH TITLES', 'TÌM TÊN SỰ KIỆN')}<input className="field-input" type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <label className="field-label">{v('REVIEW STATUS', 'TRẠNG THÁI KIỂM TRA')}<select className="field-input" value={filter} onChange={e => setFilter(e.target.value as 'all' | ReviewStatus)}><option value="all">{v('All events', 'Tất cả sự kiện')}</option><option value="action">{v('Needs correction', 'Cần chỉnh sửa')}</option><option value="ready">{v('Ready to confirm', 'Chờ xác nhận')}</option><option value="confirmed">{v('Confirmed', 'Đã xác nhận')}</option></select></label>
    <p role="status" aria-live="polite">{v(`${count} of ${events.length} shown`, `Hiển thị ${count} trên ${events.length} sự kiện`)}</p>
    <ReviewCalendar groups={groups} language={language} onJump={onJump} />
    {groups.length === 0 ? <p>{v('No events match this filter.', 'Không có sự kiện phù hợp bộ lọc.')}</p> : <div className="overview-groups">{groups.map(group => <section key={group.date ?? 'unresolved'} aria-label={group.date ?? v('Date not resolved', 'Ngày chưa rõ')}><h5>{group.date ?? v('Date not resolved', 'Ngày chưa rõ')}</h5><ul>{group.items.map(item => <li key={item.event.id}><div><strong>{item.event.title.trim() || v('Untitled event', 'Sự kiện chưa có tên')}</strong><span>{item.status === 'confirmed' ? v('Confirmed', 'Đã xác nhận') : item.status === 'ready' ? v('Ready to confirm', 'Chờ xác nhận') : v('Needs correction', 'Cần chỉnh sửa')}</span></div><button type="button" className="button button-outline" onClick={() => onJump(item.event.id)} aria-label={v(`Review event ${item.index + 1}`, `Kiểm tra sự kiện ${item.index + 1}`)}>{v('Review', 'Kiểm tra')}</button></li>)}</ul></section>)}</div>}
  </details>
}
