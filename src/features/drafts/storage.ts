import { Temporal } from '@js-temporal/polyfill'

export const DRAFT_KEY = 'deadlinedrop:drafts:v1'
export const MAX_DRAFTS = 10
export const MAX_DRAFT_TEXT = 100_000
const MAX_STORED_LENGTH = 1_200_000
export const MAX_BACKUP_BYTES = 6_100_000

export type DraftContent = { text: string; referenceDate: string; referenceZone: string }
export type Draft = DraftContent & { id: string; name: string; savedAt: string }
export type DraftErrorCode = 'corrupt' | 'invalid' | 'full' | 'unavailable' | 'missing' | 'duplicate' | 'storage_limit'
export class DraftError extends Error { constructor(public readonly code: DraftErrorCode) { super(code) } }

function validContent(value: DraftContent): boolean {
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > MAX_DRAFT_TEXT) return false
  if (typeof value.referenceDate !== 'string' || (value.referenceDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(value.referenceDate))) return false
  try { if (value.referenceDate) Temporal.PlainDate.from(value.referenceDate) } catch { return false }
  if (typeof value.referenceZone !== 'string' || !value.referenceZone || value.referenceZone.length > 100) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value.referenceZone }) } catch { return false }
  return true
}
function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false
  const item = value as Draft
  return typeof item.id === 'string' && /^[0-9a-f-]{36}$/i.test(item.id)
    && typeof item.name === 'string' && !!item.name.trim() && item.name.length <= 60
    && typeof item.savedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.savedAt) && Number.isFinite(Date.parse(item.savedAt))
    && validContent(item)
}
function readValue(storage: Storage): string | null {
  try { return storage.getItem(DRAFT_KEY) } catch { throw new DraftError('unavailable') }
}
export function readDrafts(storage: Storage): Draft[] {
  const raw = readValue(storage)
  if (raw === null) return []
  if (raw.length > MAX_STORED_LENGTH) throw new DraftError('corrupt')
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') throw new Error()
    const data = value as { version?: unknown; drafts?: unknown }
    if (data.version !== 1 || !Array.isArray(data.drafts) || data.drafts.length > MAX_DRAFTS || !data.drafts.every(isDraft)) throw new Error()
    if (new Set(data.drafts.map((item: Draft) => item.id)).size !== data.drafts.length) throw new Error()
    return data.drafts
  } catch { throw new DraftError('corrupt') }
}
function writeDrafts(storage: Storage, drafts: Draft[]) {
  const serialized = JSON.stringify({ version: 1, drafts })
  if (serialized.length > MAX_STORED_LENGTH) throw new DraftError('storage_limit')
  try { storage.setItem(DRAFT_KEY, serialized) } catch { throw new DraftError('unavailable') }
}
export function saveDraft(storage: Storage, name: string, content: DraftContent): Draft[] {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 60 || !validContent(content)) throw new DraftError('invalid')
  const existing = readDrafts(storage)
  if (existing.length >= MAX_DRAFTS) throw new DraftError('full')
  if (existing.some(draft => draft.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new DraftError('duplicate')
  const next = [{ id: crypto.randomUUID(), name: trimmed, savedAt: new Date().toISOString(), ...content }, ...existing]
  writeDrafts(storage, next)
  return next
}
export function deleteDraft(storage: Storage, id: string): Draft[] {
  const existing = readDrafts(storage)
  if (!existing.some(draft => draft.id === id)) throw new DraftError('missing')
  const next = existing.filter(draft => draft.id !== id)
  writeDrafts(storage, next)
  return next
}
export function clearDrafts(storage: Storage): void {
  try { storage.removeItem(DRAFT_KEY) } catch { throw new DraftError('unavailable') }
}

const copyDraft = (draft: Draft): Draft => ({ id: draft.id, name: draft.name, savedAt: draft.savedAt, text: draft.text, referenceDate: draft.referenceDate, referenceZone: draft.referenceZone })

/** Backups are explicit, versioned, and contain only the supported draft fields. */
export function createBackup(storage: Storage): string {
  const drafts = readDrafts(storage)
  if (!drafts.length) throw new DraftError('invalid')
  return JSON.stringify({ format: 'deadlinedrop-drafts', version: 1, drafts: drafts.map(copyDraft) }, null, 2)
}
export function parseBackup(raw: string): Draft[] {
  if (raw.length > MAX_BACKUP_BYTES) throw new DraftError('invalid')
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') throw new Error()
    const data = value as { format?: unknown; version?: unknown; drafts?: unknown }
    if (data.format !== 'deadlinedrop-drafts' || data.version !== 1 || !Array.isArray(data.drafts) || !data.drafts.length || data.drafts.length > MAX_DRAFTS || !data.drafts.every(isDraft)) throw new Error()
    const drafts = (data.drafts as Draft[]).map(copyDraft)
    if (new Set(drafts.map(item => item.id)).size !== drafts.length || new Set(drafts.map(item => item.name.trim().toLocaleLowerCase())).size !== drafts.length) throw new Error()
    return drafts
  } catch { throw new DraftError('invalid') }
}
export function importBackup(storage: Storage, raw: string): Draft[] {
  const incoming = parseBackup(raw)
  const existing = readDrafts(storage)
  if (existing.length + incoming.length > MAX_DRAFTS) throw new DraftError('full')
  const ids = new Set(existing.map(item => item.id))
  const names = new Set(existing.map(item => item.name.trim().toLocaleLowerCase()))
  if (incoming.some(item => ids.has(item.id) || names.has(item.name.trim().toLocaleLowerCase()))) throw new DraftError('duplicate')
  const next = [...incoming, ...existing]
  writeDrafts(storage, next)
  return next
}
