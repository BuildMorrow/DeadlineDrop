export interface ChecklistItem { index: number; text: string; done: boolean }

// Line indices include blank lines so toggling one item never changes another.
export function checklistItems(value: string): ChecklistItem[] {
  return value.split(/\r\n|\r|\n/).flatMap((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return []
    const match = trimmed.match(/^(?:-\s*)?\[([ xX])\]\s*(.*)$/)
    return [{ index, text: match ? match[2] : trimmed, done: !!match && match[1].toLowerCase() === 'x' }]
  })
}

export function toggleChecklistItem(value: string, index: number, done: boolean): string {
  const lines = value.split(/\r\n|\r|\n/)
  const item = checklistItems(value).find(entry => entry.index === index)
  if (!item) return value
  lines[index] = `- [${done ? 'x' : ' '}] ${item.text}`
  return lines.join('\n')
}
