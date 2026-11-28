import { Temporal } from '@js-temporal/polyfill'

/** Monday-first grid; null cells are padding, never invented event dates. */
export function monthGrid(month: string): Array<string | null> {
  const first = Temporal.PlainDate.from(`${month}-01`)
  const leading = first.dayOfWeek - 1
  const cells: Array<string | null> = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= first.daysInMonth; day++) cells.push(first.with({ day }).toString())
  while (cells.length % 7) cells.push(null)
  return cells
}

export function stepMonth(month: string, delta: -1 | 1): string | null {
  try {
    const next = Temporal.PlainDate.from(`${month}-01`).add({ months: delta })
    return next.year >= 1000 && next.year <= 9999 ? next.toString().slice(0, 7) : null
  } catch { return null }
}

export function stepDay(date: string, days: number): string | null {
  try {
    const next = Temporal.PlainDate.from(date).add({ days })
    return next.year >= 1000 && next.year <= 9999 ? next.toString() : null
  } catch { return null }
}
