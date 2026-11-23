/** Preserve PDF.js text and line breaks without inserting characters into dates. */
export function joinPdfText(items: ReadonlyArray<{ str: string; hasEOL: boolean }>): string {
  return items.map(item => item.str + (item.hasEOL ? '\n' : '')).join('')
}
