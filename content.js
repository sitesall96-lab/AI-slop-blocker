/**
 * SlopBlocker Zero — content.js
 * Core logic for Google, YouTube, and Amazon.
 * Modular, zero-dependency, zero-network. Local execution only.
 *
 * Architecture:
 *   SBZCore       — bootstrap, prefs, observer management
 *   GoogleModule  — hide AI Overviews
 *   YouTubeModule — dim slop thumbnails + force Original audio
 *   AmazonModule  — promote 1-star reviews + hide AI summaries
 *
 * Orion's Tech (@oriontechyt) | MIT License
 */

"use strict";

// ─── UTILITY LAYER ────────────────────────────────────────────────────────────

const SBZUtil = (() => {
  /**
   * Debounce: returns a function that delays invoking `fn` until after
   * `wait` ms have elapsed since the last invocation.
   */
  function debounce(fn, wait) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Hide an element by injecting an inline style and marking it with a
   * data attribute so we never double-process it.
   */
  function hideElement(el, namespace = "sbz") {
    if (!el || el.dataset[`${namespace}Hidden`]) return;
    el.style.setProperty("display", "none", "important");
    el.dataset[`${namespace}Hidden`] = "1";
  }

  /**
   * Returns true if any of the patterns match the given string.
   */
  function matchesAny(str, patterns) {
    if (!str) return false;
    return patterns.some((re) => re.test(str));
  }

  /**
   * Extract a star count (1–5) from an Amazon star-rating element's
   * class string, e.g. "a-star-1", "a-star-4-5".
   * Returns null if not parseable.
   */
  function parseAmazonStars(el) {
    if (!el) return null;
    const cls = el.className || "";
    const m = cls.match(/a-star-(\d)(?:-(\d))?/);
    if (!m) return null;
    return parseInt(m[1], 10);
  }

  /**
   * Lightweight querySelectorAll wrapper that filters already-processed nodes.
   */
  function freshNodes(root, selector, processedAttr) {
    const all = root.querySelectorAll(selector);
    return processedAttr
      ? Array.from(all).filter((el) => !el.dataset[processedAttr])
      : Array.from(all);
  }

  return Object.freeze({ debounce, hideElement, matchesAny, parseAmazonStars, freshNodes });
})();

// ─── PREFERENCES LAYER ────────────────────────────────────────────────────────

const SBZPrefs = (() => {
  let _prefs = { ...SBZ_CONFIG.DEFAULTS };

  /** Load prefs from chrome.storage.local (async, non-blocking). */
  function load(callback) {
    try {
      chrome.storage.local.get(SBZ_CONFIG.STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          console.warn("[SBZ] storage read error:", chrome.runtime.lastError.message);
          callback(_prefs);
          return;
        }
        const saved = result[SBZ_CONFIG.STORAGE_KEY];
        if (saved && typeof saved === "object") {
          _prefs = { ...SBZ_CONFIG.DEFAULTS, ...saved };
        }
        callback(_prefs);
      });
    } catch (e) {
      // Extension context invalidated or storage unavailable — use defaults
      callback(_prefs);
    }
  }

  /** Save updated prefs object. */
  function save(updated) {
    _prefs = { ...SBZ_CONFIG.DEFAULTS, ...updated };
    try {
      chrome.storage.local.set({ [SBZ_CONFIG.STORAGE_KEY]: _prefs });
    } catch (e) {
      /* silently fail */
    }
  }

  function get() { return { ..._prefs }; }

  return Object.freeze({ load, save, get });
})();

// ─── GOOGLE MODULE ────────────────────────────────────────────────────────────

const GoogleModule = (() => {
  const { AI_OVERVIEW_SELECTORS, OBSERVER_DEBOUNCE_MS } = SBZ_CONFIG.GOOGLE;
  let _observer = null;

  /** Hide all AI Overview blocks currently in the DOM. */
  function hideAIOverviews() {
    AI_OVERVIEW_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el.dataset.sbzHidden) {
          SBZUtil.hideElement(el);
        }
      });
    });
  }

  const _debouncedHide = SBZUtil.debounce(hideAIOverviews, OBSERVER_DEBOUNCE_MS);

  /** Start observing DOM mutations for dynamically injected AI blocks. */
  function init() {
    // Run immediately on existing DOM
    hideAIOverviews();

    // Observe future mutations
    _observer = new MutationObserver((mutations) => {
      // Quick relevance check: only re-scan if something was added
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) _debouncedHide();
    });

    _observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function destroy() {
    if (_observer) { _observer.disconnect(); _observer = null; }
  }

  return Object.freeze({ init, destroy });
})();

