import { ATTR_WEBFIX_ID, ATTR_WEBFIX_IGNORED, STYLE_ELEMENT_ID, STATUS_BADGE_ID } from '../../shared/constants/index.js';

let elementIdCounter = 1;

export class DOMAnalyzer {
  static isVisible(el: HTMLElement, win: Window = window): boolean {
    if (!el || !el.ownerDocument) return false;
    if (el.id === STYLE_ELEMENT_ID || el.id === STATUS_BADGE_ID) return false;
    if (el.hasAttribute(ATTR_WEBFIX_IGNORED)) return false;

    // Check tag names
    const tagName = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'meta', 'link', 'head', 'title'].includes(tagName)) {
      return false;
    }

    try {
      const style = win.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    } catch {
      return false;
    }

    const rect = el.getBoundingClientRect();
    // Element must have some dimension unless it's body/html
    if (rect.width === 0 && rect.height === 0 && tagName !== 'body' && tagName !== 'html') {
      return false;
    }

    return true;
  }

  static getOrAssignWebFixId(el: HTMLElement): string {
    let id = el.getAttribute(ATTR_WEBFIX_ID);
    if (!id) {
      id = `wfx-${elementIdCounter++}`;
      el.setAttribute(ATTR_WEBFIX_ID, id);
    }
    return id;
  }

  static getFriendlySelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    if (el.id) {
      return `${tag}#${el.id}`;
    }
    const classList = Array.from(el.classList).filter(
      (c) => !c.startsWith('webfix-') && !c.includes(':')
    );
    if (classList.length > 0) {
      return `${tag}.${classList.slice(0, 2).join('.')}`;
    }
    const wfxId = el.getAttribute(ATTR_WEBFIX_ID);
    if (wfxId) {
      return `${tag}[${ATTR_WEBFIX_ID}="${wfxId}"]`;
    }
    return tag;
  }

  static collectVisibleElements(root: HTMLElement = document.body, win: Window = window): HTMLElement[] {
    if (!root) return [];
    const elements: HTMLElement[] = [];
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node: Node) => {
        const el = node as HTMLElement;
        if (!el.tagName) return NodeFilter.FILTER_REJECT;
        if (el.id === STYLE_ELEMENT_ID || el.id === STATUS_BADGE_ID || el.hasAttribute(ATTR_WEBFIX_IGNORED)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.currentNode as HTMLElement;
    while (currentNode) {
      if (this.isVisible(currentNode, win)) {
        this.getOrAssignWebFixId(currentNode);
        elements.push(currentNode);
      }
      currentNode = walker.nextNode() as HTMLElement;
    }

    return elements;
  }
}
