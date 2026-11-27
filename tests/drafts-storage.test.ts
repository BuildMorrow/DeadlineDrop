// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { clearDrafts, deleteDraft, DRAFT_KEY, MAX_DRAFTS, MAX_DRAFT_TEXT, readDrafts, saveDraft } from '../src/features/drafts/storage'

const content = { text: 'Meeting 2027-05-20 10:00', referenceDate: '2027-05-20', referenceZone: 'Asia/Bangkok' }
afterEach(() => localStorage.clear())
describe('opt-in local drafts', () => {
  it('saves, reads and deletes multiple drafts without changing other storage', () => {
    localStorage.setItem('unrelated', 'keep')
    expect(readDrafts(localStorage)).toEqual([])
    saveDraft(localStorage, 'First', content)
    const drafts = saveDraft(localStorage, 'Second', { ...content, text: 'Nộp bài 25 tháng 5 năm 2027' })
    expect(drafts.map(draft => draft.name)).toEqual(['Second', 'First'])
    expect(readDrafts(localStorage)).toEqual(drafts)
    expect(deleteDraft(localStorage, drafts[0].id).map(draft => draft.name)).toEqual(['First'])
    clearDrafts(localStorage)
    expect(localStorage.getItem('unrelated')).toBe('keep')
    expect(readDrafts(localStorage)).toEqual([])
  })
  it('rejects invalid dates, zones, oversized text and empty names', () => {
    for (const bad of [ { ...content, text: 'x'.repeat(MAX_DRAFT_TEXT + 1) }, { ...content, referenceDate: '2027-02-29' }, { ...content, referenceZone: 'Invalid/Zone' } ]) {
      expect(() => saveDraft(localStorage, 'Draft', bad)).toThrow('invalid')
    }
    expect(() => saveDraft(localStorage, '  ', content)).toThrow('invalid')
    expect(readDrafts(localStorage)).toEqual([])
  })
  it('does not overwrite corrupt or unsupported stored data', () => {
    for (const raw of ['bad JSON', JSON.stringify({ version: 2, drafts: [] }), JSON.stringify({ version: 1, drafts: [{ id: 'bad' }] })]) {
      localStorage.setItem(DRAFT_KEY, raw)
      expect(() => readDrafts(localStorage)).toThrow('corrupt')
      expect(() => saveDraft(localStorage, 'New', content)).toThrow('corrupt')
      expect(localStorage.getItem(DRAFT_KEY)).toBe(raw)
    }
  })
  it('enforces the draft limit without deleting existing entries', () => {
    for (let i = 0; i < MAX_DRAFTS; i++) saveDraft(localStorage, `Draft ${i}`, content)
    expect(() => saveDraft(localStorage, 'Extra', content)).toThrow('full')
    expect(readDrafts(localStorage)).toHaveLength(MAX_DRAFTS)
  })
  it('does not overwrite an existing draft when a name is reused', () => {
    saveDraft(localStorage, 'Work', content)
    expect(() => saveDraft(localStorage, ' work ', { ...content, text: 'Different' })).toThrow('duplicate')
    expect(readDrafts(localStorage)[0].text).toBe(content.text)
  })
  it('reports storage failures without pretending to save', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota') } } as unknown as Storage
    expect(() => saveDraft(storage, 'Draft', content)).toThrow('unavailable')
  })
})
