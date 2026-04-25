import { BLOCKED_DOMAINS, SCHEDULE } from "./config.js";

const ALARM_NAME = "blocker-tick";
const RULE_ID_BASE = 1000;

function isBlockingTime(now: Date): boolean {
  const day = now.getDay();
  const hour = now.getHours();
  const days: readonly number[] = SCHEDULE.days;
  return (
    days.includes(day) &&
    hour >= SCHEDULE.startHour &&
    hour < SCHEDULE.endHour
  );
}

function buildRules(): chrome.declarativeNetRequest.Rule[] {
  const blockedUrl = chrome.runtime.getURL("blocked.html");
  return BLOCKED_DOMAINS.map((domain, i) => ({
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
  const shouldBlock = isBlockingTime(new Date());
  const existing = await chrome.declarativeNetRequest.getDynamicRules();

  if (shouldBlock && existing.length === 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: buildRules(),
    });
  } else if (!shouldBlock && existing.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((r) => r.id),
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
