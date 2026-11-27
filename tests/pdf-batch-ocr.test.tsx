// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PdfBatchOcr } from '../src/features/pdf/PdfBatchOcr'
import { renderPdfPage } from '../src/features/pdf/renderPage'
import { startWorker } from '../src/features/ocr/startWorker'

vi.mock('../src/features/pdf/renderPage', () => ({ renderPdfPage: vi.fn() }))
vi.mock('../src/features/ocr/startWorker', () => ({ startWorker: vi.fn() }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks() })
const file = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })
const image = () => new File(['image'], 'page.png', { type: 'image/png' })
function openBatch(onAppend = vi.fn()) {
  render(<PdfBatchOcr file={file} pageCount={10} language="en" onAppend={onAppend} />)
  fireEvent.click(screen.getByText('Read several scanned pages (experimental)'))
  return onAppend
}

describe('PDF batch OCR', () => {
  it('reads selected pages in order, uses one worker, and requires per-page review', async () => {
    vi.mocked(renderPdfPage).mockResolvedValue(image())
    const recognize = vi.fn().mockResolvedValueOnce({ data: { text: 'First 2027-05-20' } }).mockResolvedValueOnce({ data: { text: 'Second 2027-05-21' } })
    const terminate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(startWorker).mockResolvedValue({ recognize, terminate })
    const append = openBatch()
    fireEvent.change(screen.getByLabelText('LAST PAGE'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read selected pages' }))
    await screen.findByText('Batch finished. Check each page for errors and review it against the PDF.')
    expect(vi.mocked(renderPdfPage).mock.calls.map(call => call[1])).toEqual([1, 2])
    expect(startWorker).toHaveBeenCalledOnce()
    expect(append).not.toHaveBeenCalled()
    const first = screen.getByText('Page 1').closest('li')!
    fireEvent.change(within(first).getByLabelText('RECOGNIZED TEXT'), { target: { value: 'Corrected 2027-05-20' } })
    fireEvent.click(within(first).getByRole('button', { name: 'Add page text' }))
    expect(append).toHaveBeenCalledWith('Corrected 2027-05-20')
    expect((within(first).getByRole('button', { name: 'Added' }) as HTMLButtonElement).disabled).toBe(true)
    expect(terminate).toHaveBeenCalled()
  })
  it('rejects invalid and oversized ranges before starting OCR', () => {
    openBatch()
    fireEvent.change(screen.getByLabelText('LAST PAGE'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read selected pages' }))
    expect(screen.getByRole('status').textContent).toContain('at most five')
    expect(startWorker).not.toHaveBeenCalled()
  })
  it('identifies failed pages and protects unadded results from accidental clearing', async () => {
    vi.mocked(renderPdfPage).mockResolvedValueOnce(image()).mockRejectedValueOnce(new Error('oversized'))
    vi.mocked(startWorker).mockResolvedValue({ recognize: vi.fn().mockResolvedValue({ data: { text: 'Deadline 2027-05-20' } }), terminate: vi.fn().mockResolvedValue(undefined) })
    openBatch()
    fireEvent.change(screen.getByLabelText('LAST PAGE'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read selected pages' }))
    await screen.findByText('Batch finished. Check each page for errors and review it against the PDF.')
    expect(within(screen.getByText('Page 2').closest('li')!).getByText('Could not read this page.')).toBeTruthy()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Clear batch results' }))
    expect(screen.getByDisplayValue('Deadline 2027-05-20')).toBeTruthy()
  })
  it('retains completed pages and identifies unprocessed pages after cancellation', async () => {
    let finish!: (image: File) => void
    vi.mocked(renderPdfPage).mockResolvedValueOnce(image()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const terminate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(startWorker).mockResolvedValue({ recognize: vi.fn().mockResolvedValue({ data: { text: 'First 2027-05-20' } }), terminate })
    openBatch()
    fireEvent.change(screen.getByLabelText('LAST PAGE'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read selected pages' }))
    await waitFor(() => expect(renderPdfPage).toHaveBeenCalledTimes(2))
    const cancel = screen.getByRole('button', { name: 'Cancel' }); cancel.focus(); fireEvent.click(cancel)
    finish(image())
    expect(screen.getByDisplayValue('First 2027-05-20')).toBeTruthy()
    expect(within(screen.getByText('Page 2').closest('li')!).getByText('Not processed yet.')).toBeTruthy()
    expect(terminate).toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Read selected pages' }))
  })
})