// ─── YOUTUBE MODULE ───────────────────────────────────────────────────────────

const YouTubeModule = (() => {
  const {
    THUMBNAIL_IMG_SELECTOR,
    CARD_TITLE_SELECTOR,
    SLOP_TITLE_PATTERNS,
    SLOP_THUMBNAIL_OPACITY,
    DIM_TRANSITION,
    PLAYER_SETTINGS_BTN,
    AUDIO_TRACK_ORIGINAL_RE,
    OBSERVER_DEBOUNCE_MS,
  } = SBZ_CONFIG.YOUTUBE;

  let _observer = null;
  let _audioAttempts = 0;
  const MAX_AUDIO_ATTEMPTS = 8;

  // ── Slop thumbnail dimming ──────────────────────────────────────

  /**
   * Score a video card. Returns true if the title signals slop content.
   */
  function isSlopCard(cardEl) {
    const titleEl = cardEl.querySelector("#video-title, h3 a");
    if (!titleEl) return false;
    const title = (titleEl.textContent || titleEl.title || "").trim();
    return SBZUtil.matchesAny(title, SLOP_TITLE_PATTERNS);
  }

  /**
   * Apply dim effect to an individual thumbnail <img>.
   */
  function dimThumbnail(imgEl) {
    imgEl.style.transition = DIM_TRANSITION;
    imgEl.style.opacity = String(SLOP_THUMBNAIL_OPACITY);
    imgEl.dataset.sbzDimmed = "1";
    imgEl.title = "[SlopBlocker Zero: low-quality signal detected]";
  }

  /**
   * Scan all thumbnail cards and dim those matching slop patterns.
   */
  function scanThumbnails() {
    // Walk up from each <img> to the containing card element
    const imgs = document.querySelectorAll(THUMBNAIL_IMG_SELECTOR);
    imgs.forEach((img) => {
      if (img.dataset.sbzDimmed || img.dataset.sbzChecked) return;
      img.dataset.sbzChecked = "1";

      // Traverse up to find the card wrapper (ytd-*-renderer)
      let card = img.closest(
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer"
      );
      if (!card) return;

      if (isSlopCard(card)) {
        dimThumbnail(img);
      }
    });
  }

  // ── Force Original audio track ──────────────────────────────────

  /**
   * Attempt to switch to the 'Original' audio track via the player
   * settings menu. YouTube's player is built with a custom element
   * system — we interact with it through simulated clicks and DOM
   * inspection of the settings panel.
   *
   * Strategy:
   *   1. Open the settings gear (⚙).
   *   2. Find the 'Audio track' menu item and click it.
   *   3. In the submenu, click the item whose label matches /original/i.
   *   4. Close the menu by pressing Escape.
   */
  function tryForceOriginalAudio() {
    const settingsBtn = document.querySelector(PLAYER_SETTINGS_BTN);
    if (!settingsBtn) return false;

    // Open settings panel
    settingsBtn.click();

    // Give the menu a frame to render
    requestAnimationFrame(() => {
      const menuItems = document.querySelectorAll(
        ".ytp-menuitem, .ytp-panel-menu .ytp-menuitem"
      );

      let audioTrackItem = null;
      menuItems.forEach((item) => {
        const label = item.querySelector(".ytp-menuitem-label");
        if (label && /audio\s+track/i.test(label.textContent)) {
          audioTrackItem = item;
        }
      });

      if (!audioTrackItem) {
        // Menu didn't have audio track option — close and bail
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      audioTrackItem.click();

      // Wait for submenu
      setTimeout(() => {
        const subItems = document.querySelectorAll(
          ".ytp-panel-menu .ytp-menuitem, .ytp-menuitem"
        );
        let found = false;
        subItems.forEach((item) => {
          const label = item.querySelector(".ytp-menuitem-label");
          if (!label) return;
          if (AUDIO_TRACK_ORIGINAL_RE.test(label.textContent.trim())) {
            const radio = item.querySelector(".ytp-menuitem-toggle-checkbox, [aria-checked]");
            const isSelected = radio
              ? radio.getAttribute("aria-checked") === "true"
              : item.getAttribute("aria-checked") === "true";

            if (!isSelected) {
              item.click();
            }
            found = true;
          }
        });

        // Close menu
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );

        if (found) {
          console.info("[SBZ] Original audio track set.");
        }
      }, 200);
    });

    return true;
  }

  /**
   * Wait for the YouTube player to be fully ready, then attempt audio switch.
   * Retries up to MAX_AUDIO_ATTEMPTS times.
   */
  function scheduleAudioForce() {
    _audioAttempts = 0;

    function attempt() {
      if (_audioAttempts >= MAX_AUDIO_ATTEMPTS) return;
      _audioAttempts++;

      const video = document.querySelector("video.html5-main-video");
      const player = document.querySelector("#movie_player");

      if (video && player && video.readyState >= 1) {
        tryForceOriginalAudio();
      } else {
        setTimeout(attempt, 1200);
      }
    }

    setTimeout(attempt, 2000);
  }

  // ── Navigation detection (YouTube SPA) ─────────────────────────

  /**
   * YouTube is a Single Page Application — navigation events fire as
   * yt-navigate-finish or yt-page-data-updated custom events.
   * We hook these to re-run logic on every page transition.
   */
  function onYouTubeNavigate() {
    scanThumbnails();

    const isWatchPage = location.pathname.startsWith("/watch");
    if (isWatchPage) {
      scheduleAudioForce();
    }
  }

  // ── Init / Destroy ──────────────────────────────────────────────

  const _debouncedScan = SBZUtil.debounce(scanThumbnails, OBSERVER_DEBOUNCE_MS);

  function init(prefs) {
    // Initial scan
    if (prefs.youtube_dim_slop) scanThumbnails();
    if (prefs.youtube_force_original && location.pathname.startsWith("/watch")) {
      scheduleAudioForce();
    }

    // SPA navigation events
    document.addEventListener("yt-navigate-finish", onYouTubeNavigate, { passive: true });
    document.addEventListener("yt-page-data-updated", onYouTubeNavigate, { passive: true });

    // MutationObserver for dynamically loaded thumbnails (infinite scroll)
    _observer = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes && prefs.youtube_dim_slop) _debouncedScan();
    });

    _observer.observe(document.body, { childList: true, subtree: true });
  }

  function destroy() {
    if (_observer) { _observer.disconnect(); _observer = null; }
    document.removeEventListener("yt-navigate-finish", onYouTubeNavigate);
    document.removeEventListener("yt-page-data-updated", onYouTubeNavigate);
  }

  return Object.freeze({ init, destroy });
})();

