// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PdfPageOcr } from '../src/features/pdf/PdfPageOcr'
import { renderPdfPage } from '../src/features/pdf/renderPage'
import { startWorker } from '../src/features/ocr/startWorker'

vi.mock('../src/features/pdf/renderPage', () => ({ renderPdfPage: vi.fn() }))
vi.mock('../src/features/ocr/startWorker', () => ({ startWorker: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const file = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })

describe('experimental scanned PDF page OCR', () => {
  it('requires explicit review and append of recognized text', async () => {
    vi.mocked(renderPdfPage).mockResolvedValueOnce(new File(['image'], 'page.png', { type: 'image/png' }))
    const terminate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(startWorker).mockResolvedValueOnce({ recognize: vi.fn().mockResolvedValue({ data: { text: 'Nộp bài 2027-05-25' } }), terminate })
    const append = vi.fn()
    render(<PdfPageOcr file={file} pageCount={2} language="en" onAppend={append} />)
    fireEvent.click(screen.getByText('Read a scanned PDF page (experimental)'))
    fireEvent.change(screen.getByLabelText('PDF PAGE'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read page' }))
    const text = await screen.findByLabelText('PAGE OCR TEXT')
    expect(renderPdfPage).toHaveBeenCalledWith(file, 2, expect.any(AbortSignal))
    expect(append).not.toHaveBeenCalled()
    fireEvent.change(text, { target: { value: 'Corrected 2027-05-26' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add OCR text' }))
    expect(append).toHaveBeenCalledWith('Corrected 2027-05-26')
    await waitFor(() => expect(terminate).toHaveBeenCalled())
  })
  it('discards recognition that completes after cancellation', async () => {
    let complete!: (value: File) => void
    vi.mocked(renderPdfPage).mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const append = vi.fn()
    render(<PdfPageOcr file={file} pageCount={1} language="en" onAppend={append} />)
    fireEvent.click(screen.getByText('Read a scanned PDF page (experimental)'))
    fireEvent.click(screen.getByRole('button', { name: 'Read page' }))
    await waitFor(() => expect(renderPdfPage).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    complete(new File(['image'], 'page.png'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF OCR cancelled.'))
    expect(startWorker).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })
  it('retains page provenance and edited text until the result is added or discarded', async () => {
    vi.mocked(renderPdfPage).mockResolvedValueOnce(new File(['image'], 'page.png'))
    vi.mocked(startWorker).mockResolvedValueOnce({ recognize: vi.fn().mockResolvedValue({ data: { text: 'Original result' } }), terminate: vi.fn().mockResolvedValue(undefined) })
    render(<PdfPageOcr file={file} pageCount={2} language="en" onAppend={vi.fn()} />)
    fireEvent.click(screen.getByText('Read a scanned PDF page (experimental)'))
    fireEvent.change(screen.getByLabelText('IMAGE LANGUAGE'), { target: { value: 'vie' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read page' }))
    const text = await screen.findByLabelText('PAGE OCR TEXT') as HTMLTextAreaElement
    fireEvent.change(text, { target: { value: 'Corrected text' } })
    fireEvent.change(screen.getByLabelText('PDF PAGE'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('IMAGE LANGUAGE'), { target: { value: 'eng' } })
    expect(screen.getByText('OCR result from page 1 · Vietnamese')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Read page' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Read page' }))
    expect(text.value).toBe('Corrected text')
    expect(renderPdfPage).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Discard OCR result' }))
    expect(screen.queryByLabelText('PAGE OCR TEXT')).toBeNull()
    expect(screen.getByRole('button', { name: 'Read page' }).getAttribute('aria-disabled')).toBe('false')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Read page' }))
  })
})
