import { loadSettings } from "./config.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function init(): Promise<void> {
  const { schedule } = await loadSettings();
  const days = schedule.days.map((d) => DAY_NAMES[d]).join(", ");
  const el = document.getElementById("schedule");
  if (el)
    el.textContent = `${days}, ${schedule.startHour}:00–${schedule.endHour}:00`;
}

void init();
