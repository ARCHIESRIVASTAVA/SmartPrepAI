/**
 * Builds a calendar file (.ics) with a daily repeating reminder.
 * Works in Google Calendar, Apple Calendar and Outlook, so the
 * reminder reaches the user even when this site is closed.
 */
export function makeReminderFile(time: string, url: string): Blob {
  const [hh, mm] = time.split(":").map((part) => part.padStart(2, "0"));
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartPrep AI//Daily practice//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:smartprep-daily-${stamp}@smartprep.ai`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${date}T${hh}${mm}00`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:SmartPrep AI: 15 minutes of practice",
    `DESCRIPTION:Keep your streak going. Review your flashcards or try a quiz. ${url}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your SmartPrep practice",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
}
