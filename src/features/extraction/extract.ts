import { Temporal } from '@js-temporal/polyfill'
import { convertOffset, fields, localOptions, zone, type Choice } from '../calendar/time'

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
  resolutionKind: 'zone' | 'range' | 'offset-or-range' | 'source-overlap' | ''
  ambiguousOffset: string
  sourceOverlap?: { date: string; time: string; zone: string }
  editedDate: boolean
  editedTime: boolean
  editedEndDate: boolean
  editedEndTime: boolean
  endDate: string
  endTime: string
  rangeRequired: boolean
  choice: Choice
  endChoice: Choice
}

const datePattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})(?=\b|T\d)|\b(\d{1,2})[.\x2f-](\d{1,2})(?:[.\x2f-](\d{4}))?\b|\b(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+(?:năm\s+)?(\d{4}))?\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/giu
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const pad = (n: number) => String(n).padStart(2, '0')
function validDate(y: number, m: number, d: number) {
  if (y < 1000) return false
  try { Temporal.PlainDate.from({ year: y, month: m, day: d }, { overflow: 'reject' }); return true } catch { return false }
}

const relativePattern = /(?<![\p{L}\p{N}])(?:day\s+after\s+tomorrow|next\s+week|in\s+\d+\s+(?:weeks?|months?)|tuần\s+sau|tháng\s+sau|năm\s+sau|ngày\s+kia|today|tomorrow|hôm nay|ngày mai|in\s+\d+\s+days?|sau\s+\d+\s+ngày|(?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|thứ\s+(?:hai|ba|tư|năm|sáu|bảy)|chủ\s+nhật)(?![\p{L}\p{N}])/giu
export function hasRelativeDates(text: string): boolean { return [...text.matchAll(relativePattern)].length > 0 }

export function extractCandidates(text: string, referenceDate?: string, referenceZone = zone()): Candidate[] {
  const candidates: Candidate[] = []
  for (const line of text.split(/\r?\n/)) {
    // Split only independently dated sentences; ranges and references to another
    // sentence stay together so the existing ambiguity gate blocks export.
    const sentences = line.split(/(?<=[.!?])\s+(?=[\p{Lu}])/u)
    const sentenceDates = sentences.map(sentence => [...sentence.matchAll(datePattern)].length + [...sentence.matchAll(relativePattern)].length)
    const crossSentenceClue = /\b(?:from|to|until|through|between|before|after|not|instead|rescheduled|postponed|cancelled|canceled)\b|(?:từ|đến|trước|sau|không|thay|hoãn|hủy)/iu.test(line)
    if (sentences.length > 1 && !crossSentenceClue && sentenceDates.every(count => count === 1)) {
      for (const sentence of sentences) {
        for (const event of extractCandidates(sentence, referenceDate, referenceZone)) {
          event.id = String(candidates.length)
          event.warnings.unshift('Separated from a paragraph: check the event against the full message.')
          candidates.push(event)
        }
      }
      continue
    }
    const relatives = [...line.matchAll(relativePattern)]
    if (relatives.length && referenceDate) {
      let reference: Temporal.PlainDate | undefined
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
          const parsed = Temporal.PlainDate.from(referenceDate)
          if (parsed.year >= 1000 && parsed.year <= 9999) reference = parsed
        }
      } catch { /* invalid references cannot be used */ }
      if (!reference) continue
      try { new Intl.DateTimeFormat('en', { timeZone: referenceZone }) } catch { continue }
      const explicitDates = [...line.matchAll(datePattern)]
      // These expressions can change or contradict the meaning of a relative date.
      const relativeTimes = [...line.matchAll(/\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?|\b\d{1,2}\s*(?:giờ|h)(?:\s*\d{1,2})?(?![\p{L}\p{N}])|\b\d{1,2}\s*(?:am|pm)\b/giu)]
      const expression = relatives[0][0]
      const remainder = line.slice(0, relatives[0].index) + line.slice(relatives[0].index! + expression.length)
      const daysMatch = expression.match(/\d+/)
      const days = daysMatch ? Number(daysMatch[0]) : /^(?:tomorrow|ngày mai)$/iu.test(expression) ? 1 : 0
      const weekday = /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|thứ|chủ)/iu.test(expression)
      const unsupported = /(?:week|month|tuần|tháng|năm|kia|day\s+after)/iu.test(expression)
      let uncertain = weekday || unsupported || !Number.isSafeInteger(days) || days > 3650 || relativeTimes.length > 1 || relatives.length !== 1 || explicitDates.length > 0 || /[+-]\d{2}:?\d{2}\b/.test(line) || /\b(?:not|except|before|after|or|and|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|next|previous|utc|gmt)\b|(?:không|trước|sau|hoặc|hôm qua|thứ|tuần|múi giờ)/iu.test(remainder)
      let date = reference.add({ days: uncertain ? 0 : days })
      if (date.year > 9999) { uncertain = true; date = reference }
      const replaced = line.slice(0, relatives[0].index) + date.toString() + line.slice(relatives[0].index! + relatives[0][0].length)
      const derived = extractCandidates(replaced)
      for (const event of derived) {
        event.id = String(candidates.length)
        event.source = line.trim(); event.title = line.trim()
        event.warnings.unshift(`Relative date based on ${referenceDate} in ${referenceZone}: check the original message.`)
        if (!uncertain && !event.needsResolution && event.date && event.time && referenceZone !== zone()) {
          const options = localOptions(event.date, event.time, referenceZone)
          if (options.length === 1) {
            Object.assign(event, fields(options[0].withTimeZone(zone())))
            event.sourceZone = referenceZone
          } else if (options.length === 2) {
            event.needsResolution = true; event.resolutionKind = 'source-overlap'
            event.sourceOverlap = { date: event.date, time: event.time, zone: referenceZone }
            event.warnings.push('This source time occurs twice: choose the intended occurrence before confirmation.')
          } else {
            event.needsResolution = true; event.resolutionKind = 'zone'
            event.warnings.push('This time does not exist in the reference time zone: enter the correct local date and time.')
          }
        }
        if (uncertain) {
          event.date = ''; event.needsResolution = true; event.resolutionKind = 'zone'
          event.warnings.push('Multiple or unclear date expressions: enter the correct local date and time.')
        }
        candidates.push(event)
      }
      continue
    }
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
      const timeMatch = matches.length === 1 ? line.replace(/(\d{4}-\d{2}-\d{2})T/, '$1 ').match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?(?=\b|Z\b)|\b(\d{1,2})\s*(?:giờ|h)(?:\s*(\d{1,2}))?(?![\p{L}\p{N}])|\b(\d{1,2})\s*(am|pm)\b/iu) : null
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
      let resolutionKind: Candidate['resolutionKind'] = ''
      let ambiguousOffset = ''
      const iso = line.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})\b/i)
      const prefixed = line.match(/\b(?:UTC|GMT)\b(?:\s*[+-][\d:]*)?/i)
      const malformedPrefix = !!prefixed && !/^(?:UTC|GMT)(?:\s*[+-](?:\d{1,2}|\d{2}\d{2}|\d{1,2}:\d{2}))?$/i.test(prefixed[0])
      const unsupportedIsoOffset = !iso && /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?[+-]\d{2,4}\b/i.test(line)
      const unknown = line.match(/\b(?:[A-Za-z_]+\/[A-Za-z_]+|PST|PDT|EST|EDT|CST|CDT|MST|MDT|IST|BST|CET|CEST|JST|AEST|AEDT)\b/i) || [...line.matchAll(/\b[A-Z]{2,5}\b/g)].find(m => !['UTC', 'GMT', 'AM', 'PM'].includes(m[0]))
      const range = !iso ? line.match(/\b(\d{1,2}:\d{2})\s*(-|–|—|to|đến)\s*(\d{1,2}:\d{2})\b/iu) : null
      // Unsupported am/pm or Vietnamese time ranges must retain an end field.
      const unsupportedRange = !iso && !range && /\b(?:\d{1,2}:\d{2}(?:\s*(?:am|pm))?|\d{1,2}\s*(?:am|pm)|\d{1,2}\s*(?:giờ|h)(?:\s*\d{1,2})?)\s*(?:-|–|—|to|đến)\s*(?:\d{1,2}:\d{2}(?:\s*(?:am|pm))?|\d{1,2}\s*(?:am|pm)|\d{1,2}\s*(?:giờ|h)(?:\s*\d{1,2})?)(?![\p{L}\p{N}])/iu.test(line)
      const shorthandRange = !iso && !range && /\b(?:\d{1,2}\s*(?:am|pm|giờ|h)\s*(?:-|–|—|to|đến)\s*\d{1,2}|\d{1,2}\s*(?:-|–|—|to|đến)\s*\d{1,2}\s*(?:am|pm|giờ|h))(?![\p{L}\p{N}])/iu.test(line)
      const barePositive = line.match(/\b\d{1,2}:\d{2}\s*(\+\d{2}:?\d{2})\b/)
      let offset = ''
      if (iso) {
        sourceZone = iso[2]
        if (iso[1] && iso[1] !== '00') { needsResolution = true; resolutionKind = 'zone'; warnings.push('Seconds are not supported: enter a corrected local time.') }
        else offset = iso[2].toUpperCase() === 'Z' ? '+00:00' : iso[2]
      } else if (prefixed) {
        sourceZone = prefixed[0]
        const part = sourceZone.match(/([+-])(\d{1,2})(?::?(\d{2}))?$/)
        const hours = part ? +part[2] : 0, minutes = part ? +(part[3] || 0) : 0
        if (!malformedPrefix && hours <= 23 && minutes < 60) offset = part ? `${part[1]}${pad(hours)}:${pad(minutes)}` : '+00:00'
        else { needsResolution = true; resolutionKind = 'zone'; warnings.push('Invalid source offset: enter a corrected local time.') }
      } else if (barePositive) {
        sourceZone = barePositive[1]
        offset = sourceZone.includes(':') ? sourceZone : `${sourceZone.slice(0, 3)}:${sourceZone.slice(3)}`
      }
      if (unsupportedIsoOffset) { needsResolution = true; resolutionKind = 'zone'; sourceZone = 'Unsupported ISO offset'; warnings.push('The ISO time zone offset is unsupported: enter the correct local date and time.') }
      if (unknown) { sourceZone = unknown[0]; needsResolution = true; resolutionKind = 'zone'; warnings.push('The source time zone is ambiguous or unsupported. Enter the correct local date and time.') }
      if (range && matches.length === 1) {
        const [eh, em] = range[3].split(':').map(Number)
        if (eh < 24 && em < 60) { endTime = `${pad(eh)}:${pad(em)}`; endDate = date }
        needsResolution = true
        resolutionKind = range[2] === '-' && eh <= 23 && em < 60 ? 'offset-or-range' : 'range'
        if (resolutionKind === 'offset-or-range') ambiguousOffset = `-${pad(eh)}:${pad(em)}`
        warnings.push('Review the start and end of this range, or choose the offset interpretation if applicable.')
      }
      if (range && (prefixed || unknown)) { resolutionKind = 'zone'; warnings.push('A range with a source time zone requires manual local date and time correction.') }
      if (unsupportedRange || shorthandRange) { needsResolution = true; resolutionKind = 'zone'; warnings.push('This time range needs a corrected start and end date and time.') }
      const timeCount = [...line.replace(/(?:UTC|GMT)\s*[+-]\d{1,2}(?::?\d{2})?\b|[+]\d{2}:?\d{2}\b/gi, '').matchAll(/\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?|\b\d{1,2}\s*(?:giờ|h)(?:\s*\d{1,2})?(?![\p{L}\p{N}])|\b\d{1,2}\s*(?:am|pm)\b/giu)].length
      if (!range && !iso && timeCount > 1) { needsResolution = true; resolutionKind = 'zone'; warnings.push('Multiple times found: enter the correct local date and time.') }
      if (!iso && /\b\d{1,2}:\d{2}:\d{2}\b/.test(line)) { needsResolution = true; resolutionKind = 'zone'; warnings.push('Seconds are not supported: enter a corrected local time.') }
      const prefixedZoneCount = [...line.matchAll(/\b(?:UTC|GMT)\b(?:\s*[+-][\d:]*)?/gi)].length
      if (prefixedZoneCount > 1 || (prefixed && barePositive) || (iso && prefixed)) {
        needsResolution = true; resolutionKind = 'zone'; warnings.push('Multiple time zone expressions found: enter the correct local date and time.')
      }
      if (offset && !needsResolution && date && time && matches.length === 1) {
        try { const local = fields(convertOffset(date, time, offset)); date = local.date; time = local.time; choice = local.choice }
        catch { needsResolution = true; resolutionKind = 'zone'; warnings.push('Could not convert the source time zone. Enter the correct local time.') }
      } else if (offset && (!date || !time || matches.length !== 1)) { needsResolution = true; resolutionKind = 'zone'; warnings.push('Correct the date and time for the source zone.') }
      if (matches.length > 1) { needsResolution = true; resolutionKind = 'zone'; warnings.push('Multiple dates: enter the correct local date and time for each event.') }
      candidates.push({ id: `${candidates.length}`, source: line.trim(), title: line.trim(), date, time, allDay: false, warnings, confirmed: false, sourceZone, needsResolution, resolutionKind, ambiguousOffset, editedDate: false, editedTime: false, editedEndDate: false, editedEndTime: false, endDate, endTime, rangeRequired: !!range || !!unsupportedRange || !!shorthandRange, choice, endChoice })
    }
  }
  return candidates
}

