import { Temporal } from '@js-temporal/polyfill'
import { isValidEvent } from '../calendar/ics'
import type { Candidate } from '../extraction/extract'

export type ReviewStatus = 'action' | 'ready' | 'confirmed'
export type OverviewItem = { event: Candidate; index: number; date: string | null; status: ReviewStatus }
export type OverviewGroup = { date: string | null; items: OverviewItem[] }

function displayDate(event: Candidate): string | null {
  // Do not place unresolved source-zone dates on the local calendar timeline.
  if (event.needsResolution || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return null
  try {
    const date = Temporal.PlainDate.from(event.date)
    return date.year >= 1000 ? event.date : null
  } catch { return null }
}
export function groupOverview(events: Candidate[], filter: 'all' | ReviewStatus, query: string): OverviewGroup[] {
  const term = query.trim().toLocaleLowerCase()
  const items: OverviewItem[] = events.map((event, index) => {
    const valid = isValidEvent(event)
    return { event, index, date: displayDate(event), status: valid ? (event.confirmed ? 'confirmed' : 'ready') : 'action' }
  })
  const selected = items.filter(item => (filter === 'all' || item.status === filter) && (!term || item.event.title.toLocaleLowerCase().includes(term)))
  selected.sort((a, b) => a.date === b.date ? a.index - b.index : a.date === null ? 1 : b.date === null ? -1 : a.date.localeCompare(b.date))
  const groups: OverviewGroup[] = []
  for (const item of selected) {
    const previous = groups[groups.length - 1]
    if (!previous || previous.date !== item.date) groups.push({ date: item.date, items: [item] })
    else previous.items.push(item)
  }
  return groups
}
