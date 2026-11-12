# Importing calendar events

Export confirmed events using **Export .ics**. The downloaded file contains the confirmed events at that moment; events still awaiting review are not included. Importing a file usually creates calendar entries rather than keeping them synchronized with DeadlineDrop. Importing the same file again may create duplicates.

- **Google Calendar (computer):** Open Settings, choose Import & Export, select the `.ics` file and a destination calendar, then import. [Google's instructions](https://support.google.com/calendar/answer/37118?hl=en).
- **Outlook.com / Outlook on the web:** Use Add calendar, choose the option to upload from a file, select the `.ics` file and a destination calendar. [Microsoft's instructions](https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web?kod=vp_mod13).
- **Apple Calendar for Mac:** Use File > Import and select the `.ics` file, then select a calendar. [Apple's instructions](https://support.apple.com/en-am/guide/calendar/icl1023/mac).

Check the imported titles, dates, times and durations. DeadlineDrop does not invent a duration for a timed event without an end time; some calendar apps add one. All-day events represent calendar dates, while timed events represent UTC instants displayed in the calendar's timezone. A separate test calendar is useful when trying imports.

The file is generated in your browser. Once you import it into a calendar provider, its contents are handled by that provider. Outlook and Apple Calendar imports have not yet been verified by this project. A sample file downloaded through the browser was imported into a separate Google Calendar test calendar and read back; see [QA checklist](QA_CHECKLIST.md).
