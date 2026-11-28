import { useLayoutEffect, useRef, useState } from 'react'
import type { Language } from '../../app/i18n'
import type { OverviewGroup } from './overview'
import { monthGrid, stepDay, stepMonth } from './monthGrid'

export function ReviewCalendar({ groups, language, onJump }: { groups: OverviewGroup[]; language: Language; onJump: (id: string) => void }) {
  const v = (en: string, vi: string) => language === 'vi' ? vi : en
  const [month, setMonth] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const focusDay = useRef<string | null>(null)
  const dayButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const dated = groups.filter((group): group is OverviewGroup & { date: string } => group.date !== null)
  const unknown = groups.find(group => group.date === null)?.items.length ?? 0
  const shownMonth = month ?? dated[0]?.date.slice(0, 7) ?? null
  const selectedDate = selected?.startsWith(`${shownMonth}-`) ? selected : dated.find(group => group.date.startsWith(`${shownMonth}-`))?.date ?? (shownMonth ? `${shownMonth}-01` : null)
  const selectedGroup = dated.find(group => group.date === selectedDate)
  const dates = new Map(dated.map(group => [group.date, group.items.length]))
  const weekdays = language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  useLayoutEffect(() => {
    if (focusDay.current && focusDay.current === selectedDate) {
      dayButtons.current[focusDay.current]?.focus()
      focusDay.current = null
    }
  }, [selectedDate, shownMonth])
  function move(delta: -1 | 1) {
    if (!shownMonth) return
    const next = stepMonth(shownMonth, delta)
    if (next) { setMonth(next); setSelected(null) }
  }
  function moveSelection(date: string, key: string) {
    const days = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -7 : key === 'ArrowDown' ? 7 : 0
    if (!days) return false
    const next = stepDay(date, days)
    if (next) { focusDay.current = next; setMonth(next.slice(0, 7)); setSelected(next) }
    return true
  }
  return <details className="review-calendar" onToggle={e => setOpen(e.currentTarget.open)}><summary>{v('Calendar view', 'Xem theo lịch')}</summary>{open && <>
    <p>{v('The calendar follows the overview filters and does not change export. Only resolved local dates appear here.', 'Lịch tuân theo bộ lọc của bảng tổng quan và không thay đổi nội dung xuất. Chỉ ngày địa phương đã xác định được hiển thị.')}</p>
    <p>{v('Use arrow keys to move between days.', 'Dùng các phím mũi tên để chuyển ngày.')}</p>
    {unknown > 0 && <p>{v(`${unknown} matching ${unknown === 1 ? 'event has an unresolved date and is' : 'events have unresolved dates and are'} not placed on the calendar.`, `${unknown} sự kiện phù hợp chưa rõ ngày và không được đặt trên lịch.`)}</p>}
    {!shownMonth ? <p>{v('No resolved dates to show.', 'Không có ngày đã xác định để hiển thị.')}</p> : <>
      <div className="calendar-header"><button className="button button-outline" type="button" disabled={!stepMonth(shownMonth, -1)} onClick={() => move(-1)} aria-label={v('Previous month', 'Tháng trước')}>‹</button><strong aria-live="polite">{shownMonth}</strong><button className="button button-outline" type="button" disabled={!stepMonth(shownMonth, 1)} onClick={() => move(1)} aria-label={v('Next month', 'Tháng sau')}>›</button></div>
      <div className="calendar-grid" role="group" aria-label={v(`Days in ${shownMonth}`, `Các ngày trong ${shownMonth}`)}>{weekdays.map((day, index) => <span key={index} className="calendar-weekday" aria-hidden="true">{day}</span>)}{monthGrid(shownMonth).map((date, index) => date ? <button type="button" key={date} ref={node => { dayButtons.current[date] = node }} className="calendar-day" tabIndex={date === selectedDate ? 0 : -1} aria-pressed={date === selectedDate} aria-label={v(`${date}: ${dates.get(date) ?? 0} ${(dates.get(date) ?? 0) === 1 ? 'event' : 'events'}`, `${date}: ${dates.get(date) ?? 0} sự kiện`)} onClick={() => setSelected(date)} onKeyDown={e => { if (moveSelection(date, e.key)) e.preventDefault() }}><span>{Number(date.slice(-2))}</span>{Boolean(dates.get(date)) && <small>{dates.get(date)}</small>}</button> : <span key={`blank-${index}`} aria-hidden="true" />)}</div>
      {selectedDate && <section className="calendar-selection" aria-label={v(`Events on ${selectedDate}`, `Sự kiện ngày ${selectedDate}`)}><h5>{selectedDate}</h5>{selectedGroup ? <ul>{selectedGroup.items.map(item => <li key={item.event.id}><span>{item.event.title.trim() || v('Untitled event', 'Sự kiện chưa có tên')}</span><button type="button" className="button button-outline" onClick={() => onJump(item.event.id)} aria-label={v(`Review event ${item.index + 1}`, `Kiểm tra sự kiện ${item.index + 1}`)}>{v('Review', 'Kiểm tra')}</button></li>)}</ul> : <p>{v('No matching events on this day.', 'Không có sự kiện phù hợp vào ngày này.')}</p>}</section>}
    </>}</>}
  </details>
}
