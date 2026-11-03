import { useState } from 'react'
import { extractCandidates, type Candidate } from '../features/extraction/extract'
import { createCalendar, isValidEvent } from '../features/calendar/ics'

const inputClass = 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white focus:outline focus:outline-2 focus:outline-teal-300'
export default function App() {
  const [text, setText] = useState('')
  const [events, setEvents] = useState<Candidate[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'browser local time'
  const update = (id: string, change: Partial<Candidate>) => setEvents(current => current.map(event => event.id === id ? { ...event, ...change, confirmed: false } : event))
  const confirmed = events.filter(event => event.confirmed)
  function download() {
    try {
    const blob = new Blob([createCalendar(confirmed)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'deadlinedrop.ics'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setError('')
    } catch { setError('Could not export the calendar. Please check the events and try again.') }
  }
  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:py-16"><div className="mx-auto max-w-3xl">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-teal-300">BuildMorrow · Open source</p><h1 className="mt-4 text-4xl font-bold sm:text-5xl">DeadlineDrop</h1><p className="mt-2 text-xl text-slate-200">Turn anything into a deadline.</p><p className="mt-4 text-slate-300">Paste English or Vietnamese text, then review each result before export. Your content stays in this browser.</p><p className="mt-2 text-sm text-teal-200">Browser time zone: {timezone}</p></header>
    <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="input-heading"><h2 id="input-heading" className="text-xl font-semibold">1. Add text</h2><label htmlFor="source" className="mt-3 block text-sm text-slate-300">One event per line works best. Include a full year.</label><textarea id="source" rows={6} className={inputClass} value={text} onChange={e => { setText(e.target.value); setEvents([]); setSearched(false); setError('') }} placeholder={'Submit report 2027-05-20 14:30\nNộp bài 25 tháng 5 năm 2027'} /><button className="mt-4 rounded-lg bg-teal-300 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-200 disabled:opacity-50" disabled={!text.trim()} onClick={() => { setEvents(extractCandidates(text)); setSearched(true) }}>Find dates</button></section>
    {searched && <section className="mt-8" aria-labelledby="review-heading"><h2 id="review-heading" className="text-xl font-semibold">2. Review events</h2><p className="mt-2 text-sm text-slate-300">Check every detail, including whether an event lasts all day. Editing a confirmed event requires confirmation again.</p>{events.length === 0 && <p className="mt-4" role="status">No dates found. Try a full date such as 2027-05-20.</p>}
      <div className="mt-4 space-y-4">{events.map((event, index) => <article key={event.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><h3 className="font-semibold">Candidate {index + 1}</h3><p className="mt-2 break-words text-sm text-slate-400">Source: {event.source}</p>{event.warnings.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-200">{event.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
        <label className="mt-4 block text-sm">Title<input className={inputClass} value={event.title} onChange={e => update(event.id, { title: e.target.value })} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm">Date<input type="date" className={inputClass} value={event.date} onChange={e => update(event.id, { date: e.target.value })} /></label><label className="block text-sm">Time<input type="time" className={inputClass} value={event.time} disabled={event.allDay} onChange={e => update(event.id, { time: e.target.value })} /></label></div>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={event.allDay} onChange={e => update(event.id, { allDay: e.target.checked })} />All-day event</label>
        {!isValidEvent(event) && <p className="mt-3 text-sm text-amber-200">Enter a valid title, date, and (for timed events) local time.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className="rounded-lg bg-teal-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={!isValidEvent(event) || event.confirmed} onClick={() => setEvents(current => current.map(item => item.id === event.id ? { ...item, confirmed: true } : item))}>{event.confirmed ? 'Confirmed' : 'Confirm event'}</button><button className="rounded-lg border border-slate-500 px-4 py-2 hover:bg-slate-800" onClick={() => setEvents(current => current.filter(item => item.id !== event.id))}>Remove</button></div></article>)}</div>
      {error && <p role="alert" className="mt-4 text-amber-200">{error}</p>}
      <button className="mt-6 rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={!confirmed.length} onClick={download}>Export {confirmed.length} confirmed {confirmed.length === 1 ? 'event' : 'events'} as .ics</button></section>}
  </div></main>
}
