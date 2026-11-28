import type { Candidate } from '../extraction/extract'

/** An empty event has no invented title, date, time, duration or confirmation. */
export function newManualEvent(id: string): Candidate {
  return {
    id, manual: true, source: '', title: '', date: '', time: '', allDay: false,
    warnings: [], confirmed: false, sourceZone: '', needsResolution: false, resolutionKind: '',
    ambiguousOffset: '', editedDate: false, editedTime: false, editedEndDate: false,
    editedEndTime: false, endDate: '', endTime: '', rangeRequired: false, choice: '', endChoice: '',
  }
}
