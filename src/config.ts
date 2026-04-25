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
    endHour: 19,
  },
};

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get("settings");
  return (stored.settings as Settings) ?? DEFAULT_SETTINGS;
}
