import { Temporal } from '@js-temporal/polyfill'

export type Choice = '' | 'earlier' | 'later'
export function zone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
export function localOptions(date: string, time: string, timeZone = zone()) {
  try {
    const plain = Temporal.PlainDateTime.from(`${date}T${time}`)
    const earlier = plain.toZonedDateTime(timeZone, { disambiguation: 'earlier' })
    const later = plain.toZonedDateTime(timeZone, { disambiguation: 'later' })
    const matches = [earlier, later].filter(z => z.toPlainDateTime().equals(plain))
    return matches.filter((z, i) => matches.findIndex(x => x.epochNanoseconds === z.epochNanoseconds) === i)
  } catch { return [] }
}
export function resolveLocal(date: string, time: string, choice: Choice, timeZone = zone()) {
  const options = localOptions(date, time, timeZone)
  if (options.length === 1) return options[0]
  if (options.length === 2 && choice) return options[choice === 'earlier' ? 0 : 1]
  return undefined
}
export function convertOffset(date: string, time: string, offset: string, timeZone = zone()) {
  return Temporal.Instant.from(`${date}T${time}:00${offset}`).toZonedDateTimeISO(timeZone)
}
export function fields(z: Temporal.ZonedDateTime) {
  const date = z.toPlainDate().toString()
  const time = z.toPlainTime().toString({ smallestUnit: 'minute' })
  const options = localOptions(date, time, z.timeZoneId)
  const choice: Choice = options.length === 2 ? (options[0].epochNanoseconds === z.epochNanoseconds ? 'earlier' : 'later') : ''
  return { date, time, choice }
}
