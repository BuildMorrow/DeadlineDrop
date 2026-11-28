import { isValidEvent } from '../calendar/ics'
import { resolveLocal } from '../calendar/time'
import type { Candidate } from '../extraction/extract'

const MAX_EVENTS = 500
const MAX_PAIRS = 100
type Checked = { event: Candidate; index: number; start: bigint | null; end: bigint | null; duplicateKey: string }
export type ConflictPair = { first: number; second: number; duplicate: boolean; overlap: boolean }
export type ConflictReport = { pairs: ConflictPair[]; unresolved: number; withoutEnd: number; limited: boolean }

/** Comparisons are informational and never modify or confirm events. */
export function findConflicts(events: Candidate[]): ConflictReport {
  const report: ConflictReport = { pairs: [], unresolved: 0, withoutEnd: 0, limited: events.length > MAX_EVENTS }
  const checked: Checked[] = []
  for (const [index, event] of events.slice(0, MAX_EVENTS).entries()) {
    if (!isValidEvent(event)) { report.unresolved++; continue }
    const title = event.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
    if (event.allDay) {
      checked.push({ event, index, start: null, end: null, duplicateKey: JSON.stringify([title, 'all-day', event.date]) })
      continue
    }
    const start = resolveLocal(event.date, event.time, event.choice)!.epochNanoseconds
    const end = event.endTime ? resolveLocal(event.endDate, event.endTime, event.endChoice)!.epochNanoseconds : null
    if (end === null) report.withoutEnd++
    checked.push({ event, index, start, end, duplicateKey: JSON.stringify([title, 'timed', start.toString()]) })
  }
  for (let i = 0; i < checked.length; i++) {
    for (let j = i + 1; j < checked.length; j++) {
      const first = checked[i], second = checked[j]
      const duplicate = first.duplicateKey === second.duplicateKey
      // Only compare actual timed ranges; never infer a duration for a point event.
      const overlap = first.start !== null && first.end !== null && second.start !== null && second.end !== null && first.start < second.end && second.start < first.end
      if (!duplicate && !overlap) continue
      if (report.pairs.length === MAX_PAIRS) { report.limited = true; return report }
      report.pairs.push({ first: first.index, second: second.index, duplicate, overlap })
    }
  }
  return report
}
