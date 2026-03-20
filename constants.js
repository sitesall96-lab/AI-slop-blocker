/**
 * SlopBlocker Zero — constants.js
 * Central config for all selectors, patterns, and tuning values.
 * Orion's Tech (@oriontechyt) | MIT License
 *
 * DOM selectors are versioned comments to make 2026 updates trivial:
 * just update the selector string — logic stays untouched.
 */

"use strict";

// ─── GOOGLE ───────────────────────────────────────────────────────────────────

const GOOGLE = Object.freeze({
  /**
   * AI Overview container selectors.
   * Google rotates these. Add new ones here without touching content.js.
   * Last verified: 2026-Q1
   */
  AI_OVERVIEW_SELECTORS: [
    // 2025–2026 primary container
    "div[data-attrid='wa:/description']",
    // SGE / AI Overview card
    "div[jsname='yEVEwb']",
    "div[jsname='BiJDqe']",
    // Generic AI answer block
    "c-wiz[data-p*='ai_overview']",
    "c-wiz[jsrenderer='oJbFkb']",
    // "AI-generated" label parent
    "div[data-ved][class*='ULSxyf']",
    // 2026 unified answer panel
    "div[id='Txxkze']",
    "div[id='kp-wp-tab-overview']",
    // Immersive search AI block
    "div[jscontroller='cresXc']",
    "div[data-async-context*='query']>div[class*='wDYxhc']:has(div[class*='NFQFxe'])",
    // "About this result" AI panel
    "g-section-with-header:has([data-hveid]):has(div[class*='fP1Qef'])",
    // Perspectives / AI answers tab
    "div[jsname='mxk7Re']",
  ],

  /**
   * Slop keyword patterns for organic result scoring.
   * Used to optionally dim low-quality result snippets.
   */
  SLOP_SNIPPET_PATTERNS: [
    /\bAI[- ]generated\b/i,
    /\bautomatically (written|created|generated)\b/i,
    /\bas an AI (language model|assistant)\b/i,
  ],

  /** Milliseconds between MutationObserver batch flushes */
  OBSERVER_DEBOUNCE_MS: 80,
});

// ─── YOUTUBE ──────────────────────────────────────────────────────────────────

