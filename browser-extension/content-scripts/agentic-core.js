/**
 * AI Resell Agent - Agentic Core Module
 * Shared utilities for TRUE AGENTIC browser automation
 *
 * This module provides reusable components for all marketplace content scripts:
 * - DOM inspection and selector generation
 * - Page context extraction
 * - Action execution
 * - API communication
 *
 * @version 2.0.0
 * @author AI Resell Agent Team
 */

"use strict";

const AgenticCore = (function () {
  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const Config = Object.freeze({
    API_ENDPOINTS: Object.freeze([
      "https://ai-resell-agent.vercel.app/api/automation/browser-agent",
      "https://listingsai.com/api/automation/browser-agent",
      "http://localhost:3000/api/automation/browser-agent",
    ]),
    TIMING: Object.freeze({
      MAX_ITERATIONS: 30,
      ACTION_DELAY_MS: 500,
      PAGE_SETTLE_MS: 1000,
      MODAL_CHECK_MS: 1500,
      TYPE_CHAR_MS: 15,
      CLICK_DELAY_MS: 200,
      API_TIMEOUT_MS: 3000,
    }),
    LIMITS: Object.freeze({
      MAX_IMAGES: 24,
      MAX_TEXT_LENGTH: 200,
      MAX_OPTIONS: 20,
    }),
  });

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const Utils = {
    /**
     * Promise-based sleep
     */
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Add random jitter for human-like timing
     */
    withJitter(baseMs, jitterPercent = 0.3) {
      const jitter = baseMs * jitterPercent * (Math.random() - 0.5) * 2;
      return Math.max(0, Math.round(baseMs + jitter));
    },

    /**
     * Safe JSON parse
     */
    safeJsonParse(str, fallback = null) {
      try {
        return JSON.parse(str);
      } catch {
        return fallback;
      }
    },

    /**
     * Normalize text for comparison
     */
    normalizeText(text) {
      return (text || "").toLowerCase().trim();
    },

    /**
     * Create logger for marketplace
     */
    createLogger(marketplace) {
      const prefix = `[AI Agent - ${marketplace}]`;
      return {
        info: (msg, data) =>
          data
            ? console.log(`${prefix} ${msg}`, data)
            : console.log(`${prefix} ${msg}`),
        error: (msg, err) =>
          err
            ? console.error(`${prefix} ERROR: ${msg}`, err)
            : console.error(`${prefix} ERROR: ${msg}`),
        debug: (msg, data) => {
          if (window.__AI_AGENT_DEBUG__) {
            data
              ? console.debug(`${prefix} ${msg}`, data)
              : console.debug(`${prefix} ${msg}`);
          }
        },
      };
    },
  };

  // ============================================================================
  // DOM INSPECTOR
  // ============================================================================

  const DOMInspector = {
    /**
     * Check element visibility
     */
    isVisible(el) {
      if (!el) return false;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    },

    /**
     * Extract data attributes
     */
    extractDataAttributes(el) {
      const data = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith("data-")) {
          data[attr.name.slice(5)] = attr.value;
        }
      }
      return Object.keys(data).length > 0 ? data : null;
    },

    /**
     * Generate unique selector
     */
    generateSelector(el, idx, prefix) {
      if (el.id) return `#${CSS.escape(el.id)}`;

      const dataAttrs = [
        "data-test",
        "data-testid",
        "data-et-name",
        "data-vv-name",
      ];
      for (const attr of dataAttrs) {
        const value = el.getAttribute(attr);
        if (value) return `[${attr}="${CSS.escape(value)}"]`;
      }

      if (el.placeholder) {
        return `${el.tagName.toLowerCase()}[placeholder="${CSS.escape(el.placeholder)}"]`;
      }

      if (el.name) {
        return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
      }

      if (el.className && typeof el.className === "string") {
        const classes = el.className
          .split(" ")
          .filter((c) => c && !c.includes("--"))
          .slice(0, 2);
        if (classes.length > 0) {
          return `${el.tagName.toLowerCase()}.${classes.map((c) => CSS.escape(c)).join(".")}`;
        }
      }

      return `${prefix}-${idx}`;
    },

    /**
     * Find element by selector
     */
    findElement(selector) {
      if (
        !selector ||
        /^(input|button|dropdown|modal|textarea|label)-\d+$/.test(selector)
      ) {
        return null;
      }
      try {
        return document.querySelector(selector);
      } catch {
        return null;
      }
    },

    /**
     * Find element by text content
     */
    findElementByText(text, searchSelectors = null) {
      if (!text) return null;

      const normalizedText = Utils.normalizeText(text);
      const selectors = searchSelectors || [
        "button",
        '[role="button"]',
        ".btn",
        ".dropdown__link",
        ".dropdown__menu__item",
        '[role="option"]',
        "a",
        "li",
        "div[data-et-name]",
        "span[data-et-name]",
      ];

      for (const selector of selectors) {
        for (const el of document.querySelectorAll(selector)) {
          if (this.isVisible(el)) {
            const elText = Utils.normalizeText(el.textContent);
            if (elText === normalizedText || elText.includes(normalizedText)) {
              return el;
            }
          }
        }
      }
      return null;
    },
  };

  // ============================================================================
  // PAGE CONTEXT EXTRACTOR
  // ============================================================================

  const PageContextExtractor = {
    extract() {
      return {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        inputs: this._extractElements('input:not([type="hidden"])', "input"),
        textareas: this._extractElements("textarea", "textarea"),
        buttons: this._extractElements(
          'button, [role="button"], .btn',
          "button",
        ),
        dropdowns: this._extractElements(
          'select, .dropdown, [data-test*="dropdown"]',
          "dropdown",
        ),
        labels: this._extractLabels(),
        modals: this._extractModals(),
        errors: this._extractErrors(),
      };
    },

    _extractElements(selector, prefix) {
      const elements = [];
      document.querySelectorAll(selector).forEach((el, idx) => {
        if (!DOMInspector.isVisible(el)) return;

        const item = {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          name: el.name || null,
          type: el.type || null,
          placeholder: el.placeholder || null,
          value: el.value?.substring(0, 100) || null,
          text: el.textContent?.trim().substring(0, 100) || null,
          classes: el.className || null,
          dataAttributes: DOMInspector.extractDataAttributes(el),
          isDisabled: el.disabled || el.getAttribute("disabled") !== null,
          selector: DOMInspector.generateSelector(el, idx, prefix),
        };

        if (el.tagName === "SELECT") {
          item.options = Array.from(el.options)
            .slice(0, Config.LIMITS.MAX_OPTIONS)
            .map((o) => o.text.trim());
        }

        elements.push(item);
      });
      return elements;
    },

    _extractLabels() {
      const labels = [];
      const seen = new Set();

      document
        .querySelectorAll(
          "label, h1, h2, h3, h4, [class*='title'], [class*='label']",
        )
        .forEach((el, idx) => {
          if (!DOMInspector.isVisible(el)) return;
          const text = el.textContent?.trim();
          if (
            !text ||
            text.length > Config.LIMITS.MAX_TEXT_LENGTH ||
            seen.has(text)
          )
            return;

          seen.add(text);
          labels.push({
            tag: el.tagName.toLowerCase(),
            text,
            selector: DOMInspector.generateSelector(el, idx, "label"),
          });
        });
      return labels;
    },

    _extractModals() {
      const modals = [];
      document
        .querySelectorAll('.modal, [role="dialog"], [data-test*="modal"]')
        .forEach((el, idx) => {
          if (!DOMInspector.isVisible(el)) return;

          const buttons = [];
          el.querySelectorAll("button").forEach((btn, btnIdx) => {
            if (DOMInspector.isVisible(btn)) {
              buttons.push({
                text: btn.textContent?.trim(),
                selector: DOMInspector.generateSelector(
                  btn,
                  btnIdx,
                  "modal-btn",
                ),
              });
            }
          });

          modals.push({
            tag: "modal",
            text: el.textContent?.trim().substring(0, 300),
            buttons,
            selector: DOMInspector.generateSelector(el, idx, "modal"),
          });
        });
      return modals;
    },

    _extractErrors() {
      const errors = new Set();
      document
        .querySelectorAll('.error, [class*="error"], [role="alert"]')
        .forEach((el) => {
          if (!DOMInspector.isVisible(el)) return;
          const text = el.textContent?.trim();
          if (
            text &&
            text.length > 0 &&
            text.length < Config.LIMITS.MAX_TEXT_LENGTH
          ) {
            errors.add(text);
          }
        });
      return Array.from(errors);
    },
  };

  // ============================================================================
  // ACTION EXECUTOR
  // ============================================================================

  const ActionExecutor = {
    async execute(action, logger) {
      logger?.info(`Executing: ${action.action} - ${action.description}`);

      const handlers = {
        type: () => this._executeType(action),
        click: () => this._executeClick(action),
        select: () => this._executeSelect(action),
        upload: () => this._executeUpload(action),
        scroll: () => this._executeScroll(action),
        wait: () => this._executeWait(action),
        done: () => "done",
        error: () => {
          logger?.error(action.description);
          return "error";
        },
      };

      const handler = handlers[action.action];
      if (!handler) return false;

      try {
        return await handler();
      } catch (error) {
        logger?.error(`Action failed: ${action.action}`, error);
        return false;
      }
    },

    async _executeType(action) {
      const el = DOMInspector.findElement(action.selector);
      if (!el) return false;

      el.focus();
      el.value = "";
      el.dispatchEvent(new Event("focus", { bubbles: true }));

      const text = action.value || "";
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: char }),
        );
        el.dispatchEvent(
          new KeyboardEvent("keyup", { bubbles: true, key: char }),
        );
        await Utils.sleep(Utils.withJitter(Config.TIMING.TYPE_CHAR_MS));
      }

      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    },

    async _executeClick(action) {
      let el = DOMInspector.findElement(action.selector);
      if (!el && action.value) {
        el = DOMInspector.findElementByText(action.value);
      }
      if (!el) return false;
      return await this._performClick(el);
    },

    async _performClick(el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await Utils.sleep(Config.TIMING.CLICK_DELAY_MS);

      el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await Utils.sleep(50);
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      el.click();
      return true;
    },

    async _executeSelect(action) {
      const el = DOMInspector.findElement(action.selector);
      if (!el) return false;

      if (el.tagName === "SELECT") {
        el.value = action.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      await this._performClick(el);
      await Utils.sleep(500);

      const option = DOMInspector.findElementByText(action.value);
      return option ? await this._performClick(option) : false;
    },

    async _executeUpload(action) {
      const fileInput = document.querySelector('input[type="file"]');
      if (!fileInput) return false;

      const urls = Utils.safeJsonParse(action.value, []);
      if (urls.length === 0) return false;

      const files = [];
      const limit = Math.min(urls.length, Config.LIMITS.MAX_IMAGES);

      for (let i = 0; i < limit; i++) {
        try {
          const response = await fetch(urls[i]);
          if (response.ok) {
            const blob = await response.blob();
            files.push(
              new File([blob], `image_${i}.jpg`, { type: "image/jpeg" }),
            );
          }
        } catch {
          // Skip failed images
        }
      }

      if (files.length === 0) return false;

      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },

    async _executeScroll(action) {
      if (action.selector) {
        const el = DOMInspector.findElement(action.selector);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollBy({ top: 300, behavior: "smooth" });
      }
      return true;
    },

    async _executeWait(action) {
      await Utils.sleep(action.waitMs || 500);
      return true;
    },
  };

  // ============================================================================
  // API CLIENT
  // ============================================================================

  const APIClient = {
    _endpoint: null,

    async getEndpoint() {
      if (this._endpoint) return this._endpoint;

      for (const endpoint of Config.API_ENDPOINTS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            Config.TIMING.API_TIMEOUT_MS,
          );

          const baseUrl = endpoint.split("/api/")[0];
          const response = await fetch(`${baseUrl}/api/health`, {
            method: "GET",
            signal: controller.signal,
          }).catch(() => null);

          clearTimeout(timeoutId);

          if (response?.ok) {
            this._endpoint = endpoint;
            return endpoint;
          }
        } catch {
          // Try next
        }
      }

      this._endpoint = Config.API_ENDPOINTS[2];
      return this._endpoint;
    },

    async getNextActions(
      pageContext,
      listingData,
      currentStep,
      previousActions,
      marketplace,
    ) {
      const endpoint = await this.getEndpoint();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageContext,
          listingData,
          currentStep,
          previousActions: previousActions.slice(-10),
          marketplace,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return response.json();
    },
  };

  // ============================================================================
  // MODAL HANDLER
  // ============================================================================

  const ModalHandler = {
    SELECTORS: Object.freeze([
      '.modal:not([style*="display: none"]) button.btn--primary',
      ".modal .btn--primary",
      '[role="dialog"] button.btn--primary',
      '[data-test*="modal"] button[type="submit"]',
    ]),

    async handleAny() {
      for (const selector of this.SELECTORS) {
        const btn = document.querySelector(selector);
        if (btn && DOMInspector.isVisible(btn)) {
          await ActionExecutor._performClick(btn);
          await Utils.sleep(800);
          return true;
        }
      }
      return false;
    },

    async handleMultiple(maxAttempts = 10) {
      let handled = 0;
      for (let i = 0; i < maxAttempts; i++) {
        await Utils.sleep(Config.TIMING.MODAL_CHECK_MS);
        if (await this.handleAny()) handled++;
        else break;
      }
      return handled;
    },
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return Object.freeze({
    Config,
    Utils,
    DOMInspector,
    PageContextExtractor,
    ActionExecutor,
    APIClient,
    ModalHandler,
  });
})();

// Export for content scripts
if (typeof window !== "undefined") {
  window.AgenticCore = AgenticCore;
}
