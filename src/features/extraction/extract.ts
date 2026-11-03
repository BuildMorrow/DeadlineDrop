import { convertOffset, fields, type Choice } from '../calendar/time'

export interface Candidate {
  id: string
  source: string
  title: string
  date: string
  time: string
  allDay: boolean
  warnings: string[]
  confirmed: boolean
  sourceZone: string
  needsResolution: boolean
  endDate: string
  endTime: string
  rangeRequired: boolean
  choice: Choice
  endChoice: Choice
}

const datePattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})[.\x2f-](\d{1,2})(?:[.\x2f-](\d{4}))?\b|\b(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+(?:năm\s+)?(\d{4}))?\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/giu
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const pad = (n: number) => String(n).padStart(2, '0')
function validDate(y: number, m: number, d: number) {
  const date = new Date(0)
  date.setFullYear(y, m - 1, d)
  return y >= 1000 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function extractCandidates(text: string): Candidate[] {
  const candidates: Candidate[] = []
  for (const line of text.split(/\r?\n/)) {
    const matches = [...line.matchAll(datePattern)].filter(match => line[(match.index ?? 0) - 1] !== ':' && line[(match.index ?? 0) + match[0].length] !== ':')
    for (const match of matches) {
      let y = 0, m = 0, d = 0
      const warnings: string[] = []
      if (match[1]) { y = +match[1]; m = +match[2]; d = +match[3] }
      else if (match[4]) {
        const a = +match[4], b = +match[5]
        y = +(match[6] || 0)
        if (a <= 12 && b <= 12 && a !== b) warnings.push('Ambiguous numeric date: choose the correct date.')
        else if (a > 12 && b <= 12) { d = a; m = b }
        else if (b > 12 && a <= 12) { m = a; d = b }
        else { d = a; m = b }
      } else if (match[7]) { d = +match[7]; m = +match[8]; y = +(match[9] || 0) }
      else { m = months.indexOf(match[10].toLowerCase()) + 1; d = +match[11]; y = +(match[12] || 0) }
      if (!y) warnings.push('Year missing: enter a date.')
      else if (!warnings.length && !validDate(y, m, d)) warnings.push('Invalid date: enter a valid date.')
      let date = warnings.length ? '' : `${y}-${pad(m)}-${pad(d)}`
      if (matches.length > 1) warnings.push('Multiple dates on this line: check each event and enter its time.')
      const timeMatch = matches.length === 1 ? line.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b|\b(\d{1,2})\s*(?:giờ|h)(?:\s*(\d{1,2}))?\b|\b(\d{1,2})\s*(am|pm)\b/iu) : null
      let time = ''
      if (timeMatch) {
        let hour = +(timeMatch[1] || timeMatch[4] || timeMatch[6]); const minute = +(timeMatch[2] || timeMatch[5] || 0)
        const period = (timeMatch[3] || timeMatch[7] || '').toLowerCase()
        if (period && hour >= 1 && hour <= 12) hour = hour % 12 + (period === 'pm' ? 12 : 0)
        else if (period) hour = 99
        if (hour < 24 && minute < 60) time = `${pad(hour)}:${pad(minute)}`
        else warnings.push('Invalid time: correct it or choose all-day.')
      } else warnings.push('No time found: confirm all-day or enter a time.')
      let endDate = '', endTime = '', sourceZone = ''
      let choice: Choice = ''
      const endChoice: Choice = ''
      let needsResolution = false
      const range = line.match(/\b(\d{1,2}:\d{2})\s*(?:-|–|—|to|đến)\s*(\d{1,2}:\d{2})\b/iu)
      const timeCount = [...line.replace(/(?:UTC|GMT)\s*[+-]\d{1,2}(?::?\d{2})?\b|\s+[+]\d{2}:?\d{2}\b/gi, '').matchAll(/\b\d{1,2}:\d{2}\b/g)].length
      if (range && timeCount === 2 && matches.length === 1) {
        const [eh, em] = range[2].split(':').map(Number)
        if (eh < 24 && em < 60) { endTime = `${pad(eh)}:${pad(em)}`; endDate = date }
        needsResolution = true; warnings.push('Review the start and end of this range and confirm the interpretation.')
        if (!endTime || endTime <= time) { needsResolution = true; warnings.push('Check the end date and time; the range may cross midnight.') }
      } else if (timeCount > 1) { needsResolution = true; warnings.push('Multiple times found: correct the start and end before confirming.') }
      const suffix = range ? line.slice((range.index ?? 0) + range[0].length) : timeMatch ? line.slice((timeMatch.index ?? 0) + timeMatch[0].length) : ''
      const zoneMatch = suffix.match(/^\s*((?:UTC|GMT)(?:\s*[+-]\d{1,2}(?::?\d{2})?)?|[+-]\d{2}(?::?\d{2})?)\b/i)
      const unsupported = /\b(?:[A-Z]{2,5}|[A-Za-z_]+\/[A-Za-z_]+)\b/.test(suffix.replace(/\b(?:AM|PM)\b/gi, ''))
      if (zoneMatch) {
        sourceZone = zoneMatch[1]
        const offsetMatch = sourceZone.match(/([+-])(\d{1,2})(?::?(\d{2}))?$/)
        const hours = offsetMatch ? +offsetMatch[2] : 0, minutes = offsetMatch ? +(offsetMatch[3] || 0) : 0
        const offset = offsetMatch ? `${offsetMatch[1]}${pad(hours)}:${pad(minutes)}` : '+00:00'
        if (hours > 23 || minutes > 59 || !date || !time || range || unsupported && suffix.replace(zoneMatch[0], '').trim()) {
          needsResolution = true; warnings.push('Source time zone or range needs manual correction.')
        } else {
          try { const local = fields(convertOffset(date, time, offset)); date = local.date; time = local.time; choice = local.choice }
          catch { needsResolution = true; warnings.push('Could not convert the source time zone.') }
        }
      } else if (unsupported || /\b(?:UTC|GMT)\b/i.test(line) || /[+-]\d{2}:?\d{2}\b/.test(suffix)) {
        needsResolution = true; sourceZone = suffix.trim(); warnings.push('Unrecognized or ambiguous time zone: correct the local date and time.')
      }
      candidates.push({ id: `${candidates.length}`, source: line.trim(), title: line.trim(), date, time, allDay: false, warnings, confirmed: false, sourceZone, needsResolution, endDate, endTime, rangeRequired: !!range || timeCount > 1, choice, endChoice })
    }
  }
  return candidates
}

