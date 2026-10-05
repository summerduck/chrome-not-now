# Focus Blocker

A minimal Chrome extension that blocks distracting sites during your focus hours. No accounts, no tracking, no nags — just "Not now."

## Features

- Block any list of domains (subdomains included)
- Schedule by days of the week and hours (e.g. Mon–Sat, 8:00–18:00)
- Daily time budget outside the schedule: a reminder after 15 minutes of active use, a full block after 30 minutes until the next day
- Blocking via `declarativeNetRequest` — fast, private, no page content is read
- Settings sync across your devices via `chrome.storage.sync`

## Install

1. `npm install && npm run build`
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select this folder

Configure blocked sites and schedule via the extension's **Options** page.

## Stack

TypeScript, Chrome Manifest V3. No runtime dependencies.
