import { STYLE_ELEMENT_ID, ATTR_WEBFIX_MODIFIED } from '../../shared/constants/index.js';
import { FixChangeRecord } from '../../shared/types/index.js';
import { logger } from '../diagnostics/logger.js';

export class CSSFixEngine {
  private styleRules: Map<string, string> = new Map();
  private doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
  }

  private getOrCreateStyleElement(): HTMLStyleElement {
    let styleEl = this.doc.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = this.doc.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      styleEl.setAttribute('type', 'text/css');
      (this.doc.head || this.doc.documentElement).appendChild(styleEl);
    }
    return styleEl;
  }

  applyRule(fixId: string, selector: string, rules: Record<string, string>): FixChangeRecord {
    const styleBlock = Object.entries(rules)
      .map(([k, v]) => `  ${k}: ${v} !important;`)
      .join('\n');

    const cssText = `/* WebFix rule ${fixId} */\n${selector} {\n${styleBlock}\n}`;
    this.styleRules.set(fixId, cssText);
    this.render();

    // Mark element as modified
    try {
      const el = this.doc.querySelector(selector) as HTMLElement;
      if (el) {
        el.setAttribute(ATTR_WEBFIX_MODIFIED, fixId);
      }
    } catch (e) {
      logger.warn(`Could not set modified attribute on ${selector}`, e);
    }

    return {
      fixId,
      type: 'css-rule',
      elementSelector: selector,
      cssRule: cssText,
    };
  }

  removeRule(fixId: string): boolean {
    if (this.styleRules.has(fixId)) {
      this.styleRules.delete(fixId);
      this.render();

      // Clean up modified attribute
      try {
        const el = this.doc.querySelector(`[${ATTR_WEBFIX_MODIFIED}="${fixId}"]`);
        if (el) {
          el.removeAttribute(ATTR_WEBFIX_MODIFIED);
        }
      } catch (e) {
        logger.warn(`Could not remove modified attribute for ${fixId}`, e);
      }

      return true;
    }
    return false;
  }

  clear(): void {
    this.styleRules.clear();
    const styleEl = this.doc.getElementById(STYLE_ELEMENT_ID);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    const modifiedElements = this.doc.querySelectorAll(`[${ATTR_WEBFIX_MODIFIED}]`);
    modifiedElements.forEach((el) => el.removeAttribute(ATTR_WEBFIX_MODIFIED));
  }

  private render(): void {
    const styleEl = this.getOrCreateStyleElement();
    const allCss = Array.from(this.styleRules.values()).join('\n\n');
    styleEl.textContent = allCss;
  }
}