// ─── AMAZON MODULE ────────────────────────────────────────────────────────────

const AmazonModule = (() => {
  const {
    AI_SUMMARY_SELECTORS,
    REVIEW_CARD_SELECTOR,
    STAR_RATING_SELECTOR,
    REVIEW_CONTAINER_SELECTOR,
    PROMOTE_STARS_THRESHOLD,
    PROMOTED_CLASS,
    OBSERVER_DEBOUNCE_MS,
  } = SBZ_CONFIG.AMAZON;

  let _observer = null;

  // ── Hide AI summaries ───────────────────────────────────────────

  function hideAISummaries() {
    AI_SUMMARY_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el.dataset.sbzHidden) SBZUtil.hideElement(el);
      });
    });
  }

  // ── Promote 1-star reviews ──────────────────────────────────────

  /**
   * Re-orders reviews in a container so that 1-star (and optionally 2-star)
   * reviews appear at the top. Uses DOM reordering — no data mutation.
   * Idempotent: checks sbzSorted flag on container.
   */
  function promoteNegativeReviews() {
    const containers = document.querySelectorAll(REVIEW_CONTAINER_SELECTOR);

    containers.forEach((container) => {
      if (container.dataset.sbzSorted) return;

      const reviews = Array.from(container.querySelectorAll(REVIEW_CARD_SELECTOR));
      if (!reviews.length) return;

      const promoted = [];
      const rest = [];

      reviews.forEach((review) => {
        const starEl = review.querySelector(STAR_RATING_SELECTOR);
        const stars = SBZUtil.parseAmazonStars(starEl);

        if (stars !== null && stars <= PROMOTE_STARS_THRESHOLD) {
          review.classList.add(PROMOTED_CLASS);
          // Add a subtle visual indicator
          _markPromotedReview(review);
          promoted.push(review);
        } else {
          rest.push(review);
        }
      });

      if (!promoted.length) {
        container.dataset.sbzSorted = "1";
        return;
      }

      // Re-insert: promoted first, then rest
      const fragment = document.createDocumentFragment();
      [...promoted, ...rest].forEach((r) => fragment.appendChild(r));
      container.appendChild(fragment);
      container.dataset.sbzSorted = "1";

      console.info(`[SBZ] Promoted ${promoted.length} critical review(s) to top.`);
    });
  }

  /**
   * Add a subtle "⚑ Promoted by SlopBlocker Zero" badge above the review.
   */
  function _markPromotedReview(reviewEl) {
    if (reviewEl.querySelector(".sbz-badge")) return;
    const badge = document.createElement("div");
    badge.className = "sbz-badge";
    badge.style.cssText = [
      "display:inline-block",
      "margin-bottom:6px",
      "padding:2px 8px",
      "background:#1a1a1a",
      "color:#00F5FF",
      "font-size:11px",
      "font-family:monospace",
      "border:1px solid #00F5FF",
      "border-radius:3px",
      "letter-spacing:0.05em",
    ].join(";");
    badge.textContent = "⚑ Critical review — surfaced by SlopBlocker Zero";
    reviewEl.insertBefore(badge, reviewEl.firstChild);
  }

  // ── Init / Destroy ──────────────────────────────────────────────

  function runAll(prefs) {
    if (prefs.amazon_hide_ai_summary) hideAISummaries();
    if (prefs.amazon_promote_1star)  promoteNegativeReviews();
  }

  const _debouncedRun = (prefs) => SBZUtil.debounce(() => runAll(prefs), OBSERVER_DEBOUNCE_MS)();

  function init(prefs) {
    runAll(prefs);

    _observer = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) _debouncedRun(prefs);
    });

    _observer.observe(document.body, { childList: true, subtree: true });
  }

  function destroy() {
    if (_observer) { _observer.disconnect(); _observer = null; }
  }

  return Object.freeze({ init, destroy });
})();

