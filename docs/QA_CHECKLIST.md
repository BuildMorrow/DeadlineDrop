# Manual QA checklist

Record actual results and browser, operating system, timezone, and calendar application before release. Browser checks below used the in-app browser on Windows with timezone Asia/Saigon; other cases are **Not run** unless explicitly recorded. Do not use private information in examples.

| Case | Input | Expected behavior | Actual behavior | Status |
| --- | --- | --- | --- | --- |
| Vietnamese | Nộp bài 25 tháng 5 năm 2027 lúc 14 giờ 30 | Candidate contains date and time for review | Not recorded | Not run |
| English | Meeting May 20, 2027 at 2:15 pm | Candidate contains date and time for review | Not recorded | Not run |
| UTC | 2027-05-20 14:30 UTC in Asia/Bangkok | Shows May 20, 21:30, UTC+07:00 | Not recorded | Not run |
| Numeric offset | 2027-05-20T14:30:00-05:00 in Asia/Bangkok | Shows May 21, 02:30; ICS instant 19:30Z | Not recorded | Not run |
| Ambiguous offset | 2027-05-20 14:30-05:00 | Block until offset or range interpretation selected | Confirmation disabled; selecting -05:00 showed May 21 02:30 UTC+07:00 | Pass |
| Unknown zone | PST meeting 2027-05-20 14:30 | Block until local date and time corrected | Confirmation and correction buttons disabled initially; correction flow not fully exercised | Partial |
| DST overlap | 2027-11-07 01:30 in America/New_York | Require first or second occurrence, export 05:30Z or 06:30Z | Not recorded | Not run |
| DST gap | 2027-03-14 02:30 in America/New_York | Reject nonexistent local time | Not recorded | Not run |
| Time range | 2027-05-20 10:00-11:00 | Require range choice; export both instants | Not recorded | Not run |
| Overnight | 2027-05-20 23:00-01:00 | Require next-day end date and explicit range choice | Not recorded | Not run |
| Calendar import | Export a confirmed all-day and timed event | Calendar app imports correct dates, instants and titles | Not recorded | Not run |
| Keyboard | Navigate through inputs, ambiguity choices and export | All controls reachable and usable; focus visible | Not recorded | Not run |
| Mobile | Open at 320px width and review an event | No inaccessible controls or horizontal overflow | Not recorded | Not run |
| ICS content | Export confirmed time range with comma and Unicode title | Correct UTC DTSTART/DTEND, escaped summary and CRLF | Not recorded | Not run |
