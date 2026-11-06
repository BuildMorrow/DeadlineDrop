// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ImageToText } from '../src/features/ocr/ImageToText'
import { createWorker } from 'tesseract.js'
import { MAX_IMAGE_BYTES, validateImage } from '../src/features/ocr/validateImage'

const mockWorker = { recognize: vi.fn(), terminate: vi.fn() }
vi.mock('tesseract.js', () => ({ createWorker: vi.fn(async () => mockWorker) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('image input', () => {
  it('rejects unsupported, empty and oversized files', () => {
    expect(validateImage({ type: 'application/pdf', size: 100 })).toContain('PNG')
    expect(validateImage({ type: 'image/png', size: 0 })).toContain('8 MB')
    expect(validateImage({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 })).toContain('8 MB')
    expect(validateImage({ type: 'image/webp', size: 100 })).toBe('')
  })
  it('requires an image and does not send text to the main input', () => {
    const useText = vi.fn()
    render(<ImageToText onUseText={useText} />)
    fireEvent.click(screen.getByText('Read text from an image'))
    fireEvent.click(screen.getByRole('button', { name: 'Read image' }))
    expect(screen.getByRole('status').textContent).toBe('Choose an image first.')
    expect(useText).not.toHaveBeenCalled()
  })
  it('keeps recognized text editable and only uses it after explicit action', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })))
    mockWorker.recognize.mockResolvedValue({ data: { text: 'Deadline 2027-05-20' } })
    mockWorker.terminate.mockResolvedValue(undefined)
    const useText = vi.fn()
    render(<ImageToText onUseText={useText} />)
    fireEvent.click(screen.getByText('Read text from an image'))
    fireEvent.change(screen.getByLabelText(/IMAGE \(/), { target: { files: [new File(['image'], 'sample.png', { type: 'image/png' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Read image' }))
    const result = await screen.findByLabelText('RECOGNIZED TEXT')
    expect(useText).not.toHaveBeenCalled()
    fireEvent.change(result, { target: { value: 'Corrected 2027-05-21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use this text' }))
    expect(useText).toHaveBeenCalledWith('Corrected 2027-05-21')
    await waitFor(() => expect(mockWorker.terminate).toHaveBeenCalled())
  })
  it('does not publish a result if recognition is cancelled while the worker starts', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })))
    mockWorker.terminate.mockResolvedValue(undefined)
    let finish!: (worker: typeof mockWorker) => void
    vi.mocked(createWorker).mockImplementationOnce(() => new Promise(resolve => { finish = resolve as typeof finish }))
    render(<ImageToText onUseText={vi.fn()} />)
    fireEvent.click(screen.getByText('Read text from an image'))
    fireEvent.change(screen.getByLabelText(/IMAGE \(/), { target: { files: [new File(['image'], 'sample.png', { type: 'image/png' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Read image' }))
    await waitFor(() => expect(createWorker).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    finish(mockWorker)
    await waitFor(() => expect(mockWorker.terminate).toHaveBeenCalled())
    expect(mockWorker.recognize).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('RECOGNIZED TEXT')).toBeNull()
  })
})