// ─── CORE BOOTSTRAP ───────────────────────────────────────────────────────────

const SBZCore = (() => {
  function detectPlatform() {
    const host = location.hostname.replace(/^www\./, "");
    if (host === "google.com" || host.endsWith(".google.com")) return "google";
    if (host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";
    if (host.startsWith("amazon.")) return "amazon";
    return null;
  }

  function boot() {
    const platform = detectPlatform();
    if (!platform) return; // Not a supported site

    SBZPrefs.load((prefs) => {
      switch (platform) {
        case "google":
          if (prefs.google_hide_ai_overview) GoogleModule.init();
          break;

        case "youtube":
          YouTubeModule.init(prefs);
          break;

        case "amazon":
          AmazonModule.init(prefs);
          break;
      }

      // Listen for pref updates from popup
      try {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg?.type === "SBZ_PREFS_UPDATED") {
            SBZPrefs.save(msg.prefs);
            // Soft-restart affected module
            switch (platform) {
              case "google":
                GoogleModule.destroy();
                if (msg.prefs.google_hide_ai_overview) GoogleModule.init();
                break;
              case "youtube":
                YouTubeModule.destroy();
                YouTubeModule.init(msg.prefs);
                break;
              case "amazon":
                AmazonModule.destroy();
                AmazonModule.init(msg.prefs);
                break;
            }
          }
        });
      } catch (e) { /* context may be invalidated during extension reload */ }
    });
  }

  return Object.freeze({ boot });
})();

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

SBZCore.boot();
