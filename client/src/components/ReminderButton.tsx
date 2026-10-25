import { useState } from "react";
import { BellRing } from "lucide-react";
import { makeReminderFile } from "../lib/reminder";

/** Lets the user download a daily repeating calendar reminder. */
export function ReminderButton() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("19:00");

  const download = () => {
    const blob = makeReminderFile(time, window.location.origin);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartprep-daily-reminder.ics";
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="reminder">
      <button
        type="button"
        className="reminder-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellRing size={14} aria-hidden="true" />
        Daily reminder
      </button>

      {open && (
        <div className="reminder-pop">
          <p>
            Get a repeating calendar reminder, so your streak survives even
            when this tab is closed.
          </p>

          <label>
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value || "19:00")}
            />
          </label>

          <button type="button" className="primary-button" onClick={download}>
            Download reminder
          </button>

          <small>Open the file to add it to Google, Apple or Outlook calendar.</small>
        </div>
      )}
    </div>
  );
}
