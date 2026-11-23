import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { MAX_PDF_BYTES, validatePdf } from '../src/features/pdf/limits'
import { readPdf } from '../src/features/pdf/readPdf'

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }))
afterEach(() => vi.clearAllMocks())
const file = { name: 'sample.pdf', type: 'application/pdf', size: 10, arrayBuffer: async () => new Uint8Array([1, 2]).buffer } as File
function setup(pages: Array<Array<{ str: string; hasEOL: boolean }>>, count = pages.length) {
  const cleanup = vi.fn()
  const destroy = vi.fn().mockResolvedValue(undefined)
  const getPage = vi.fn(async (index: number) => ({ getTextContent: async () => ({ items: pages[index - 1] }), cleanup }))
  vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: count, getPage }), destroy } as unknown as ReturnType<typeof getDocument>)
  return { getPage, cleanup, destroy }
}

describe('local PDF extraction', () => {
  it('validates type and size before reading', () => {
    expect(validatePdf({ name: 'a.pdf', type: '', size: 1 })).toBe('')
    expect(validatePdf({ name: 'a.png', type: 'image/png', size: 1 })).toContain('PDF')
    expect(validatePdf({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toContain('8 MB')
    expect(validatePdf({ name: 'a.pdf', type: 'application/pdf', size: MAX_PDF_BYTES + 1 })).toContain('8 MB')
  })
  it('reads multiple pages and reports pages without text', async () => {
    const task = setup([[{ str: 'Meeting 2027-05-20 10:00', hasEOL: true }], [], [{ str: 'Nộp bài 25 tháng 5 năm 2027', hasEOL: true }]])
    const result = await readPdf(file, new AbortController().signal)
    expect(result.text).toContain('Meeting 2027-05-20 10:00')
    expect(result.text).toContain('Nộp bài 25 tháng 5 năm 2027')
    expect(result.pages).toEqual(['Meeting 2027-05-20 10:00', '', 'Nộp bài 25 tháng 5 năm 2027'])
    expect(task.cleanup).toHaveBeenCalledTimes(3)
    expect(task.destroy).toHaveBeenCalled()
    expect(vi.mocked(getDocument).mock.calls[0][0]).toMatchObject({ isEvalSupported: false, disableFontFace: true, useWorkerFetch: false, enableXfa: false })
  })
  it('rejects too many pages before extracting text', async () => {
    const task = setup([], 21)
    await expect(readPdf(file, new AbortController().signal)).rejects.toThrow('20-page limit')
    expect(task.getPage).not.toHaveBeenCalled()
    expect(task.destroy).toHaveBeenCalled()
  })
  it('rejects overly large extracted text', async () => {
    const task = setup([[{ str: 'a'.repeat(100_001), hasEOL: false }]])
    await expect(readPdf(file, new AbortController().signal)).rejects.toThrow('100,000-character limit')
    expect(task.cleanup).toHaveBeenCalledOnce()
    expect(task.destroy).toHaveBeenCalled()
  })
  it('cancels a pending document load and destroys the worker', async () => {
    let reject!: (reason: Error) => void
    const destroy = vi.fn(() => { reject(new Error('cancelled')); return Promise.resolve() })
    vi.mocked(getDocument).mockReturnValue({ promise: new Promise((_resolve, fail) => { reject = fail }), destroy } as unknown as ReturnType<typeof getDocument>)
    const controller = new AbortController()
    const reading = readPdf(file, controller.signal)
    await Promise.resolve()
    controller.abort()
    await expect(reading).rejects.toThrow('cancelled')
    expect(destroy).toHaveBeenCalled()
  })
})
