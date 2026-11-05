import { Temporal } from '@js-temporal/polyfill'
import type { Candidate } from '../extraction/extract'
import { resolveLocal } from './time'

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
function fold(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let part = ''
  for (const char of line) {
    if (encoder.encode(part + char).length > 75) { parts.push(part); part = ' ' }
    part += char
  }
  parts.push(part)
  return parts.join('\r\n')
}
function utc(date: Date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') }
export function isValidEvent(event: Candidate): boolean {
  if (!event.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return false
  let date: Temporal.PlainDate
  try { date = Temporal.PlainDate.from(event.date) } catch { return false }
  if (date.year < 1000) return false
  if (event.needsResolution) return false
  if (event.allDay) return !event.rangeRequired && !event.endTime && date.add({ days: 1 }).year <= 9999
  const start = resolveLocal(event.date, event.time, event.choice)
  if (!start || new Date(start.epochMilliseconds).getUTCFullYear() > 9999) return false
  if (event.rangeRequired || event.endTime || event.endDate) {
    const end = resolveLocal(event.endDate, event.endTime, event.endChoice)
    return !!end && new Date(end.epochMilliseconds).getUTCFullYear() <= 9999 && end.epochNanoseconds > start.epochNanoseconds
  }
  return true
}
export function createCalendar(events: Candidate[], now = new Date()): string {
  if (!events.length || events.some(event => !event.confirmed || !isValidEvent(event))) throw new Error('Only valid, confirmed events can be exported.')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BuildMorrow//DeadlineDrop//EN', 'CALSCALE:GREGORIAN']
  events.forEach((event, index) => {
    lines.push('BEGIN:VEVENT', `UID:${crypto.randomUUID()}-${index}@deadlinedrop`, `DTSTAMP:${utc(now)}`, `SUMMARY:${escapeText(event.title.trim())}`)
    if (event.allDay) {
      const next = Temporal.PlainDate.from(event.date).add({ days: 1 }).toString().replace(/-/g, '')
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next}`)
    } else {
      const start = resolveLocal(event.date, event.time, event.choice)!
      lines.push(`DTSTART:${utc(new Date(start.epochMilliseconds))}`)
      if (event.endTime) {
        const end = resolveLocal(event.endDate, event.endTime, event.endChoice)!
        lines.push(`DTEND:${utc(new Date(end.epochMilliseconds))}`)
      }
    }
    lines.push('END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
