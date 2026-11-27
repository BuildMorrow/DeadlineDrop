// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/app/App'

vi.mock('../src/features/ocr/ImageToText', () => ({ ImageToText: ({ onUseText, onAppendText }: { onUseText: (text: string) => void; onAppendText: (text: string) => void }) => <><button onClick={() => onUseText('Image 2027-05-22 10:00')}>Use image fixture</button><button onClick={() => onAppendText('Image 2027-05-22 10:00')}>Add image fixture</button></> }))
vi.mock('../src/features/pdf/PdfToText', () => ({ PdfToText: ({ onUseText, onAppendText }: { onUseText: (text: string) => void; onAppendText: (text: string) => void }) => <><button onClick={() => onUseText('PDF 2027-05-23 11:00')}>Use PDF fixture</button><button onClick={() => onAppendText('PDF 2027-05-23 11:00')}>Add PDF fixture</button></> }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('protect existing event review', () => {
  it.each(['Try an example', 'Use image fixture', 'Use PDF fixture'])('preserves the message and confirmed event when %s is cancelled', name => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    const source = screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement
    fireEvent.change(source, { target: { value: 'Meeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(source.value).toBe('Meeting 2027-05-20 10:00')
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
  })
  it('clears the old review after explicit replacement approval', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    const source = screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement
    fireEvent.change(source, { target: { value: 'Meeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use PDF fixture' }))
    expect(source.value).toBe('PDF 2027-05-23 11:00')
    expect(screen.queryByRole('button', { name: 'Confirm event 1' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('does not prompt when starting from an empty message', () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Use image fixture' }))
    expect(confirm).not.toHaveBeenCalled()
    expect((screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement).value).toBe('Image 2027-05-22 10:00')
  })
  it.each(['Add image fixture', 'Add PDF fixture'])('preserves a confirmed review when %s is cancelled', name => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    const source = screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement
    fireEvent.change(source, { target: { value: 'Meeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm event 1' }))
    fireEvent.click(screen.getByRole('button', { name }))
    expect(source.value).toBe('Meeting 2027-05-20 10:00')
    expect(screen.getByRole('button', { name: 'Confirmed event 1' })).toBeTruthy()
  })
  it('appends a separate event and resets review after approval', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    const source = screen.getByLabelText('YOUR MESSAGE') as HTMLTextAreaElement
    fireEvent.change(source, { target: { value: 'Meeting 2027-05-20 10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add PDF fixture' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(source.value).toBe('Meeting 2027-05-20 10:00\n\nPDF 2027-05-23 11:00')
    expect((screen.getByRole('button', { name: 'Export .ics' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Find dates' }))
    expect(screen.getByRole('button', { name: 'Confirm event 2' })).toBeTruthy()
  })
})
