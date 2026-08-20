// Duplicates config.ts defaults: MV3 content scripts are not ES modules,
// so this file cannot import from config.js.
const DEFAULT_BLOCKED = ["instagram.com", "facebook.com", "twitter.com", "x.com"];
const DEFAULT_SCHEDULE = { days: [1, 2, 3, 4, 5, 6], startHour: 8, endHour: 19 };

chrome.storage.sync.get("settings", (stored) => {
  const settings = (stored["settings"] as {
    blockedDomains: string[];
    schedule: { days: number[]; startHour: number; endHour: number };
  }) ?? { blockedDomains: DEFAULT_BLOCKED, schedule: DEFAULT_SCHEDULE };

  const hostname = location.hostname.replace(/^www\./, "");
  const isBlocked = settings.blockedDomains.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  );
  if (!isBlocked) return;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const inSchedule =
    settings.schedule.days.includes(day) &&
    hour >= settings.schedule.startHour &&
    hour < settings.schedule.endHour;
  if (!inSchedule) return;

  location.replace(chrome.runtime.getURL("blocked.html"));
});
