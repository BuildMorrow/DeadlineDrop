# Relative date extraction design

Status: first v0.3 increment implemented. The user supplies a reference date in the displayed browser timezone; today/tomorrow and hôm nay/ngày mai are interpreted against that date. The system clock is not used as the reference. Weekdays and expressions such as “tuần sau” remain unsupported. Changing the reference clears the current review. Mixed or unclear expressions are blocked for correction.

## Inputs and uncertainty

A future parser should receive the original text, an explicit reference calendar date and an IANA timezone supplied or confirmed by the user. The UI must show both and explain that changing either requires re-extraction and invalidates prior confirmations. Keep this context local. A reference date is not a reference instant: the user's meaning of “today” or “next week” must be anchored to the calendar date they select in that timezone.

Return candidate source spans, interpretations, unresolved fields and reasons. Preserve original text through review and export only after all date/time ambiguities are resolved. Expressions with several plausible interpretations — including “next Monday”, weekday boundaries, incomplete times, multiple date ranges, and timezone abbreviations — must remain unresolved rather than selecting a hidden convention. A user may enter the intended explicit date and time.

## Reference corpus

Reference dates below are explicitly supplied calendar dates, never inferred from the machine clock. Today and tomorrow cases are implemented; weekday cases remain design examples and are not interpreted.

| Source | Reference date and zone | Expected future behavior |
| --- | --- | --- |
| `Submit tomorrow at 5 pm` | 2027-12-31, Asia/Bangkok | Candidate for 2028-01-01 17:00, subject to review. |
| `Nộp bài ngày mai lúc 14:30` | 2028-02-28, Asia/Ho_Chi_Minh | Candidate for leap day 2028-02-29 14:30, subject to review. |
| `Meet next Monday at 09:00` | 2027-11-07, America/New_York | Unresolved until the meaning of “next Monday” is chosen. |
| `Họp thứ Hai tuần sau lúc 9 giờ` | 2027-11-07, America/New_York | Unresolved until the week convention is explicitly defined or chosen. |
| `Tomorrow at 01:30` | 2027-11-06, America/New_York | 2027-11-07 01:30 occurs twice; require an occurrence choice. |
| `Tomorrow at 02:30` | 2027-03-13, America/New_York | 2027-03-14 02:30 does not exist; require correction. |

The reference-date API uses the selected calendar date and the browser local timezone. DST tests run in America/New_York; broader cross-timezone and browser testing remains useful.

## Further verification and planned scope

Build a representative English/Vietnamese corpus with fixed reference dates and expected interpretations, including year rollover, leap days, language-specific week conventions, invalid expressions, multiple events in a paragraph, timezone offsets, DST gaps and repeated local times. Test the same inputs in multiple browser timezones; outcomes must use the explicit reference context, not the host's current date. Include cases that must remain unresolved and verify they cannot be confirmed or exported.

This proposal adds no storage, backend, paid API or new dependency. Additional grammar and an editable timezone require further design and testing.
