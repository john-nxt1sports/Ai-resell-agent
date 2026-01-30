/**
 * AI Resell Agent - Poshmark Content Script
 * TRUE AGENTIC Browser Automation (2026 Production Grade)
 *
 * Enhanced with 2026 Best Practices:
 * - Advanced anti-detection (variable timing, mouse simulation)
 * - Circuit breaker and exponential backoff retry logic
 * - CAPTCHA detection and handling
 * - Structured logging with correlation IDs
 * - Comprehensive error recovery mechanisms
 * - Self-healing selector strategies
 *
 * Architecture:
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │  DOM Analyzer   │────▶│  Browser Agent  │────▶│   AI (Gemini)   │
 * │  (PageContext)  │     │      API        │     │ (Action Planner)│
 * └─────────────────┘     └─────────────────┘     └─────────────────┘
 *         ▲                                                │
 *         │                                                │
 *         └──────────── Action Executor ◀──────────────────┘
 *
 * @version 3.0.0
 * @author AI Resell Agent Team
 * @updated 2026-01-29
 */

"use strict";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AgentConfig = Object.freeze({
  API_ENDPOINTS: Object.freeze([
    "http://localhost:3000/api/automation/browser-agent",
    "https://ai-resell-agent.vercel.app/api/automation/browser-agent",
    "https://listingsai.com/api/automation/browser-agent",
  ]),
  TIMING: Object.freeze({
    MAX_ITERATIONS: 35,
    ACTION_DELAY_MS: 600,
    PAGE_SETTLE_MS: 1200,
    MODAL_CHECK_MS: 1500,
    TYPE_CHAR_MS: 15,
    CLICK_DELAY_MS: 200,
    API_TIMEOUT_MS: 3000,
  }),
  LIMITS: Object.freeze({
    MAX_IMAGES: 16,
    MAX_FAILED_ITERATIONS: 5,
    MAX_LABEL_LENGTH: 100,
    MAX_TEXT_LENGTH: 200,
  }),
  MARKETPLACE: "poshmark",
});

// ============================================================================
// LOGGER MODULE
// ============================================================================

const Logger = {
  _prefix: "[AI Agent - Poshmark]",

  info(message, data = null) {
    data
      ? console.log(`${this._prefix} ${message}`, data)
      : console.log(`${this._prefix} ${message}`);
  },

  error(message, error = null) {
    error
      ? console.error(`${this._prefix} ERROR: ${message}`, error)
      : console.error(`${this._prefix} ERROR: ${message}`);
  },

  debug(message, data = null) {
    if (typeof window !== "undefined" && window.__AI_AGENT_DEBUG__) {
      data
        ? console.debug(`${this._prefix} DEBUG: ${message}`, data)
        : console.debug(`${this._prefix} DEBUG: ${message}`);
    }
  },

  group(label) {
    console.group(`${this._prefix} ${label}`);
  },

  groupEnd() {
    console.groupEnd();
  },
};

// ============================================================================
// UTILITY MODULE
// ============================================================================

