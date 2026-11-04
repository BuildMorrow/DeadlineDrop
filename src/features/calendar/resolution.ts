import type { Candidate } from '../extraction/extract'
import { convertOffset, fields } from './time'
import { isValidEvent } from './ics'

export function resolveRange(event: Candidate): Candidate {
  if (!event.needsResolution || !['range', 'offset-or-range'].includes(event.resolutionKind)) return event
  const result = { ...event, needsResolution: false, resolutionKind: '' as const, confirmed: false }
  return isValidEvent(result) ? result : event
}
export function resolveOffset(event: Candidate): Candidate {
  if (!event.needsResolution || event.resolutionKind !== 'offset-or-range' || !event.ambiguousOffset) return event
  try {
    const local = fields(convertOffset(event.date, event.time, event.ambiguousOffset))
    return { ...event, ...local, sourceZone: event.ambiguousOffset, needsResolution: false, resolutionKind: '', rangeRequired: false, endDate: '', endTime: '', confirmed: false }
  } catch { return event }
}
export function resolveManual(event: Candidate): Candidate {
  if (!event.needsResolution || event.resolutionKind !== 'zone' || !event.editedDate || !event.editedTime || (event.rangeRequired && (!event.editedEndDate || !event.editedEndTime))) return event
  const result = { ...event, needsResolution: false, resolutionKind: '' as const, confirmed: false }
  return isValidEvent(result) ? result : event
}
