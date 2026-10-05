export interface Settings {
  blockedDomains: string[];
  schedule: {
    days: number[];
    startHour: number;
    endHour: number;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  blockedDomains: ["instagram.com", "facebook.com", "twitter.com", "x.com"],
  schedule: {
    days: [1, 2, 3, 4, 5, 6],
    startHour: 8,
    endHour: 18,
  },
};

// Daily time budget on blocked sites outside the schedule.
export const WARN_AFTER_SECONDS = 15 * 60;
export const BLOCK_AFTER_SECONDS = 30 * 60;

export function isBlockingTime(now: Date, settings: Settings): boolean {
  const day = now.getDay();
  const hour = now.getHours();
  return (
    settings.schedule.days.includes(day) &&
    hour >= settings.schedule.startHour &&
    hour < settings.schedule.endHour
  );
}

export function isBlockedHost(hostname: string, settings: Settings): boolean {
  const host = hostname.replace(/^www\./, "");
  return settings.blockedDomains.some(
    (d) => host === d || host.endsWith("." + d)
  );
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get("settings");
  return (stored.settings as Settings) ?? DEFAULT_SETTINGS;
}