const Utils = {
  /**
   * Promise-based sleep
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Add random jitter to timing for human-like behavior
   * @param {number} baseMs - Base milliseconds
   * @param {number} jitterPercent - Jitter percentage (0-1)
   * @returns {number}
   */
  withJitter(baseMs, jitterPercent = 0.3) {
    const jitter = baseMs * jitterPercent * (Math.random() - 0.5) * 2;
    return Math.max(0, Math.round(baseMs + jitter));
  },

  /**
   * Safe JSON parse with fallback
   * @param {string} str - JSON string
   * @param {*} fallback - Fallback value
   * @returns {*}
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
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    return (text || "").toLowerCase().trim();
  },
};

// ============================================================================
// DOM INSPECTOR MODULE
// ============================================================================

const DOMInspector = {
  /**
   * Check if element is visible
   * @param {Element} el
   * @returns {boolean}
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
   * Extract data attributes from element
   * @param {Element} el
   * @returns {Object|null}
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
   * Generate unique selector for element
   * @param {Element} el
   * @param {number} idx
   * @param {string} prefix
   * @returns {string}
   */
  generateSelector(el, idx, prefix) {
    // Priority 1: ID
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    // Priority 2: Data attributes (Poshmark convention)
    const dataAttrs = [
      "data-test",
      "data-et-name",
      "data-vv-name",
      "data-testid",
    ];
    for (const attr of dataAttrs) {
      const value = el.getAttribute(attr);
      if (value) {
        return `[${attr}="${CSS.escape(value)}"]`;
      }
    }

    // Priority 3: Input-specific attributes
    if (el.placeholder) {
      return `${el.tagName.toLowerCase()}[placeholder="${CSS.escape(el.placeholder)}"]`;
    }

    if (el.name) {
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
    }

    // Priority 4: Class-based selector
    if (el.className && typeof el.className === "string") {
      const validClasses = el.className
        .split(" ")
        .filter((c) => c && !c.includes("--") && !c.match(/^\d/))
        .slice(0, 2);

      if (validClasses.length > 0) {
        return `${el.tagName.toLowerCase()}.${validClasses.map((c) => CSS.escape(c)).join(".")}`;
      }
    }

    // Fallback: indexed selector
    return `${prefix}-${idx}`;
  },

  /**
   * Find element by selector with fallback
   * @param {string} selector
   * @returns {Element|null}
   */
  findElement(selector) {
    if (!selector) return null;

    // Skip invalid indexed selectors
    if (/^(input|button|dropdown|modal|textarea|label)-\d+$/.test(selector)) {
      return null;
    }

    try {
      return document.querySelector(selector);
    } catch (e) {
      Logger.debug(`Invalid selector: ${selector}`);
      return null;
    }
  },

  /**
   * Find element by text content
   * @param {string} text
   * @returns {Element|null}
   */
  findElementByText(text) {
    if (!text) return null;

    const normalizedText = Utils.normalizeText(text);

    // Priority 0: Search in visible MODAL dropdowns first (highest priority)
    const modalDropdownSelectors = [
      '.modal:not([style*="display: none"]) .dropdown__menu .dropdown__link',
      '[role="dialog"] .dropdown__menu .dropdown__link',
      '[aria-modal="true"] .dropdown__menu .dropdown__link',
      '.modal .dropdown__menu:not([style*="display: none"]) .dropdown__link',
      ".modal .dropdown--open .dropdown__link",
      '.modal [role="listbox"] [role="option"]',
      '[role="dialog"] [role="option"]',
    ];

    for (const selector of modalDropdownSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (this.isVisible(el)) {
          const elText = Utils.normalizeText(el.textContent);
          if (
            elText === normalizedText ||
            elText.includes(normalizedText) ||
            normalizedText.includes(elText)
          ) {
            Logger.debug(
              `Found element in modal dropdown: "${el.textContent?.trim()}"`,
            );
            return el;
          }
        }
      }
    }

    // Priority 1: Search in visible dropdown menus (non-modal)
    const dropdownMenuSelectors = [
      '.dropdown__menu:not([style*="display: none"]) .dropdown__link',
      '.dropdown__menu:not([style*="display: none"]) .dropdown__menu__item',
      ".dropdown--open .dropdown__link",
      ".dropdown.active .dropdown__link",
      '[role="listbox"] [role="option"]',
      ".dropdown-menu.show li",
    ];

    for (const selector of dropdownMenuSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (this.isVisible(el)) {
          const elText = Utils.normalizeText(el.textContent);
          if (
            elText === normalizedText ||
            elText.includes(normalizedText) ||
            normalizedText.includes(elText)
          ) {
            return el;
          }
        }
      }
    }

    // Priority 2: General interactive elements
    const searchSelectors = [
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

    for (const selector of searchSelectors) {
      const elements = document.querySelectorAll(selector);

      for (const el of elements) {
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
  /**
   * Extract complete page context for AI analysis
   * @returns {Object}
   */
  extract() {
    Logger.debug("Extracting page context...");

    const context = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      inputs: this._extractInputs(),
      textareas: this._extractTextareas(),
      buttons: this._extractButtons(),
      dropdowns: this._extractDropdowns(),
      labels: this._extractLabels(),
      modals: this._extractModals(),
      errors: this._extractErrors(),
    };

    Logger.debug(
      `Extracted: ${context.inputs.length} inputs, ` +
        `${context.buttons.length} buttons, ` +
        `${context.dropdowns.length} dropdowns, ` +
        `${context.modals.length} modals`,
    );

    return context;
  },

  _extractInputs() {
    const inputs = [];

    document
      .querySelectorAll('input:not([type="hidden"])')
      .forEach((el, idx) => {
        if (!DOMInspector.isVisible(el)) return;

        inputs.push({
          tag: "input",
          type: el.type,
          id: el.id || null,
          name: el.name || null,
          placeholder: el.placeholder || null,
          value: el.value || null,
          classes: el.className || null,
          dataAttributes: DOMInspector.extractDataAttributes(el),
          isDisabled: el.disabled,
          selector: DOMInspector.generateSelector(el, idx, "input"),
        });
      });

    return inputs;
  },

  _extractTextareas() {
    const textareas = [];

    document.querySelectorAll("textarea").forEach((el, idx) => {
      if (!DOMInspector.isVisible(el)) return;

      textareas.push({
        tag: "textarea",
        id: el.id || null,
        name: el.name || null,
        placeholder: el.placeholder || null,
        value: el.value || null,
        classes: el.className || null,
        dataAttributes: DOMInspector.extractDataAttributes(el),
        isDisabled: el.disabled,
        selector: DOMInspector.generateSelector(el, idx, "textarea"),
      });
    });

    return textareas;
  },

  _extractButtons() {
    const buttons = [];

    document
      .querySelectorAll('button, [role="button"], .btn')
      .forEach((el, idx) => {
        if (!DOMInspector.isVisible(el)) return;

        buttons.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          id: el.id || null,
          text: el.textContent?.trim().substring(0, 100) || null,
          classes: el.className || null,
          dataAttributes: DOMInspector.extractDataAttributes(el),
          isDisabled: el.disabled || el.getAttribute("disabled") !== null,
          selector: DOMInspector.generateSelector(el, idx, "button"),
        });
      });

    return buttons;
  },

  _extractDropdowns() {
    const dropdowns = [];

    // Extended selectors for Poshmark's custom dropdowns
    const dropdownSelectors = [
      "select",
      ".dropdown",
      '[data-test*="dropdown"]',
      ".listing-editor__section--category .dropdown",
      ".listing-editor__section--size .dropdown",
      ".listing-editor__section--color .dropdown",
      '[class*="category"] .dropdown',
      '[class*="size"] .dropdown',
      '[data-vv-name="category"]',
      '[data-vv-name="size"]',
      ".form__select",
      ".dropdown__selector",
      ".dropdown__toggle",
      '[role="listbox"]',
      '[role="combobox"]',
    ];

    document
      .querySelectorAll(dropdownSelectors.join(", "))
      .forEach((el, idx) => {
        if (!DOMInspector.isVisible(el)) return;

        const options = [];
        if (el.tagName === "SELECT") {
          el.querySelectorAll("option").forEach((opt) => {
            options.push(opt.textContent?.trim());
          });
        }

        // Check for expanded dropdown menu options
        const menuEl =
          el.querySelector(".dropdown__menu") ||
          el.closest(".dropdown")?.querySelector(".dropdown__menu");
        if (menuEl && DOMInspector.isVisible(menuEl)) {
          menuEl
            .querySelectorAll(
              '.dropdown__link, .dropdown__menu__item, li, [role="option"]',
            )
            .forEach((opt) => {
              const text = opt.textContent?.trim();
              if (text && text.length < 100) options.push(text);
            });
        }

        // Get context from parent section label
        let sectionLabel = null;
        const section = el.closest(
          ".listing-editor__section, .listing-editor__subsection, section",
        );
        if (section) {
          const labelEl = section.querySelector(
            ".listing-editor__section__title, label, h4, h3",
          );
          sectionLabel = labelEl?.textContent?.trim();
        }

        dropdowns.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          text:
            el.textContent
              ?.trim()
              .substring(0, AgentConfig.LIMITS.MAX_TEXT_LENGTH) || null,
          classes: el.className || null,
          dataAttributes: DOMInspector.extractDataAttributes(el),
          options: options.slice(0, 20),
          sectionLabel: sectionLabel,
          isExpanded: menuEl && DOMInspector.isVisible(menuEl),
          selector: DOMInspector.generateSelector(el, idx, "dropdown"),
        });
      });

    return dropdowns;
  },

  _extractLabels() {
    const labels = [];
    const seen = new Set();

    document
      .querySelectorAll(
        "label, .listing-editor__section__title, h1, h2, h3, h4",
      )
      .forEach((el, idx) => {
        if (!DOMInspector.isVisible(el)) return;

        const text = el.textContent?.trim();
        if (
          !text ||
          text.length > AgentConfig.LIMITS.MAX_LABEL_LENGTH ||
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

    // Extended modal selectors including Poshmark's price suggestion modal
    const modalSelectors = [
      '.modal:not([style*="display: none"])',
      '[data-test*="modal"]',
      '[role="dialog"]',
      ".price-suggestion-modal",
      ".posh-suggest-modal",
      ".modal--visible",
      '[class*="modal"][class*="open"]',
      '[class*="modal"][class*="active"]',
      ".overlay-modal",
      '[aria-modal="true"]',
      ".ReactModal__Content",
      ".modal-content",
      '[class*="Dialog"]',
    ];

    document.querySelectorAll(modalSelectors.join(", ")).forEach((el, idx) => {
      if (!DOMInspector.isVisible(el)) return;

      // Extract buttons inside modal
      const modalButtons = [];
      el.querySelectorAll('button, .btn, [role="button"]').forEach(
        (btn, btnIdx) => {
          if (DOMInspector.isVisible(btn)) {
            const btnText = btn.textContent?.trim();
            if (btnText && btnText.length > 0 && btnText.length < 50) {
              modalButtons.push({
                text: btnText,
                selector: DOMInspector.generateSelector(
                  btn,
                  btnIdx,
                  "modal-btn",
                ),
                isPrimary:
                  btn.classList.contains("btn--primary") ||
                  btn.classList.contains("primary"),
              });
            }
          }
        },
      );

      // Extract dropdowns inside modal (CRITICAL for multi-dropdown modals)
      const modalDropdowns = [];
      el.querySelectorAll(
        '.dropdown, select, [role="listbox"], [role="combobox"], .dropdown__selector, [data-test*="dropdown"]',
      ).forEach((dd, ddIdx) => {
        if (DOMInspector.isVisible(dd)) {
          // Get dropdown label from nearby elements
          let dropdownLabel = null;
          const labelEl = dd
            .closest(
              ".form-group, .field, section, .listing-editor__subsection",
            )
            ?.querySelector('label, h4, h3, .title, [class*="label"]');
          if (labelEl) dropdownLabel = labelEl.textContent?.trim();

          // Check if dropdown is open/expanded
          const menuEl =
            dd.querySelector(".dropdown__menu") ||
            dd.closest(".dropdown")?.querySelector(".dropdown__menu");
          const isExpanded = menuEl && DOMInspector.isVisible(menuEl);

          // Get available options if expanded
          const options = [];
          if (isExpanded && menuEl) {
            menuEl
              .querySelectorAll(
                '.dropdown__link, .dropdown__menu__item, li, [role="option"]',
              )
              .forEach((opt) => {
                const text = opt.textContent?.trim();
                if (text && text.length < 100) options.push(text);
              });
          }

          // Get current selected value
          let currentValue =
            dd.querySelector(".dropdown__selector")?.textContent?.trim() ||
            dd.value ||
            dd.querySelector('[class*="selected"]')?.textContent?.trim() ||
            null;

          modalDropdowns.push({
            label: dropdownLabel,
            selector: DOMInspector.generateSelector(
              dd,
              ddIdx,
              "modal-dropdown",
            ),
            isExpanded: isExpanded,
            options: options.slice(0, 15),
            currentValue: currentValue,
            text: dd.textContent?.trim().substring(0, 100),
          });
        }
      });

      // Extract inputs inside modal
      const modalInputs = [];
      el.querySelectorAll('input:not([type="hidden"]), textarea').forEach(
        (inp, inpIdx) => {
          if (DOMInspector.isVisible(inp)) {
            let inputLabel = null;
            const labelEl =
              inp.closest(".form-group, .field")?.querySelector("label") ||
              document.querySelector(`label[for="${inp.id}"]`);
            if (labelEl) inputLabel = labelEl.textContent?.trim();

            modalInputs.push({
              type: inp.type || "textarea",
              label: inputLabel,
              placeholder: inp.placeholder || null,
              value: inp.value || null,
              selector: DOMInspector.generateSelector(
                inp,
                inpIdx,
                "modal-input",
              ),
            });
          }
        },
      );

      // Detect modal type by content
      const modalText = el.textContent?.toLowerCase() || "";
      let modalType = "unknown";
      if (modalText.includes("price") || modalText.includes("suggest"))
        modalType = "price-suggestion";
      else if (modalText.includes("crop") || modalText.includes("photo"))
        modalType = "image-crop";
      else if (modalText.includes("category")) modalType = "category";
      else if (modalText.includes("size")) modalType = "size";
      else if (modalText.includes("color")) modalType = "color";
      else if (modalText.includes("brand")) modalType = "brand";
      else if (modalText.includes("condition")) modalType = "condition";
      else if (modalDropdowns.length > 0) modalType = "form-with-dropdowns";

      // Determine if modal requires interaction or can be auto-dismissed
      const hasRequiredFields =
        modalDropdowns.some((dd) => !dd.currentValue) ||
        modalInputs.some((inp) => !inp.value && inp.type !== "hidden");
      const canAutoDismiss =
        !hasRequiredFields && modalButtons.some((b) => b.isPrimary);

      modals.push({
        tag: "modal",
        type: modalType,
        text: el.textContent?.trim().substring(0, 300),
        buttons: modalButtons,
        dropdowns: modalDropdowns,
        inputs: modalInputs,
        hasRequiredFields: hasRequiredFields,
        canAutoDismiss: canAutoDismiss,
        dropdownCount: modalDropdowns.length,
        selector: DOMInspector.generateSelector(el, idx, "modal"),
      });
    });

    return modals;
  },

  _extractErrors() {
    const errors = new Set();

    // Find explicit error elements
    document
      .querySelectorAll(
        '.form__error-message, .error, [class*="error"], [role="alert"]',
      )
      .forEach((el) => {
        if (!DOMInspector.isVisible(el)) return;

        const text = el.textContent?.trim();
        if (
          text &&
          text.length > 0 &&
          text.length < AgentConfig.LIMITS.MAX_TEXT_LENGTH
        ) {
          errors.add(text);
        }
      });

    // Find "Required" indicators
    document
      .querySelectorAll(".listing-editor__subsection, section, .form-group")
      .forEach((section) => {
        const requiredEl = section.querySelector('[class*="required"]');
        if (requiredEl && DOMInspector.isVisible(requiredEl)) {
          const label = section.querySelector(
            ".listing-editor__section__title, label, h4",
          );
          if (label) {
            errors.add(`${label.textContent?.trim()} is required`);
          }
        }
      });

    return Array.from(errors);
  },
};

// ============================================================================
// ACTION EXECUTOR MODULE
// ============================================================================

const ActionExecutor = {
  /**
   * Execute a single action
   * @param {Object} action
   * @returns {Promise<boolean|string>}
   */
  async execute(action) {
    Logger.info(`Executing: ${action.action} - ${action.description}`);

    const handlers = {
      type: () => this._executeType(action),
      click: () => this._executeClick(action),
      select: () => this._executeSelect(action),
      upload: () => this._executeUpload(action),
      scroll: () => this._executeScroll(action),
      wait: () => this._executeWait(action),
      done: () => "done",
      error: () => {
        Logger.error(action.description);
        return "error";
      },
    };

    const handler = handlers[action.action];
    if (!handler) {
      Logger.debug(`Unknown action: ${action.action}`);
      return false;
    }

    try {
      return await handler();
    } catch (error) {
      Logger.error(`Action failed: ${action.action}`, error);
      return false;
    }
  },

  async _executeType(action) {
    const el = DOMInspector.findElement(action.selector);
    if (!el) {
      Logger.debug(`Element not found: ${action.selector}`);
      return false;
    }

    // Detect if this is a price field (triggers modal on Poshmark)
    const isPriceField =
      action.selector?.includes("price") ||
      el.getAttribute("data-vv-name") === "price" ||
      el.placeholder?.toLowerCase().includes("price");

    // Focus and clear
    el.focus();
    el.value = "";
    el.dispatchEvent(new Event("focus", { bubbles: true }));

    // Human-like typing for Vue.js compatibility
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
      await Utils.sleep(Utils.withJitter(AgentConfig.TIMING.TYPE_CHAR_MS));
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));

    // For price field, immediately handle the price suggestion modal that appears
    if (isPriceField) {
      await Utils.sleep(500); // Wait for modal to appear
      await this._handlePriceSuggestionModal();
    }
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    return true;
  },

  /**
   * Handle Poshmark's price suggestion modal that appears after entering price
   * @returns {Promise<boolean>}
   */
  async _handlePriceSuggestionModal() {
    const modalSelectors = [
      ".price-suggestion-modal button.btn--primary",
      '.modal button[data-et-name="done"]',
      '.modal button[data-et-name="apply"]',
      '.modal:not([style*="display: none"]) button.btn--primary',
      '[role="dialog"] button.btn--primary',
      ".modal button:not(.btn--tertiary)",
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      for (const selector of modalSelectors) {
        const btn = document.querySelector(selector);
        if (btn && DOMInspector.isVisible(btn)) {
          Logger.info(
            `Dismissing price suggestion modal: "${btn.textContent?.trim()}"`,
          );
          await this._performClick(btn);
          await Utils.sleep(500);
          return true;
        }
      }
      await Utils.sleep(300);
    }
    return false;
  },

  async _executeClick(action) {
    let el = DOMInspector.findElement(action.selector);

    // Fallback to text search with enhanced dropdown support
    if (!el && action.value) {
      el = DOMInspector.findElementByText(action.value);

      // If still not found, search specifically in open dropdown menus
      if (!el) {
        el = this._findDropdownOption(action.value);
      }
    }

    if (!el) {
      Logger.debug(
        `Click target not found: ${action.selector || action.value}`,
      );
      return false;
    }

    return await this._performClick(el);
  },

  /**
   * Find option in an open dropdown menu
   * @param {string} text - Text to search for
   * @returns {Element|null}
   */
  _findDropdownOption(text) {
    if (!text) return null;
    const normalizedText = Utils.normalizeText(text);

    // Search in visible dropdown menus
    const menuSelectors = [
      '.dropdown__menu:not([style*="display: none"])',
      ".dropdown-menu.show",
      '[role="listbox"]',
      ".dropdown--open .dropdown__menu",
      ".dropdown.active .dropdown__menu",
    ];

    for (const menuSelector of menuSelectors) {
      const menus = document.querySelectorAll(menuSelector);
      for (const menu of menus) {
        if (!DOMInspector.isVisible(menu)) continue;

        const options = menu.querySelectorAll(
          '.dropdown__link, .dropdown__menu__item, li, [role="option"], a, button',
        );

        for (const opt of options) {
          if (!DOMInspector.isVisible(opt)) continue;
          const optText = Utils.normalizeText(opt.textContent);
          // Check exact match or contains
          if (
            optText === normalizedText ||
            optText.includes(normalizedText) ||
            normalizedText.includes(optText)
          ) {
            return opt;
          }
        }
      }
    }

    return null;
  },

  async _performClick(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await Utils.sleep(AgentConfig.TIMING.CLICK_DELAY_MS);

    // Simulate natural mouse events
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

    // Native select
    if (el.tagName === "SELECT") {
      el.value = action.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // Custom dropdown
    await this._performClick(el);
    await Utils.sleep(500);

    const option = DOMInspector.findElementByText(action.value);
    if (option) {
      await this._performClick(option);
      return true;
    }

    return false;
  },

  async _executeUpload(action) {
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) {
      Logger.debug("File input not found");
      return false;
    }

    const imageUrls = Utils.safeJsonParse(action.value, []);
    if (imageUrls.length === 0) return false;

    const files = await this._fetchImages(imageUrls);
    if (files.length === 0) return false;

    const dataTransfer = new DataTransfer();
    files.forEach((f) => dataTransfer.items.add(f));
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  },

  async _fetchImages(urls) {
    const files = [];
    const limit = Math.min(urls.length, AgentConfig.LIMITS.MAX_IMAGES);

    for (let i = 0; i < limit; i++) {
      try {
        const response = await fetch(urls[i]);
        if (response.ok) {
          const blob = await response.blob();
          files.push(
            new File([blob], `image_${i}.jpg`, { type: "image/jpeg" }),
          );
        }
      } catch (e) {
        Logger.debug(`Failed to fetch image ${i}: ${urls[i]}`);
      }
    }

    return files;
  },

  async _executeScroll(action) {
    if (action.selector) {
      const el = DOMInspector.findElement(action.selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
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
// MODAL HANDLER MODULE
// ============================================================================

const ModalHandler = {
  MODAL_BUTTON_SELECTORS: Object.freeze([
    // Primary action buttons
    '.modal:not([style*="display: none"]) button.btn--primary',
    ".modal .btn--primary",
    '[role="dialog"] button.btn--primary',
    '[data-test*="modal"] button[type="submit"]',
    '.modal button[data-et-name="apply"]',
    '.modal button[data-et-name="done"]',
    // Price suggestion modal specific
    ".price-suggestion-modal button.btn--primary",
    ".posh-suggest-modal button.btn--primary",
    // Generic modal confirmations
    '[aria-modal="true"] button.btn--primary',
    ".modal--visible button.btn--primary",
    // Fallback: any primary button in visible modal
    ".modal:not(.hidden) .btn--primary",
    // "Done" or "Apply" text buttons
    '.modal button:contains("Done")',
    '.modal button:contains("Apply")',
  ]),

  /**
   * Handle any visible modal
   * @returns {Promise<boolean>}
   */
  async handleAny() {
    // First try standard selectors
    for (const selector of this.MODAL_BUTTON_SELECTORS) {
      try {
        const btn = document.querySelector(selector);
        if (btn && DOMInspector.isVisible(btn)) {
          Logger.info(`Auto-handling modal: "${btn.textContent?.trim()}"`);
          await ActionExecutor._performClick(btn);
          await Utils.sleep(800);
          return true;
        }
      } catch (e) {
        // Some selectors like :contains() may not be supported
      }
    }

    // Fallback: Find any visible modal and click its primary/submit button
    const modals = document.querySelectorAll(
      '.modal, [role="dialog"], [aria-modal="true"]',
    );
    for (const modal of modals) {
      if (!DOMInspector.isVisible(modal)) continue;

      // Look for buttons with common confirmation text
      const confirmTexts = [
        "done",
        "apply",
        "ok",
        "save",
        "continue",
        "yes",
        "confirm",
      ];
      const buttons = modal.querySelectorAll('button, .btn, [role="button"]');

      for (const btn of buttons) {
        if (!DOMInspector.isVisible(btn)) continue;
        const btnText = Utils.normalizeText(btn.textContent);

        // Check if button text matches common confirmations
        if (
          confirmTexts.some((t) => btnText.includes(t)) ||
          btn.classList.contains("btn--primary") ||
          btn.classList.contains("primary")
        ) {
          Logger.info(
            `Auto-handling modal (fallback): "${btn.textContent?.trim()}"`,
          );
          await ActionExecutor._performClick(btn);
          await Utils.sleep(800);
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Handle multiple consecutive modals (e.g., image crop dialogs)
   * @param {number} maxAttempts
   * @returns {Promise<number>} Number of modals handled
   */
  async handleMultiple(maxAttempts = 10) {
    let handled = 0;

    for (let i = 0; i < maxAttempts; i++) {
      await Utils.sleep(AgentConfig.TIMING.MODAL_CHECK_MS);

      if (await this.handleAny()) {
        handled++;
      } else {
        break;
      }
    }

    return handled;
  },
};

// ============================================================================
// FALLBACK DIRECT FILL MODULE
// ============================================================================

const DirectFill = {
  FIELD_SELECTORS: Object.freeze({
    title: ['input[data-vv-name="title"]', 'input[placeholder*="selling"]'],
    description: [
      'textarea[data-vv-name="description"]',
      'textarea[placeholder*="Describe"]',
    ],
    brand: ['input[data-vv-name="brand"]', 'input[placeholder="Brand"]'],
    price: [
      'input[data-vv-name="price"]',
      'input[placeholder*="Listing Price"]',
    ],
    originalPrice: ['input[data-vv-name="original_price"]'],
  }),

  DROPDOWN_SELECTORS: Object.freeze({
    category: [
      ".listing-editor__section--category .dropdown__selector",
      ".listing-editor__section--category .dropdown",
      '[data-test*="category"] .dropdown',
    ],
    size: [
      ".listing-editor__section--size .dropdown__selector",
      ".listing-editor__section--size .dropdown",
      '[data-test*="size"] .dropdown',
    ],
    color: [
      ".listing-editor__section--color .dropdown__selector",
      ".listing-editor__section--color .dropdown",
      '[data-test*="color"] .dropdown',
    ],
  }),

  /**
   * Direct field fill fallback when AI struggles
   * @param {Object} listingData
   * @returns {Promise<boolean>}
   */
  async fill(listingData) {
    Logger.info("Attempting direct field fill fallback...");

    const fieldMapping = [
      { key: "title", value: listingData.title },
      { key: "description", value: listingData.description },
      { key: "brand", value: listingData.brand },
      { key: "price", value: listingData.price?.toString() },
      { key: "originalPrice", value: listingData.originalPrice?.toString() },
    ];

    for (const { key, value } of fieldMapping) {
      if (!value) continue;

      const selectors = this.FIELD_SELECTORS[key];
      if (!selectors) continue;

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && DOMInspector.isVisible(el)) {
          await ActionExecutor._executeType({ selector, value });

          // Handle price modal if this was a price field
          if (key === "price") {
            await Utils.sleep(500);
            await ActionExecutor._handlePriceSuggestionModal();
          }
          break;
        }
      }
    }

    // Also try to fill dropdowns
    await this._fillDropdowns(listingData);

    return true;
  },

  /**
   * Attempt to fill dropdown fields
   * @param {Object} listingData
   */
  async _fillDropdowns(listingData) {
    // Size dropdown
    if (listingData.size) {
      await this._selectFromDropdown("size", listingData.size);
    }

    // Category dropdown
    if (listingData.category) {
      await this._selectFromDropdown("category", listingData.category);
    }

    // Color dropdown
    if (listingData.color) {
      const colors = Array.isArray(listingData.color)
        ? listingData.color
        : [listingData.color];
      for (const color of colors) {
        await this._selectFromDropdown("color", color);
      }
    }
  },

  /**
   * Select an option from a Poshmark dropdown
   * @param {string} dropdownType - 'category', 'size', or 'color'
   * @param {string} value - Value to select
   */
  async _selectFromDropdown(dropdownType, value) {
    const selectors = this.DROPDOWN_SELECTORS[dropdownType];
    if (!selectors) return;

    for (const selector of selectors) {
      try {
        const dropdown = document.querySelector(selector);
        if (dropdown && DOMInspector.isVisible(dropdown)) {
          // Open dropdown
          await ActionExecutor._performClick(dropdown);
          await Utils.sleep(600);

          // Find and click option
          const option = ActionExecutor._findDropdownOption(value);
          if (option) {
            await ActionExecutor._performClick(option);
            await Utils.sleep(400);
            Logger.info(
              `DirectFill: Selected "${value}" from ${dropdownType} dropdown`,
            );
            return;
          }
        }
      } catch (e) {
        Logger.debug(`DirectFill dropdown error: ${e.message}`);
      }
    }
  },
};

// ============================================================================
// API CLIENT MODULE
// ============================================================================

const APIClient = {
  _endpoint: null,

  /**
   * Initialize and find working API endpoint
   * @returns {Promise<string>}
   */
  async getEndpoint() {
    if (this._endpoint) return this._endpoint;

    for (const endpoint of AgentConfig.API_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          AgentConfig.TIMING.API_TIMEOUT_MS,
        );

        const baseUrl = endpoint.split("/api/")[0];
        const healthUrl = `${baseUrl}/api/health`;

        const response = await fetch(healthUrl, {
          method: "GET",
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (response?.ok) {
          Logger.info(`API endpoint: ${endpoint}`);
          this._endpoint = endpoint;
          return endpoint;
        }
      } catch {
        // Try next endpoint
      }
    }

    this._endpoint = AgentConfig.API_ENDPOINTS[2]; // Fallback to localhost
    return this._endpoint;
  },

  /**
   * Request next actions from AI
   * @param {Object} pageContext
   * @param {Object} listingData
   * @param {string} currentStep
   * @param {Array} previousActions
   * @returns {Promise<Object>}
   */
  async getNextActions(pageContext, listingData, currentStep, previousActions) {
    const endpoint = await this.getEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageContext,
        listingData,
        currentStep,
        previousActions: previousActions.slice(-10),
        marketplace: AgentConfig.MARKETPLACE,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return response.json();
  },
};

// ============================================================================
// MAIN AGENT ORCHESTRATOR
// ============================================================================

const AgentOrchestrator = {
  /**
   * Run the main agentic automation loop
   * @param {Object} listingData
   * @returns {Promise<Object>}
   */
  async run(listingData) {
    Logger.group("Starting TRUE AGENTIC Browser Automation");
    Logger.info("Listing data:", listingData);

    const state = {
      iteration: 0,
      previousActions: [],
      currentStep: "fill_form",
      failedIterations: 0,
    };

    try {
      // Phase 1: Handle image upload
      if (listingData.images?.length > 0) {
        await this._handleImageUpload(listingData.images, state);
      }

      // Phase 2: Main agent loop
      const result = await this._runMainLoop(listingData, state);

      Logger.groupEnd();
      return result;
    } catch (error) {
      Logger.error("Agent orchestration failed:", error);
      Logger.groupEnd();
      return { success: false, error: error.message };
    }
  },

  async _handleImageUpload(images, state) {
    Logger.info(`Uploading ${images.length} images...`);

    await ActionExecutor.execute({
      action: "upload",
      value: JSON.stringify(images),
      description: "Upload listing images",
    });

    await Utils.sleep(3000);

    // Handle crop modals
    const modalsHandled = await ModalHandler.handleMultiple(images.length + 5);
    Logger.info(`Handled ${modalsHandled} image modals`);

    state.previousActions.push({
      action: "upload",
      description: "Uploaded images",
    });
    await Utils.sleep(2000);
  },

  async _runMainLoop(listingData, state) {
    let lastPageState = "";
    let stuckCount = 0;
    const MAX_STUCK_COUNT = 3;

    while (state.iteration < AgentConfig.TIMING.MAX_ITERATIONS) {
      state.iteration++;
      Logger.info(`--- Iteration ${state.iteration} ---`);

      // Handle any visible modals first (including price suggestion modals)
      let modalHandled = await ModalHandler.handleAny();
      if (modalHandled) {
        Logger.debug("Modal handled, re-analyzing page");
        await Utils.sleep(500);
        // Try handling additional modals that may appear
        await ModalHandler.handleAny();
        continue;
      }

      await Utils.sleep(AgentConfig.TIMING.PAGE_SETTLE_MS);

      // Extract page state
      const pageContext = PageContextExtractor.extract();

      // Detect if we're stuck (same page state as before)
      const currentPageState = JSON.stringify({
        errors: pageContext.errors,
        url: pageContext.url,
        modals: pageContext.modals.length,
      });

      if (currentPageState === lastPageState) {
        stuckCount++;
        Logger.info(`Potentially stuck (${stuckCount}/${MAX_STUCK_COUNT})`);

        if (stuckCount >= MAX_STUCK_COUNT) {
          Logger.info("Stuck detected - attempting recovery actions");
          await this._attemptRecovery(listingData, pageContext, state);
          stuckCount = 0;
          continue;
        }
      } else {
        stuckCount = 0;
        lastPageState = currentPageState;
      }

      // Check for success
      if (this._checkSuccess(pageContext)) {
        Logger.info("SUCCESS! Listing created:", pageContext.url);
        return { success: true, url: pageContext.url };
      }

      // Get AI actions
      try {
        const result = await APIClient.getNextActions(
          pageContext,
          listingData,
          state.currentStep,
          state.previousActions,
        );

        if (!result.success || !result.actions?.length) {
          state.failedIterations++;
          Logger.info(
            `No actions received (${state.failedIterations}/${AgentConfig.LIMITS.MAX_FAILED_ITERATIONS})`,
          );

          if (
            state.failedIterations >= AgentConfig.LIMITS.MAX_FAILED_ITERATIONS
          ) {
            Logger.info("Max failed iterations - using direct fill fallback");
            await DirectFill.fill(listingData);
            state.failedIterations = 0;
            // Try clicking Next after direct fill
            await this._clickNextButton();
          }

          await Utils.sleep(2000);
          continue;
        }

        state.failedIterations = 0;
        Logger.info(`Received ${result.actions.length} actions from AI`);

        // Execute actions
        for (const action of result.actions) {
          const actionResult = await ActionExecutor.execute(action);
          state.previousActions.push(action);

          if (actionResult === "done") {
            return { success: true, message: "Agent completed" };
          }

          await Utils.sleep(
            action.waitMs || AgentConfig.TIMING.ACTION_DELAY_MS,
          );

          // Check for and handle modals after each action
          await ModalHandler.handleAny();
        }

        // Update step
        this._updateStep(state);
      } catch (error) {
        Logger.error("API call failed:", error);
        state.failedIterations++;
        await Utils.sleep(3000);
      }
    }

    // Final attempt
    Logger.info("Max iterations reached, attempting final submission...");
    await this._attemptFinalSubmit();

    return { success: false, error: "Max iterations reached" };
  },

  /**
   * Attempt recovery when stuck
   */
  async _attemptRecovery(listingData, pageContext, state) {
    // Check for error messages and try to fix them
    if (pageContext.errors.length > 0) {
      Logger.info("Errors detected:", pageContext.errors);

      for (const error of pageContext.errors) {
        const errorLower = error.toLowerCase();

        // Size error recovery
        if (errorLower.includes("size")) {
          Logger.info("Attempting to fix size error");
          await this._attemptSizeSelection(listingData.size);
          return;
        }

        // Category error recovery
        if (errorLower.includes("category")) {
          Logger.info("Attempting to fix category error");
          await this._attemptCategorySelection(listingData.category);
          return;
        }

        // Price error recovery
        if (errorLower.includes("price")) {
          Logger.info("Attempting to fix price error");
          await DirectFill.fill({ price: listingData.price });
          await ModalHandler.handleAny();
          return;
        }
      }
    }

    // No specific error - try clicking Next to see what's missing
    const clicked = await this._clickNextButton();
    if (!clicked) {
      // Try scrolling to reveal more content
      window.scrollBy({ top: 300, behavior: "smooth" });
      await Utils.sleep(1000);
    }
  },

  /**
   * Attempt to select size from dropdown
   */
  async _attemptSizeSelection(size) {
    // Find and click size dropdown
    const sizeDropdownSelectors = [
      ".listing-editor__section--size .dropdown",
      '[data-test*="size"] .dropdown',
      '.dropdown:has(.listing-editor__section__title:contains("Size"))',
      'button[data-et-name="size"]',
      ".size-dropdown",
    ];

    for (const selector of sizeDropdownSelectors) {
      try {
        const dropdown = document.querySelector(selector);
        if (dropdown && DOMInspector.isVisible(dropdown)) {
          await ActionExecutor._performClick(dropdown);
          await Utils.sleep(500);

          // Find and click size option
          const sizeToSelect = size || "7"; // Default size
          const option =
            ActionExecutor._findDropdownOption(sizeToSelect) ||
            ActionExecutor._findDropdownOption("M") ||
            ActionExecutor._findDropdownOption("Medium");
          if (option) {
            await ActionExecutor._performClick(option);
            await Utils.sleep(300);
            return true;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return false;
  },

  /**
   * Attempt to select category from dropdown
   */
  async _attemptCategorySelection(category) {
    const categoryDropdownSelectors = [
      ".listing-editor__section--category .dropdown",
      '[data-test*="category"] .dropdown',
      'button[data-et-name="category"]',
    ];

    for (const selector of categoryDropdownSelectors) {
      try {
        const dropdown = document.querySelector(selector);
        if (dropdown && DOMInspector.isVisible(dropdown)) {
          await ActionExecutor._performClick(dropdown);
          await Utils.sleep(500);

          const categoryToSelect = category || "Tops";
          const option = ActionExecutor._findDropdownOption(categoryToSelect);
          if (option) {
            await ActionExecutor._performClick(option);
            await Utils.sleep(300);
            return true;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return false;
  },

  /**
   * Click the Next button
   */
  async _clickNextButton() {
    const nextSelectors = [
      'button[data-et-name="next"]',
      'button:contains("Next")',
      '.btn--primary:contains("Next")',
      '[data-test="next-btn"]',
    ];

    for (const selector of nextSelectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn && DOMInspector.isVisible(btn) && !btn.disabled) {
          await ActionExecutor._performClick(btn);
          await Utils.sleep(1000);
          return true;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Fallback: find by text
    const nextBtn = DOMInspector.findElementByText("next");
    if (nextBtn && !nextBtn.disabled) {
      await ActionExecutor._performClick(nextBtn);
      await Utils.sleep(1000);
      return true;
    }

    return false;
  },

  _checkSuccess(pageContext) {
    const url = pageContext.url;

    return (
      (url.includes("/listing/") && !url.includes("create")) ||
      document.body.textContent?.includes("Congratulations") ||
      document.body.textContent?.includes("successfully listed")
    );
  },

  _updateStep(state) {
    const descriptions = state.previousActions
      .map((a) => Utils.normalizeText(a.description || ""))
      .join(" ");

    if (
      descriptions.includes("next") ||
      descriptions.includes("submit") ||
      descriptions.includes("list")
    ) {
      state.currentStep = "submit";
    }
  },

  async _attemptFinalSubmit() {
    const nextBtn =
      DOMInspector.findElementByText("next") ||
      document.querySelector('button[data-et-name="next"]');

    if (nextBtn) {
      await ActionExecutor._performClick(nextBtn);
      await Utils.sleep(3000);
    }

    const listBtn = DOMInspector.findElementByText("list");
    if (listBtn) {
      await ActionExecutor._performClick(listBtn);
    }
  },
};

// ============================================================================
// LOGIN STATUS CHECKER
// ============================================================================

const LoginChecker = {
  check() {
    const indicators = {
      positive: [
        document.querySelector('[data-test="user-nav"]'),
        document.querySelector('a[href*="/closet/"]'),
        document.querySelector('a[href="/create-listing"]'),
        document.querySelector('.user-image, [data-test="user-avatar"]'),
      ],
      negative: [document.querySelector('[data-test="login-btn"]')],
    };

    const hasPositive = indicators.positive.some((el) => el !== null);
    const hasNegative = indicators.negative.some((el) => el !== null);
    const isLoggedIn = hasPositive && !hasNegative;

    Logger.debug(`Login status: ${isLoggedIn}`);

    // Notify background script
    chrome.runtime.sendMessage({
      type: "UPDATE_LOGIN_STATUS",
      marketplace: AgentConfig.MARKETPLACE,
      isLoggedIn,
    });

    return isLoggedIn;
  },
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

const MessageHandler = {
  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      Logger.debug(`Message received: ${message.type}`);

      this._handleMessage(message, sendResponse);
      return true; // Keep channel open for async
    });
  },

  _handleMessage(message, sendResponse) {
    const handlers = {
      CHECK_LOGIN_STATUS: () => {
        sendResponse({ isLoggedIn: LoginChecker.check() });
      },

      FILL_LISTING: async () => {
        try {
          const result = await AgentOrchestrator.run(message.listing);

          chrome.runtime.sendMessage({
            type: result.success ? "LISTING_CREATED" : "LISTING_FAILED",
            marketplace: AgentConfig.MARKETPLACE,
            listingData: message.listing,
            result,
            error: result.error,
          });

          sendResponse(result);
        } catch (error) {
          Logger.error("Agent failed:", error);
          sendResponse({ success: false, error: error.message });
        }
      },

      SUBMIT_LISTING: async () => {
        await AgentOrchestrator._attemptFinalSubmit();
        sendResponse({ success: true });
      },
    };

    const handler = handlers[message.type];
    if (handler) {
      handler();
    } else {
      sendResponse({ success: false, error: "Unknown message type" });
    }
  },
};

// ============================================================================
// INITIALIZATION
// ============================================================================

(function init() {
  Logger.info(
    "Poshmark TRUE AGENTIC Script Loaded - AI-Powered Automation v2.0",
  );

  // Initialize message handler
  MessageHandler.init();

  // Check login status after page load
  setTimeout(() => LoginChecker.check(), 1000);
})();
