// MV3 content scripts are not ES modules, so this file must not import or
// export anything. All decisions (tracked domains, schedule, budget) live in
// background.ts; this script only reports active time and reacts.
type TrackerAction = "none" | "track" | "warn" | "block";

const TICK_SECONDS = 5;
let toastShown = false;
let timer: number | undefined;

async function send(seconds: number): Promise<TrackerAction> {
  try {
    return await chrome.runtime.sendMessage({
      type: "tick",
      host: location.hostname,
      seconds,
    });
  } catch {
    // Extension was reloaded; this content script is orphaned.
    if (timer !== undefined) clearInterval(timer);
    return "none";
  }
}

function showToast(): void {
  if (toastShown) return;
  toastShown = true;

  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      .toast {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
        font: 14px/1.4 -apple-system, BlinkMacSystemFont, sans-serif;
        background: #1a1a1a; color: #eee; padding: 14px 16px;
        border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.35);
        display: flex; gap: 14px; align-items: center; max-width: 360px;
      }
      button {
        background: #eee; color: #1a1a1a; border: none; border-radius: 4px;
        padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer;
        white-space: nowrap;
      }
    </style>
    <div class="toast">
      <span>15 минут уже здесь. Через 15 минут сайт закроется до завтра.</span>
      <button>Окей, хочу ещё</button>
    </div>`;
  root.querySelector("button")!.addEventListener("click", () => {
    host.remove();
    void chrome.runtime.sendMessage({ type: "acknowledge" }).catch(() => {});
  });

  const mount = () => document.documentElement.appendChild(host);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
}

function react(action: TrackerAction): void {
  if (action === "block")
    location.replace(chrome.runtime.getURL("blocked.html"));
  else if (action === "warn") showToast();
}

async function tick(): Promise<void> {
  if (document.visibilityState !== "visible" || !document.hasFocus()) return;
  react(await send(TICK_SECONDS));
}

async function init(): Promise<void> {
  const action = await send(0);
  if (action === "none") return;
  react(action);
  timer = setInterval(() => void tick(), TICK_SECONDS * 1000);
}

void init();
