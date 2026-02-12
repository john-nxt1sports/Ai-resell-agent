/**
 * AI Resell Agent - Agentic Core Module
 * Shared utilities for TRUE AGENTIC browser automation with 2026 Best Practices
 *
 * This module provides reusable components for all marketplace content scripts:
 * - DOM inspection and selector generation
 * - Page context extraction
 * - Action execution with anti-detection
 * - API communication with retry logic
 * - Advanced error handling and recovery
 *
 * @version 3.0.0
 * @author AI Resell Agent Team
 * @updated 2026-01-29 - Enhanced with 2026 best practices
 */

"use strict";

const AgenticCore = (function () {
  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const Config = Object.freeze({
    API_ENDPOINTS: Object.freeze([
      "https://ai-resell-agent-production.up.railway.app/api/automation/browser-agent",
      "http://localhost:3000/api/automation/browser-agent",
    ]),
    TIMING: Object.freeze({
      MAX_ITERATIONS: 30,
      ACTION_DELAY_MS: 500,
      PAGE_SETTLE_MS: 1000,
      MODAL_CHECK_MS: 1500,
      TYPE_CHAR_MS: 15,
      TYPE_CHAR_VARIANCE: 10, // +/- variance for human-like typing
      CLICK_DELAY_MS: 200,
      CLICK_DELAY_VARIANCE: 100,
      API_TIMEOUT_MS: 3000,
      RETRY_DELAY_MS: 1000,
      MAX_RETRY_DELAY_MS: 10000,
    }),
    LIMITS: Object.freeze({
      MAX_IMAGES: 24,
      MAX_TEXT_LENGTH: 200,
      MAX_OPTIONS: 20,
      MAX_RETRIES: 3,
    }),
    // Anti-detection settings (2026)
    STEALTH: Object.freeze({
      ENABLE_RANDOM_DELAYS: true,
      ENABLE_MOUSE_SIMULATION: true,
      ENABLE_TYPO_SIMULATION: false, // Optional: simulate typos
      HUMAN_ERROR_RATE: 0.02, // 2% chance of minor delays/variations
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
     * Add random jitter for human-like timing (2026 enhancement)
     */
    withJitter(baseMs, jitterPercent = 0.3) {
      const jitter = baseMs * jitterPercent * (Math.random() - 0.5) * 2;
      return Math.max(0, Math.round(baseMs + jitter));
    },

    /**
     * Exponential backoff calculator (2026 pattern)
     * @param {number} attempt - Current attempt number (0-indexed)
     * @param {number} baseDelay - Base delay in ms
     * @param {number} maxDelay - Maximum delay in ms
     * @returns {number}
     */
    exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 10000) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      return this.withJitter(delay, 0.2);
    },

    /**
     * Retry with exponential backoff (2026 resilience pattern)
     * @param {Function} fn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {string} context - Context for logging
     * @returns {Promise<any>}
     */
    async retryWithBackoff(
      fn,
      maxRetries = Config.LIMITS.MAX_RETRIES,
      context = "operation",
    ) {
      let lastError;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;

          if (attempt < maxRetries) {
            const delay = this.exponentialBackoff(attempt);
            console.warn(
              `[AgenticCore] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
              error,
            );
            await this.sleep(delay);
          }
        }
      }

      throw new Error(
        `${context} failed after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`,
      );
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
        warn: (msg, data) =>
          data
            ? console.warn(`${prefix} WARNING: ${msg}`, data)
            : console.warn(`${prefix} WARNING: ${msg}`),
      };
    },

    /**
     * Generate correlation ID for request tracking (2026 observability)
     * @returns {string}
     */
    generateCorrelationId() {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Simulate human-like mouse movement path (2026 anti-detection)
     * @param {Element} element
     */
    simulateMousePath(element) {
      if (!Config.STEALTH.ENABLE_MOUSE_SIMULATION) return;

      const rect = element.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      // Dispatch mousemove events along a curved path
      const steps = 3 + Math.floor(Math.random() * 3); // 3-5 steps
      for (let i = 0; i < steps; i++) {
        const progress = i / steps;
        const x = targetX + (Math.random() - 0.5) * 20;
        const y = targetY + (Math.random() - 0.5) * 20;

        element.dispatchEvent(
          new MouseEvent("mousemove", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
      }
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

      // Human-like typing with variance (2026 anti-detection)
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: char }),
        );
        el.dispatchEvent(
          new KeyboardEvent("keyup", { bubbles: true, key: char }),
        );

        // Variable typing speed with occasional pauses
        let delay = Config.TIMING.TYPE_CHAR_MS;
        if (Config.STEALTH.ENABLE_RANDOM_DELAYS) {
          delay = Utils.withJitter(delay, 0.5);

          // Occasional longer pause (thinking time)
          if (Math.random() < Config.STEALTH.HUMAN_ERROR_RATE) {
            delay += Math.random() * 200;
          }
        }

        await Utils.sleep(delay);
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
      // Simulate mouse movement path (2026 anti-detection)
      Utils.simulateMousePath(el);

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Variable click delay
      const clickDelay = Config.STEALTH.ENABLE_RANDOM_DELAYS
        ? Utils.withJitter(Config.TIMING.CLICK_DELAY_MS, 0.5)
        : Config.TIMING.CLICK_DELAY_MS;
      await Utils.sleep(clickDelay);

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

      // Fetch and validate images (2026 enhancement)
      for (let i = 0; i < limit; i++) {
        try {
          const response = await fetch(urls[i]);
          if (response.ok) {
            const blob = await response.blob();

            // Validate image (2026 - ensure proper format and size)
            if (blob.type.startsWith("image/") && blob.size > 0) {
              files.push(
                new File([blob], `image_${i}.jpg`, { type: "image/jpeg" }),
              );
            } else {
              console.warn(
                `[AgenticCore] Invalid image at index ${i}: ${blob.type}`,
              );
            }
          }
        } catch (error) {
          console.warn(`[AgenticCore] Failed to fetch image ${i}:`, error);
        }
      }

      if (files.length === 0) return false;

      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      console.log(`[AgenticCore] Uploaded ${files.length} images successfully`);
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
  // API CLIENT WITH RETRY LOGIC (2026)
  // ============================================================================

  const APIClient = {
    _endpoint: null,
    _failureCount: 0,
    _circuitOpen: false,
    _circuitOpenUntil: 0,

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
            console.log(`[AgenticCore] Using API endpoint: ${endpoint}`);
            return endpoint;
          }
        } catch {
          // Try next
        }
      }

      this._endpoint = Config.API_ENDPOINTS[1]; // Fallback to localhost
      return this._endpoint;
    },

    /**
     * Circuit breaker check (2026 resilience pattern)
     */
    _checkCircuitBreaker() {
      if (this._circuitOpen) {
        if (Date.now() < this._circuitOpenUntil) {
          throw new Error("Circuit breaker open - too many failures");
        }
        // Reset circuit after timeout
        this._circuitOpen = false;
        this._failureCount = 0;
        console.log("[AgenticCore] Circuit breaker reset");
      }
    },

    /**
     * Record failure and potentially open circuit
     */
    _recordFailure() {
      this._failureCount++;

      if (this._failureCount >= 5) {
        this._circuitOpen = true;
        this._circuitOpenUntil = Date.now() + 30000; // 30 second timeout
        console.error(
          "[AgenticCore] Circuit breaker opened due to repeated failures",
        );
      }
    },

    /**
     * Record success and reset failure count
     */
    _recordSuccess() {
      this._failureCount = 0;
    },

    async getNextActions(
      pageContext,
      listingData,
      currentStep,
      previousActions,
      marketplace,
    ) {
      // Check circuit breaker
      this._checkCircuitBreaker();

      const correlationId = Utils.generateCorrelationId();

      const apiCall = async () => {
        const endpoint = await this.getEndpoint();

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-ID": correlationId,
          },
          body: JSON.stringify({
            pageContext,
            listingData,
            currentStep,
            previousActions: previousActions.slice(-10),
            marketplace,
            correlationId,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json();
      };

      try {
        const result = await Utils.retryWithBackoff(
          apiCall,
          Config.LIMITS.MAX_RETRIES,
          "API call",
        );

        this._recordSuccess();
        return result;
      } catch (error) {
        this._recordFailure();
        throw error;
      }
    },
  };

  // ============================================================================
  // CAPTCHA DETECTOR (2026)
  // ============================================================================

  const CaptchaDetector = {
    CAPTCHA_INDICATORS: Object.freeze([
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="captcha"]',
      ".g-recaptcha",
      ".h-captcha",
      "[data-sitekey]",
      "#captcha",
      ".captcha",
    ]),

    /**
     * Detect if CAPTCHA is present on the page
     * @returns {Object} { detected: boolean, type: string|null, element: Element|null }
     */
    detect() {
      for (const selector of this.CAPTCHA_INDICATORS) {
        const element = document.querySelector(selector);
        if (element && DOMInspector.isVisible(element)) {
          let type = "unknown";

          if (
            selector.includes("recaptcha") ||
            element.classList.contains("g-recaptcha")
          ) {
            type = "recaptcha";
          } else if (
            selector.includes("hcaptcha") ||
            element.classList.contains("h-captcha")
          ) {
            type = "hcaptcha";
          }

          return { detected: true, type, element };
        }
      }

      return { detected: false, type: null, element: null };
    },

    /**
     * Wait for CAPTCHA to be solved (manual or via service)
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<boolean>}
     */
    async waitForSolution(timeout = 60000) {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const captcha = this.detect();
        if (!captcha.detected) {
          console.log("[AgenticCore] CAPTCHA appears to be solved");
          return true;
        }

        await Utils.sleep(1000);
      }

      console.warn("[AgenticCore] CAPTCHA wait timeout");
      return false;
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
    CaptchaDetector, // 2026 addition

    // Version info
    version: "3.0.0",
    updated: "2026-01-29",
  });
})();

// Export for content scripts
if (typeof window !== "undefined") {
  window.AgenticCore = AgenticCore;
  console.log(
    `[AgenticCore] v${AgenticCore.version} loaded (updated: ${AgenticCore.updated})`,
  );
}
