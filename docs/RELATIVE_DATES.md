# Relative date extraction design

Status: proposed, not implemented. The current parser does not derive calendar dates from expressions such as “Friday” or “tuần sau”. Users should enter an explicit date; no current date or year is inferred.

## Inputs and uncertainty

A future parser should receive the original text, an explicit reference calendar date and an IANA timezone supplied or confirmed by the user. The UI must show both and explain that changing either requires re-extraction and invalidates prior confirmations. Keep this context local. A reference date is not a reference instant: the user's meaning of “today” or “next week” must be anchored to the calendar date they select in that timezone.

Return candidate source spans, interpretations, unresolved fields and reasons. Preserve original text through review and export only after all date/time ambiguities are resolved. Expressions with several plausible interpretations — including “next Monday”, weekday boundaries, incomplete times, multiple date ranges, and timezone abbreviations — must remain unresolved rather than selecting a hidden convention. A user may enter the intended explicit date and time.

## Reference corpus for a future parser

These examples are a design contract, not a claim of current support. The current parser returns no candidate for each relative-only example; automated regression tests freeze the system clock and verify that it does not guess a date. Reference dates below are explicitly supplied calendar dates, never inferred from the machine clock.

| Source | Reference date and zone | Expected future behavior |
| --- | --- | --- |
| `Submit tomorrow at 5 pm` | 2027-12-31, Asia/Bangkok | Candidate for 2028-01-01 17:00, subject to review. |
| `Nộp bài ngày mai lúc 14:30` | 2028-02-28, Asia/Ho_Chi_Minh | Candidate for leap day 2028-02-29 14:30, subject to review. |
| `Meet next Monday at 09:00` | 2027-11-07, America/New_York | Unresolved until the meaning of “next Monday” is chosen. |
| `Họp thứ Hai tuần sau lúc 9 giờ` | 2027-11-07, America/New_York | Unresolved until the week convention is explicitly defined or chosen. |
| `Tomorrow at 01:30` | 2027-11-06, America/New_York | 2027-11-07 01:30 occurs twice; require an occurrence choice. |
| `Tomorrow at 02:30` | 2027-03-13, America/New_York | 2027-03-14 02:30 does not exist; require correction. |

An implementation must test these outcomes using the supplied reference context in multiple host timezones. The current fixed-clock tests do not exercise a reference-date API, since that API does not exist yet.

## Verification before implementation

Build a representative English/Vietnamese corpus with fixed reference dates and expected interpretations, including year rollover, leap days, language-specific week conventions, invalid expressions, multiple events in a paragraph, timezone offsets, DST gaps and repeated local times. Test the same inputs in multiple browser timezones; outcomes must use the explicit reference context, not the host's current date. Include cases that must remain unresolved and verify they cannot be confirmed or exported.

This proposal adds no storage, backend, paid API or new dependency. Decide the exact interaction and supported grammar during implementation, informed by user testing.
