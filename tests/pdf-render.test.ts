// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { renderPdfPage } from '../src/features/pdf/renderPage'

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }))
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })
const file = { arrayBuffer: async () => new Uint8Array([1]).buffer } as File
function setup(width: number, height: number, pages = 1) {
  const cleanup = vi.fn(), destroy = vi.fn().mockResolvedValue(undefined)
  const render = vi.fn(() => ({ promise: Promise.resolve() }))
  const getPage = vi.fn(async () => ({ getViewport: () => ({ width, height }), render, cleanup }))
  vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: pages, getPage }), destroy } as unknown as ReturnType<typeof getDocument>)
  return { getPage, render, cleanup, destroy }
}
describe('PDF page rendering limits', () => {
  it('renders a bounded page and releases the canvas and PDF resources', async () => {
    const task = setup(300, 400)
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    vi.spyOn(canvas, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    vi.spyOn(canvas, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })))
    const result = await renderPdfPage(file, 1, new AbortController().signal)
    expect(result.type).toBe('image/png')
    expect(task.render).toHaveBeenCalledOnce()
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
    expect(task.cleanup).toHaveBeenCalled()
    expect(task.destroy).toHaveBeenCalled()
  })
  it('rejects oversized pages before allocating a canvas', async () => {
    const task = setup(5000, 5000)
    const create = vi.spyOn(document, 'createElement')
    await expect(renderPdfPage(file, 1, new AbortController().signal)).rejects.toThrow('too large')
    expect(create).not.toHaveBeenCalled()
    expect(task.render).not.toHaveBeenCalled()
    expect(task.cleanup).toHaveBeenCalled()
    expect(task.destroy).toHaveBeenCalled()
  })
  it('rejects invalid page numbers before opening a page', async () => {
    const task = setup(100, 100)
    await expect(renderPdfPage(file, 2, new AbortController().signal)).rejects.toThrow('Invalid PDF page')
    expect(task.getPage).not.toHaveBeenCalled()
    expect(task.destroy).toHaveBeenCalled()
  })
})
