import {
  BLOCK_AFTER_SECONDS,
  WARN_AFTER_SECONDS,
  isBlockedHost,
  isBlockingTime,
  loadSettings,
  Settings,
} from "./config.js";

const ALARM_NAME = "blocker-tick";
const RULE_ID_BASE = 1000;
const MAX_TICK_SECONDS = 10;

interface Usage {
  date: string;
  seconds: number;
  acknowledged: boolean;
}

type TrackerMessage =
  | { type: "tick"; host: string; seconds: number }
  | { type: "acknowledge" };

// Keep in sync with content.ts, which cannot import this file.
type TrackerAction = "none" | "track" | "warn" | "block";

function todayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

async function loadUsage(): Promise<Usage> {
  const date = todayKey(new Date());
  const stored = (await chrome.storage.local.get("usage")).usage as
    | Usage
    | undefined;
  return stored?.date === date
    ? stored
    : { date, seconds: 0, acknowledged: false };
}

// Serializes read-modify-write on usage across concurrent tab messages.
let usageQueue: Promise<unknown> = Promise.resolve();
function updateUsage(fn: (u: Usage) => void): Promise<Usage> {
  const next = usageQueue.then(async () => {
    const usage = await loadUsage();
    fn(usage);
    await chrome.storage.local.set({ usage });
    return usage;
  });
  usageQueue = next.catch(() => undefined);
  return next;
}

async function handleTick(host: string, seconds: number): Promise<TrackerAction> {
  const settings = await loadSettings();
  if (!isBlockedHost(host, settings)) return "none";
  if (isBlockingTime(new Date(), settings)) return "block";

  const add = Math.min(Math.max(seconds, 0), MAX_TICK_SECONDS);
  const usage = await updateUsage((u) => (u.seconds += add));

  if (usage.seconds >= BLOCK_AFTER_SECONDS) {
    await syncRules();
    return "block";
  }
  if (usage.seconds >= WARN_AFTER_SECONDS && !usage.acknowledged) return "warn";
  return "track";
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
  const usage = await loadUsage();
  const shouldBlock =
    isBlockingTime(new Date(), settings) ||
    usage.seconds >= BLOCK_AFTER_SECONDS;
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
chrome.storage.onChanged.addListener((_, area) => {
  if (area === "sync") void syncRules();
});
chrome.runtime.onMessage.addListener(
  (msg: TrackerMessage, _sender, sendResponse) => {
    if (msg.type === "tick") {
      handleTick(msg.host, msg.seconds).then(sendResponse, () =>
        sendResponse("none")
      );
      return true;
    }
    if (msg.type === "acknowledge") {
      updateUsage((u) => (u.acknowledged = true)).then(
        () => sendResponse(),
        () => sendResponse()
      );
      return true;
    }
    return false;
  }
);
