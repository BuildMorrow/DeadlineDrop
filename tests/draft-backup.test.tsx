// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DraftBackup } from '../src/features/drafts/DraftBackup'
import { clearDrafts, createBackup, DRAFT_KEY, readDrafts, saveDraft } from '../src/features/drafts/storage'

const content = { text: 'Deadline 2027-05-20 10:00', referenceDate: '', referenceZone: 'UTC' }
function backupFile(data: string) {
  const file = new File([data], 'sample.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => data })
  return file
}
function open() {
  const imported = vi.fn()
  render(<DraftBackup language="en" hasDrafts={true} onImported={imported} />)
  fireEvent.click(screen.getByText('Back up or import drafts'))
  return imported
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('local draft backup', () => {
  it('downloads a JSON backup only after explicit action', () => {
    saveDraft(localStorage, 'Example', content)
    const create = vi.fn(() => 'blob:example')
    const NativeURL = URL
    class TestURL extends NativeURL { static createObjectURL = create; static revokeObjectURL = vi.fn() }
    vi.stubGlobal('URL', TestURL)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    open()
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    expect(create).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toContain('download started')
  })
  it('previews names before explicit import and imports without event review', async () => {
    saveDraft(localStorage, 'Example', content)
    const backup = createBackup(localStorage)
    clearDrafts(localStorage)
    const imported = open()
    fireEvent.change(screen.getByLabelText('SELECT BACKUP JSON'), { target: { files: [backupFile(backup)] } })
    await screen.findByText('Example')
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(screen.queryByText(content.text)).toBeNull()
    expect(imported).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Import these drafts' }))
    expect(readDrafts(localStorage)[0].text).toBe(content.text)
    expect(imported).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toContain('Drafts imported')
  })
  it('does not overwrite existing drafts when an imported name conflicts', async () => {
    saveDraft(localStorage, 'Example', content)
    const backup = createBackup(localStorage), before = localStorage.getItem(DRAFT_KEY)
    const imported = open()
    fireEvent.change(screen.getByLabelText('SELECT BACKUP JSON'), { target: { files: [backupFile(backup)] } })
    await screen.findByText('Example')
    fireEvent.click(screen.getByRole('button', { name: 'Import these drafts' }))
    expect(screen.getByRole('status').textContent).toContain('already exists')
    expect(localStorage.getItem(DRAFT_KEY)).toBe(before)
    expect(imported).not.toHaveBeenCalled()
  })
  it('rejects an invalid file and permits cancelling a valid preview', async () => {
    saveDraft(localStorage, 'Example', content)
    const backup = createBackup(localStorage)
    clearDrafts(localStorage)
    open()
    fireEvent.change(screen.getByLabelText('SELECT BACKUP JSON'), { target: { files: [backupFile('not JSON')] } })
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('invalid'))
    fireEvent.change(screen.getByLabelText('SELECT BACKUP JSON'), { target: { files: [backupFile(backup)] } })
    await screen.findByText('Example')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }))
    expect(screen.queryByText('Example')).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })
})
