/**
 * SlopBlocker Zero — popup.js
 * Toggle UI logic: reads/writes prefs via chrome.storage.local
 * and broadcasts changes to active content scripts.
 *
 * Orion's Tech (@oriontechyt) | MIT License
 */

"use strict";

const STORAGE_KEY = "sbz_prefs";

const DEFAULTS = {
  google_hide_ai_overview: true,
  youtube_dim_slop:        true,
  youtube_force_original:  true,
  amazon_promote_1star:    true,
  amazon_hide_ai_summary:  true,
};

// ─── DOM references ────────────────────────────────────────────────────────────

const toggleButtons = document.querySelectorAll(".toggle[data-pref]");

// ─── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("toast--visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("toast--visible"), 1400);
}

// ─── Pref helpers ──────────────────────────────────────────────────────────────

function loadPrefs(callback) {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const saved = result[STORAGE_KEY];
    const prefs = saved && typeof saved === "object"
      ? { ...DEFAULTS, ...saved }
      : { ...DEFAULTS };
    callback(prefs);
  });
}

function savePrefs(prefs) {
  chrome.storage.local.set({ [STORAGE_KEY]: prefs }, () => {
    // Broadcast to all content scripts in supported tabs
    broadcastToActiveTabs(prefs);
  });
}

function broadcastToActiveTabs(prefs) {
  const patterns = [
    "https://www.google.com/*",
    "https://www.youtube.com/*",
    "https://www.amazon.com/*",
    "https://www.amazon.co.uk/*",
    "https://www.amazon.ca/*",
    "https://www.amazon.in/*",
  ];

  // Query all matching tabs and send message
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id || !tab.url) return;
      const url = tab.url;
      const matches = patterns.some((p) => {
        // Convert extension match pattern to a simple string check
        const domain = p.replace("https://", "").replace("/*", "");
        return url.includes(domain);
      });
      if (!matches) return;

      chrome.tabs.sendMessage(tab.id, {
        type: "SBZ_PREFS_UPDATED",
        prefs,
      }).catch(() => {
        // Tab might not have content script loaded yet — ignore
      });
    });
  });
}

// ─── Toggle rendering ─────────────────────────────────────────────────────────

function applyPrefsToUI(prefs) {
  toggleButtons.forEach((btn) => {
    const key = btn.dataset.pref;
    if (key in prefs) {
      const isOn = Boolean(prefs[key]);
      btn.setAttribute("aria-checked", isOn ? "true" : "false");
    }
  });
}

// ─── Event listeners ──────────────────────────────────────────────────────────

toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.pref;
    const current = btn.getAttribute("aria-checked") === "true";
    const next = !current;

    btn.setAttribute("aria-checked", next ? "true" : "false");

    loadPrefs((prefs) => {
      prefs[key] = next;
      savePrefs(prefs);
      showToast(next ? "✓ Enabled" : "○ Disabled");
    });
  });

  // Keyboard support: Space and Enter toggle
  btn.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

loadPrefs((prefs) => {
  applyPrefsToUI(prefs);
});
