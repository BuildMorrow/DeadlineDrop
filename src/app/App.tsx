import { useRef, useState } from 'react'
import { extractCandidates, type Candidate } from '../features/extraction/extract'
import { createCalendar, isValidEvent } from '../features/calendar/ics'
import { localOptions, resolveLocal, type Choice } from '../features/calendar/time'
import { resolveManual, resolveOffset, resolveRange } from '../features/calendar/resolution'

const example = 'Submit final report — 2027-05-20 14:30\nNộp bài tập — 25 tháng 5 năm 2027'
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = { calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01', arrow: 'M5 12h14m-6-6 6 6-6 6', spark: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5zM12 14v2', check: 'M5 12l4 4L19 6', download: 'M12 3v12m-4-4 4 4 4-4M4 18v2h16v-2', trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3', globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20', file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2', alert: 'M12 3 2 20h20L12 3Zm0 6v4m0 3h.01' }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
const inputClass = 'field-input'
export default function App() {
  const [text, setText] = useState('')
  const [events, setEvents] = useState<Candidate[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const confirmButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'browser local time'
  const update = (id: string, change: Partial<Candidate>) => setEvents(current => current.map(event => event.id === id ? { ...event, ...change, confirmed: false } : event))
  const resolve = (event: Candidate, resolver: (candidate: Candidate) => Candidate) => {
    const result = resolver(event)
    update(event.id, result)
    if (!result.needsResolution && isValidEvent(result)) {
      requestAnimationFrame(() => confirmButtons.current[event.id]?.focus())
    }
  }
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
  const findDates = () => { setEvents(extractCandidates(text)); setSearched(true) }
  const changeText = (value: string) => { setText(value); setEvents([]); setSearched(false); setError('') }
  return <div className="app-shell">
    <a className="skip-link" href="#source">Skip to text input</a>
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="#top" aria-label="DeadlineDrop home"><span className="brand-mark"><Icon name="calendar" size={19} /></span><span>Deadline<span className="brand-drop">Drop</span></span></a><div className="topbar-right"><span className="top-privacy"><Icon name="lock" size={14} /> Private by design</span><a className="github-link" href="https://github.com/BuildMorrow/DeadlineDrop" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></div></div></header>
    <main id="top" className="main-content">
      <div className="hero"><div className="eyebrow">A SIMPLE WAY TO STAY ON TRACK</div><h1>Turn messages into<br /><span>calendar events.</span></h1><p>Paste a message, check the details, and add the dates that matter to your calendar.</p><div className="hero-meta"><span><Icon name="lock" size={15} /> Your text stays on your device</span><span><Icon name="globe" size={15} /> English &amp; Vietnamese</span></div></div>
      <div className="workspace-heading"><div><span className="section-kicker">YOUR WORKSPACE</span><h2>Make a little room for what matters.</h2><p>Start with a message. We’ll help you get the dates ready.</p></div><div className="timezone"><Icon name="globe" size={15} /><span>{timezone}</span></div></div>
      <div className="workspace-grid"><section className="panel input-panel" aria-labelledby="input-heading"><div className="panel-heading"><div className="step-number">01</div><div><h3 id="input-heading">Paste your text</h3><p>Start with the details you have.</p></div><span className="panel-icon"><Icon name="file" size={19} /></span></div><div className="input-body"><label htmlFor="source" className="field-label">YOUR MESSAGE</label><textarea id="source" rows={9} className="source-input" value={text} onChange={e => changeText(e.target.value)} placeholder={'Paste a message, announcement, or notes here...\n\nExample: Submit report on May 20, 2027 at 2:30 pm'} /><div className="input-caption"><span>One event per line works best.</span><button className="text-button" type="button" onClick={() => changeText(example)}>Try an example <span aria-hidden="true">↗</span></button></div><button className="button button-primary find-button" disabled={!text.trim()} onClick={findDates}>Find dates <Icon name="arrow" size={17} /></button><div className="privacy-note"><Icon name="lock" size={15} /><span>Processed locally. Your text never leaves your browser.</span></div></div></section>
      <section className="panel review-panel" aria-labelledby="review-heading"><div className="panel-heading"><div className="step-number step-secondary">02</div><div><h3 id="review-heading">Review your events</h3><p>Make sure everything looks right.</p></div>{events.length > 0 && <span className="count-badge" aria-live="polite">{events.length} found</span>}</div>
      {!searched ? <div className="empty-state"><div className="empty-simple"><Icon name="calendar" size={25} /></div><h4>Your events will appear here</h4><p>Paste a message and choose “Find dates” to get started.</p></div> : events.length === 0 ? <div className="empty-state" role="status"><div className="empty-simple"><Icon name="calendar" size={28} /></div><h4>No dates found yet.</h4><p>Try a full date with a year, like May 20, 2027.</p></div> : <div className="review-body"><p className="review-intro">Check the details against your original text. Editing a confirmed event requires confirmation again.</p><div className="event-list">{events.map((event, index) => <article key={event.id} className="event-card"><div className="event-head"><div className="event-title-line"><span className="event-icon"><Icon name="calendar" size={16} /></span><div><h4>Event {index + 1}</h4><span className={event.confirmed ? 'status confirmed' : 'status'}>{event.confirmed ? 'Confirmed' : 'Needs review'}</span></div></div><button className="icon-button" aria-label={`Remove event ${index + 1}`} onClick={() => setEvents(current => current.filter(item => item.id !== event.id))}><Icon name="trash" size={17} /></button></div><p className="source-text"><strong>Original text</strong><br />{event.source}</p>{event.warnings.length > 0 && <div className="warning-box"><Icon name="alert" size={17} /><ul>{event.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
        <label className="field-label event-field">EVENT TITLE<input className={inputClass} value={event.title} onChange={e => update(event.id, { title: e.target.value })} /></label>
        <div className="field-grid"><label className="field-label">DATE<input type="date" className={inputClass} value={event.date} onChange={e => update(event.id, { date: e.target.value, choice: '', editedDate: true })} /></label><label className="field-label">TIME<input type="time" className={inputClass} value={event.time} disabled={event.allDay} onChange={e => update(event.id, { time: e.target.value, choice: '', editedTime: true })} /></label></div>
        {event.sourceZone && <p className="event-detail">Source time zone: {event.sourceZone}. Times below are in {timezone}.</p>}
        {event.rangeRequired && <div className="field-grid"><label className="field-label">END DATE<input type="date" className={inputClass} value={event.endDate} onChange={e => update(event.id, { endDate: e.target.value, endChoice: '', editedEndDate: true })} /></label><label className="field-label">END TIME<input type="time" className={inputClass} value={event.endTime} onChange={e => update(event.id, { endTime: e.target.value, endChoice: '', editedEndTime: true })} /></label></div>}
        {event.needsResolution && <div className="resolution" role="group" aria-label="Resolve time ambiguity"><p><strong>Resolve the source time before confirmation.</strong></p>{event.resolutionKind === 'zone' ? <><p>Edit the local date and time to the correct values, including the end date and time for a range, then apply your correction.</p><button className="button button-outline" disabled={!event.editedDate || !event.editedTime || (event.rangeRequired && (!event.editedEndDate || !event.editedEndTime))} onClick={() => resolve(event, resolveManual)}>Apply corrected local time</button></> : <div className="resolution-actions"><button className="button button-outline" onClick={() => resolve(event, resolveRange)}>Use as a time range</button>{event.resolutionKind === 'offset-or-range' && <button className="button button-outline" onClick={() => resolve(event, resolveOffset)}>Use {event.ambiguousOffset} as UTC offset</button>}</div>}</div>}
        {!event.allDay && ([['Start', event.date, event.time, event.choice], ...(event.rangeRequired ? [['End', event.endDate, event.endTime, event.endChoice]] : [])] as const).map(([label, date, time, choice]) => {
          const options = localOptions(date, time)
          return <div key={label} className="event-detail" aria-live="polite">{date && time && options.length === 0 && <p className="validation">{label}: this local time does not exist. Choose another time.</p>}{options.length === 2 && <label className="field-label">{label}: this time occurs twice. Choose an offset.<select className={inputClass} value={choice} onChange={e => update(event.id, label === 'Start' ? { choice: e.target.value as Choice } : { endChoice: e.target.value as Choice })}><option value="">Choose an occurrence</option><option value="earlier">First ({options[0].offset})</option><option value="later">Second ({options[1].offset})</option></select></label>}{resolveLocal(date, time, choice as Choice) && <p><Icon name="clock" size={14} /> {label}: {date} {time} {timezone} (UTC{resolveLocal(date, time, choice as Choice)!.offset})</p>}</div>
        })}
        <label className="all-day"><input type="checkbox" checked={event.allDay} onChange={e => update(event.id, { allDay: e.target.checked })} /> All-day event</label>
        {!isValidEvent(event) && <p className="validation" aria-live="polite">Enter valid dates and times, resolve warnings, and ensure the end is after the start.</p>}
        <button ref={node => { confirmButtons.current[event.id] = node }} className="button button-confirm" aria-label={`${event.confirmed ? 'Confirmed' : 'Confirm'} event ${index + 1}`} disabled={!isValidEvent(event) || event.confirmed} onClick={() => setEvents(current => current.map(item => item.id === event.id ? { ...item, confirmed: true } : item))}><Icon name="check" size={16} />{event.confirmed ? 'Confirmed' : 'Confirm event'}</button></article>)}</div></div>}
      <div className="review-footer"><div><strong>Ready for your calendar?</strong><span>{confirmed.length ? `${confirmed.length} confirmed ${confirmed.length === 1 ? 'event' : 'events'}` : 'Confirm an event to export.'}</span></div><button className="button button-export" disabled={!confirmed.length} onClick={download}><Icon name="download" size={16} /> Export .ics</button></div>{error && <p role="alert" className="error-message">{error}</p>}</section></div>
      <div className="bottom-note"><span className="bottom-note-icon"><Icon name="alert" size={16} /></span><p><strong>Before you export.</strong> Check each date and time against your original message. Calendar apps may add a duration when no end time is provided; check events after importing.</p></div>
    </main><footer className="site-footer"><div><span>Made for the moments that matter.</span><span>Built by <a href="https://github.com/BuildMorrow">BuildMorrow</a> <span aria-hidden="true">·</span> Open source &amp; free</span></div></footer>
  </div>
}
