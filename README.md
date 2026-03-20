# SlopBlocker Zero

[![YouTube](https://img.shields.io/badge/YouTube-@oriontechyt-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://youtube.com/@oriontechyt)
[![Free Forever](https://img.shields.io/badge/Price-Free%20Forever-00F5FF?style=flat-square)](https://github.com/orionstechyt/slopblocker-zero)
[![Zero API Calls](https://img.shields.io/badge/API%20Calls-Zero-00F5FF?style=flat-square)](https://github.com/orionstechyt/slopblocker-zero)
[![Local Only](https://img.shields.io/badge/Runs-100%25%20Local-00F5FF?style=flat-square)](https://github.com/orionstechyt/slopblocker-zero)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
> **Cut the noise. See the signal.**
> A Manifest V3 browser extension that strips AI Overviews from Google, dims slop thumbnails on YouTube, and promotes honest 1-star reviews on Amazon — with zero tracking, zero API calls, and zero compromise.

---

## Why This Exists

It's 2026. You open Google to find an answer. Before you reach a single human-written result, you scroll past a wall of AI-generated text — confident, plausible, often wrong — that Google calls an "Overview." You didn't ask for a summary. You asked for sources.

You open YouTube. The homepage is a sea of faceless channels, AI-voiced narration, algorithmically cloned thumbnails, and rage-bait titles engineered to capture attention without delivering anything real. The signal-to-noise ratio has collapsed.

You open Amazon to buy something. The first thing you see is an AI-generated "summary" of reviews — a smoothed, flattened, brand-friendly paragraph that buries the one review that would have saved you: the one-star from the person who bought it six months ago and watched it break.

**This is the Slop Era.** Platforms optimised for engagement metrics over truth. Content generated faster than it can be verified. AI surfaced where humans used to be.

SlopBlocker Zero doesn't fight every battle. It fights three specific ones — quietly, locally, without phoning home to anyone.

---

## What It Does

### 🔍 Google — Hide AI Overviews
MutationObservers watch the DOM in real time. Every time Google injects an AI Overview block — regardless of which selector rotation they're using in 2026 — it disappears before you see it. You get results. Just results.

### 📺 YouTube — Dim Slop + Force Original Audio
Two independent features:

**Slop Detection:** Video cards whose titles match known AI-generation, faceless channel, or engagement-bait patterns have their thumbnails dimmed to 20% opacity. The video is still there — you can still choose to watch it. But the feed stops shouting at you.

**Original Audio:** When you land on a video, SlopBlocker Zero silently navigates YouTube's audio track settings and selects "Original" — the unmodified, original-language audio track. No more accidentally watching dubbed content when the original exists.

### 🛒 Amazon — Surface the Truth
**1-Star First:** Review containers are re-ordered so 1-star reviews bubble to the top. Not because negative reviews are always right — but because they're the reviews most likely to contain information Amazon doesn't want you to find easily.

**AI Summary Removal:** The "Customers say" AI synthesis block, the "Helpful highlights" widget, and any other AI-generated review summary is hidden. You read the actual reviews, written by actual people.

---

## What It Doesn't Do

- ❌ Zero network requests — no telemetry, no analytics, no "anonymous usage data"
- ❌ Zero remote code — nothing is fetched or executed from outside your browser
- ❌ Zero accounts — no sign-up, no sync, no cloud
- ❌ Zero monetisation — no ads, no affiliate links, no upsells
- ❌ Zero framework bloat — vanilla JavaScript, under 30KB total

---

## Installation

### Chrome / Edge / Brave (Chromium-based browsers)

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/orionstechyt/slopblocker-zero.git
   ```

2. **Open your browser's Extension Manager**
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

3. **Enable Developer Mode**
   Toggle "Developer mode" in the top-right corner.

4. **Load the extension**
   Click **"Load unpacked"** and select the `slopblocker-zero` folder.

5. **Pin it**
   Click the puzzle-piece icon in your toolbar and pin SlopBlocker Zero for quick access.

### Firefox

Firefox support (Manifest V2 compatible fork) is planned. Watch the repo for updates.

---

## Usage

Click the SlopBlocker Zero icon in your toolbar. You'll see five toggles — one per feature. Each toggle takes effect immediately on any open tab matching its platform. Your preferences are saved locally via `chrome.storage.local`.

| Toggle | Platform | What it does |
|---|---|---|
| Hide AI Overviews | Google | Removes AI Overview blocks from search results |
| Dim Slop Thumbnails | YouTube | Dims video thumbnails matching slop patterns |
| Force Original Audio | YouTube | Auto-selects the 'Original' audio track on watch pages |
| Promote 1-Star Reviews | Amazon | Re-orders review lists with 1-star reviews at top |
| Hide AI Summaries | Amazon | Removes AI-generated review summary blocks |

---

## Updating Selectors

Google, YouTube, and Amazon update their DOM structures regularly. All detection selectors live in one file: `scripts/constants.js`. When a feature stops working, open that file, find the relevant selector array, and add the new selector. The logic in `content.js` never needs to change.

```js
// Example: add a new Google AI Overview selector
AI_OVERVIEW_SELECTORS: [
  "div[jsname='yEVEwb']",      // existing
  "div[data-new-selector]",    // ← add here
],
```

---

## File Structure

```
slopblocker-zero/
├── manifest.json              # MV3 manifest — permissions, content scripts
├── scripts/
│   ├── constants.js           # All selectors, patterns, and config values
│   └── content.js             # Core logic: Google, YouTube, Amazon modules
├── ui/
│   ├── popup.html             # Extension popup
│   ├── popup.css              # Brand styles (black + cyan)
│   └── popup.js               # Toggle logic + prefs persistence
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── .gitignore
└── LICENSE
```

---

## Architecture

SlopBlocker Zero uses a **four-layer modular architecture** in a single content script:

```
SBZUtil      — pure utility functions (debounce, DOM helpers)
SBZPrefs     — chrome.storage.local read/write + defaults
SBZCore      — bootstrap, platform detection, message listener
  └── GoogleModule   — MutationObserver-based AI Overview removal
  └── YouTubeModule  — thumbnail scanning + audio track switching
  └── AmazonModule   — review re-ordering + AI summary hiding
```

Each module exposes only `init()` and `destroy()` — making it trivial to hot-reload individual modules when preferences change without restarting the whole extension.

---

## Contributing

This is a lean, focused tool. Before opening a PR:

1. New features must fit the "zero" philosophy (no API, no tracking, no bloat)
2. Selector updates for any platform are always welcome — open a PR or an issue
3. New platform support (Reddit, LinkedIn, etc.) — open an issue to discuss first

---

## Privacy

SlopBlocker Zero collects **nothing**. It reads no personal data, stores nothing beyond your five toggle preferences in your local browser storage, and makes zero outbound network connections. The source code is entirely auditable in this repository.

---

## License

[MIT](LICENSE) — do whatever you want with it. Just don't sell it as your own product without changing the name.

---

## Credits

Built by **Orion's Tech** — a channel dedicated to zero-cost, local-first browser tools.

▶ [youtube.com/@oriontechyt](https://youtube.com/@oriontechyt)

*If this saved you from one bad Amazon purchase or one AI-hallucinated Google answer, give the repo a star. It helps more people find it.*
