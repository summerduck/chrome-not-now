import { loadSettings, Settings } from "./config.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let domains: string[] = [];

function renderDomains(): void {
  const list = document.getElementById("domain-list")!;
  list.innerHTML = "";
  domains.forEach((domain, i) => {
    const row = document.createElement("div");
    row.className = "domain-row";
    const span = document.createElement("span");
    span.textContent = domain;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "Remove";
    btn.dataset.index = String(i);
    row.appendChild(span);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

async function save(): Promise<void> {
  const settings: Settings = {
    blockedDomains: [...domains],
    schedule: {
      days: DAY_NAMES.map((_, i) => i).filter(
        (i) =>
          (document.getElementById(`day-${i}`) as HTMLInputElement).checked
      ),
      startHour: parseInt(
        (document.getElementById("start-hour") as HTMLInputElement).value,
        10
      ),
      endHour: parseInt(
        (document.getElementById("end-hour") as HTMLInputElement).value,
        10
      ),
    },
  };

  await chrome.storage.sync.set({ settings });

  const btn = document.getElementById("save-btn")!;
  btn.textContent = "Saved!";
  setTimeout(() => (btn.textContent = "Save"), 1500);
}

function addDomain(): void {
  const input = document.getElementById("new-domain") as HTMLInputElement;
  const val = input.value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (val && !domains.includes(val)) {
    domains.push(val);
    renderDomains();
  }
  input.value = "";
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  domains = [...settings.blockedDomains];
  renderDomains();

  DAY_NAMES.forEach((_, i) => {
    (document.getElementById(`day-${i}`) as HTMLInputElement).checked =
      settings.schedule.days.includes(i);
  });

  (document.getElementById("start-hour") as HTMLInputElement).value = String(
    settings.schedule.startHour
  );
  (document.getElementById("end-hour") as HTMLInputElement).value = String(
    settings.schedule.endHour
  );

  document.getElementById("domain-list")!.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      ".remove-btn"
    ) as HTMLButtonElement | null;
    if (btn) {
      domains.splice(parseInt(btn.dataset.index!, 10), 1);
      renderDomains();
    }
  });

  document.getElementById("add-btn")!.addEventListener("click", addDomain);

  document
    .getElementById("new-domain")!
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") addDomain();
    });

  document
    .getElementById("save-btn")!
    .addEventListener("click", () => void save());
}

void init();
