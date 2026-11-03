import type { Candidate } from '../extraction/extract'

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const pad = (value: number) => String(value).padStart(2, '0')
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
  const [y, m, d] = event.date.split('-').map(Number)
  if (y < 1000) return false
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return false
  if (event.allDay) return true
  if (!/^\d{2}:\d{2}$/.test(event.time)) return false
  const [h, min] = event.time.split(':').map(Number)
  if (h > 23 || min > 59) return false
  const local = new Date(y, m - 1, d, h, min)
  return local.getHours() === h && local.getMinutes() === min
}
export function createCalendar(events: Candidate[], now = new Date()): string {
  if (!events.length || events.some(event => !event.confirmed || !isValidEvent(event))) throw new Error('Only valid, confirmed events can be exported.')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BuildMorrow//DeadlineDrop//EN', 'CALSCALE:GREGORIAN']
  events.forEach((event, index) => {
    lines.push('BEGIN:VEVENT', `UID:${crypto.randomUUID()}-${index}@deadlinedrop`, `DTSTAMP:${utc(now)}`, `SUMMARY:${escapeText(event.title.trim())}`)
    const [y, m, d] = event.date.split('-').map(Number)
    if (event.allDay) {
      const next = new Date(y, m - 1, d + 1)
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`)
    } else {
      const [h, min] = event.time.split(':').map(Number)
      lines.push(`DTSTART:${utc(new Date(y, m - 1, d, h, min))}`)
    }
    lines.push('END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
