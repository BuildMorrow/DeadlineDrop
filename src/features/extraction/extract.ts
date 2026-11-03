export interface Candidate {
  id: string
  source: string
  title: string
  date: string
  time: string
  allDay: boolean
  warnings: string[]
  confirmed: boolean
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
    for (const match of line.matchAll(datePattern)) {
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
      const date = warnings.length ? '' : `${y}-${pad(m)}-${pad(d)}`
      const timeMatch = line.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b|\b(\d{1,2})\s*(?:giờ|h)(?:\s*(\d{1,2}))?\b|\b(\d{1,2})\s*(am|pm)\b/iu)
      let time = ''
      if (timeMatch) {
        let hour = +(timeMatch[1] || timeMatch[4] || timeMatch[6]); const minute = +(timeMatch[2] || timeMatch[5] || 0)
        const period = (timeMatch[3] || timeMatch[7] || '').toLowerCase()
        if (period && hour >= 1 && hour <= 12) hour = hour % 12 + (period === 'pm' ? 12 : 0)
        else if (period) hour = 99
        if (hour < 24 && minute < 60) time = `${pad(hour)}:${pad(minute)}`
        else warnings.push('Invalid time: correct it or choose all-day.')
      } else warnings.push('No time found: confirm all-day or enter a time.')
      candidates.push({ id: `${candidates.length}`, source: line.trim(), title: line.trim(), date, time, allDay: !time, warnings, confirmed: false })
    }
  }
  return candidates
}

