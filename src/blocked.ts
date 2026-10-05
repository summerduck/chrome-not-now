import { isBlockingTime, loadSettings } from "./config.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function init(): Promise<void> {
  const settings = await loadSettings();
  const { schedule } = settings;
  const days = schedule.days.map((d) => DAY_NAMES[d]).join(", ");
  const el = document.getElementById("schedule");
  if (el)
    el.textContent = isBlockingTime(new Date(), settings)
      ? `Focus hours: ${days}, ${schedule.startHour}:00–${schedule.endHour}:00.`
      : "30-minute daily limit used up. Back tomorrow.";
}

void init();
