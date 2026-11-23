export const MAX_PDF_BYTES = 8 * 1024 * 1024
export const MAX_PDF_PAGES = 20
export const MAX_PDF_CHARACTERS = 100_000

export function validatePdf(file: Pick<File, 'type' | 'size' | 'name'>): string {
  if (file.type !== 'application/pdf' && !(file.type === '' && /\.pdf$/i.test(file.name))) return 'Choose a PDF file.'
  if (!file.size || file.size > MAX_PDF_BYTES) return 'Choose a PDF between 1 byte and 8 MB.'
  return ''
}