const YOUTUBE = Object.freeze({
  /**
   * Thumbnail selectors for grid items.
   * Targets the <img> inside recommendation/grid cards.
   */
  THUMBNAIL_IMG_SELECTOR: "ytd-rich-item-renderer img.yt-core-image, ytd-video-renderer img.yt-core-image, ytd-compact-video-renderer img.yt-core-image",

  /** Title element inside each card — used for slop scoring */
  CARD_TITLE_SELECTOR: [
    "ytd-rich-item-renderer #video-title",
    "ytd-video-renderer #video-title",
    "ytd-compact-video-renderer #video-title",
  ].join(", "),

  /** Channel name selector inside each card */
  CARD_CHANNEL_SELECTOR: [
    "ytd-rich-item-renderer #channel-name",
    "ytd-video-renderer #channel-name",
    "ytd-compact-video-renderer #channel-name",
  ].join(", "),

  /** Audio track menu button (⋮ settings inside player) */
  PLAYER_SETTINGS_BTN: ".ytp-settings-button",

  /** Audio track menu item text — matches 'Original' / 'Original Audio' */
  AUDIO_TRACK_ORIGINAL_RE: /^original(\s+audio)?$/i,

  /** Caption menu item that indicates auto-generated captions */
  AUTO_CAPTION_RE: /auto(-|\s)?generated|automatically\s+generated/i,

  /**
   * Slop title detection patterns.
   * Videos whose titles match will have thumbnails dimmed.
   * Tune aggressiveness here without touching logic.
   */
  SLOP_TITLE_PATTERNS: [
    // AI-generated / AI content labels
    /\bAI[- ](generated|made|created|voiced|narrated|video)\b/i,
    // Faceless / automated channels
    /\b(faceless|no[- ]face|nameless)\b.*\b(channel|video|content)\b/i,
    // Low-effort viral bait
    /\b(shocking|you won'?t believe|mind[- ]blowing|insane|unbelievable)\b.{0,30}\b(facts|truth|secret|revealed)\b/i,
    // Mass-produced listicles with no substance signal
    /^\d{1,3}\s+(things|facts|ways|tips|hacks|secrets|reasons)\s+(you|that|about|to)\b/i,
    // Obvious rage/bait phrasing
    /\b(destroyed|woke|exposed|triggered|cancelled|owned|clowned|ratio'?d)\b/i,
    // AI voice / narration tells
    /\b(text[- ]to[- ]speech|tts[- ]narrated|ai[- ]voice)\b/i,
  ],

  /** Opacity applied to dimmed slop thumbnails (0.0–1.0) */
  SLOP_THUMBNAIL_OPACITY: 0.2,

  /** CSS transition for smooth dimming */
  DIM_TRANSITION: "opacity 0.3s ease",

  OBSERVER_DEBOUNCE_MS: 120,
});

// ─── AMAZON ───────────────────────────────────────────────────────────────────

const AMAZON = Object.freeze({
  /**
   * AI Summary / "From the manufacturer" AI-generated content selectors.
   * Amazon rolls out these blocks under several jsnames. Add new ones here.
   */
  AI_SUMMARY_SELECTORS: [
    // 2024–2026 "Helpful customer review highlights"
    "div[data-hook='cr-lighthouse-feature-enabled']",
    "div[data-hook='lighthouseReview']",
    // AI product summary card
    "div[cel_widget_id*='MAIN-AI_SUMMARY']",
    "div[data-cel-widget*='ai_summary']",
    // "About this item" AI-generated bullets block
    "div#feature-bullets-btf",
    // "Customers say" AI synthesis block
    "div[data-hook='cr-insights-widget']",
    "div[data-hook='review-insights']",
    // 2026 AI review summary widget
    "div[class*='cr-insight']",
    "div[data-cel-widget*='REVIEW_INSIGHTS']",
    "span[class*='a-size-base'][data-hook='cr-summarization-attributes-header']",
    "div[data-asin][data-component-type='s-search-result'] div[class*='s-sponsored-label-info-icon']",
  ],

  /** Selector for individual review cards */
  REVIEW_CARD_SELECTOR: "div[data-hook='review']",

  /** Star rating element inside a review card */
  STAR_RATING_SELECTOR: "i[data-hook='review-star-rating'], i[data-hook='cmps-review-star-rating']",

  /** Container that holds all review cards */
  REVIEW_CONTAINER_SELECTOR: "#cm_cr-review_list, div[data-hook='review-list']",

  /**
   * 1-star and 2-star reviews are promoted to top.
   * Define the threshold here (1 = only 1-star, 2 = 1 and 2-star, etc.)
   */
  PROMOTE_STARS_THRESHOLD: 1,

  /** CSS class added to promoted reviews for potential styling */
  PROMOTED_CLASS: "sbz-promoted-review",

  /** CSS class added to hidden AI elements */
  HIDDEN_CLASS: "sbz-ai-hidden",

  OBSERVER_DEBOUNCE_MS: 150,
});

// ─── GLOBAL ───────────────────────────────────────────────────────────────────

const SBZ_CONFIG = Object.freeze({
  /** Extension identifier prefix for injected attributes/classes */
  NAMESPACE: "sbz",

  /** localStorage / chrome.storage key for user toggles */
  STORAGE_KEY: "sbz_prefs",

  /** Default feature flags — all on by default */
  DEFAULTS: Object.freeze({
    google_hide_ai_overview: true,
    youtube_dim_slop:        true,
    youtube_force_original:  true,
    amazon_promote_1star:    true,
    amazon_hide_ai_summary:  true,
  }),

  GOOGLE,
  YOUTUBE,
  AMAZON,
});

// Make available to content.js (both run in same content script scope)
// eslint-disable-next-line no-unused-vars
if (typeof module !== "undefined") module.exports = { SBZ_CONFIG };
