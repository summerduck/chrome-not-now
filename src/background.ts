import { loadSettings, Settings } from "./config.js";

const ALARM_NAME = "blocker-tick";
const RULE_ID_BASE = 1000;

function isBlockingTime(now: Date, settings: Settings): boolean {
  const day = now.getDay();
  const hour = now.getHours();
  return (
    settings.schedule.days.includes(day) &&
    hour >= settings.schedule.startHour &&
    hour < settings.schedule.endHour
  );
}

function buildRules(settings: Settings): chrome.declarativeNetRequest.Rule[] {
  const blockedUrl = chrome.runtime.getURL("blocked.html");
  return settings.blockedDomains.map((domain, i) => ({
    id: RULE_ID_BASE + i,
    priority: 1,
    action: {
      type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
      redirect: { url: blockedUrl },
    },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType],
    },
  }));
}

async function syncRules(): Promise<void> {
  const settings = await loadSettings();
  const shouldBlock = isBlockingTime(new Date(), settings);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();

  if (!shouldBlock) {
    if (existing.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing.map((r) => r.id),
      });
    }
    return;
  }

  const desired = buildRules(settings);
  const needsUpdate =
    existing.length !== desired.length ||
    existing.some(
      (r, i) => r.condition.urlFilter !== desired[i]?.condition.urlFilter
    );

  if (needsUpdate) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((r) => r.id),
      addRules: desired,
    });
  }
}

function init(): void {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  void syncRules();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void syncRules();
});
chrome.storage.onChanged.addListener(() => void syncRules());
