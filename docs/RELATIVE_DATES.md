# Relative date extraction design

Status: proposed, not implemented. The current parser does not derive calendar dates from expressions such as “Friday” or “tuần sau”. Users should enter an explicit date; no current date or year is inferred.

## Inputs and uncertainty

A future parser should receive the original text, an explicit reference calendar date and an IANA timezone supplied or confirmed by the user. The UI must show both and explain that changing either requires re-extraction and invalidates prior confirmations. Keep this context local. A reference date is not a reference instant: the user's meaning of “today” or “next week” must be anchored to the calendar date they select in that timezone.

Return candidate source spans, interpretations, unresolved fields and reasons. Preserve original text through review and export only after all date/time ambiguities are resolved. Expressions with several plausible interpretations — including “next Monday”, weekday boundaries, incomplete times, multiple date ranges, and timezone abbreviations — must remain unresolved rather than selecting a hidden convention. A user may enter the intended explicit date and time.

## Verification before implementation

Build a representative English/Vietnamese corpus with fixed reference dates and expected interpretations, including year rollover, leap days, language-specific week conventions, invalid expressions, multiple events in a paragraph, timezone offsets, DST gaps and repeated local times. Test the same inputs in multiple browser timezones; outcomes must use the explicit reference context, not the host's current date. Include cases that must remain unresolved and verify they cannot be confirmed or exported.

This proposal adds no storage, backend, paid API or new dependency. Decide the exact interaction and supported grammar during implementation, informed by user testing.
