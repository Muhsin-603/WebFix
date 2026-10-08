import { TABLE_WRAPPER_CLASS, ATTR_WEBFIX_MODIFIED, ATTR_WEBFIX_IGNORED } from '../../shared/constants/index.js';
import { FixChangeRecord } from '../../shared/types/index.js';
import { logger } from '../diagnostics/logger.js';

export class DOMFixEngine {
  private doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
  }

  wrapTableInScrollContainer(fixId: string, tableSelector: string): FixChangeRecord | null {
    const table = this.doc.querySelector(tableSelector) as HTMLElement;
    if (!table || !table.parentNode) {
      logger.warn(`Cannot wrap table: element not found for selector ${tableSelector}`);
      return null;
    }

    const wrapperId = `webfix-wrapper-${fixId}`;
    const wrapper = this.doc.createElement('div');
    wrapper.id = wrapperId;
    wrapper.className = TABLE_WRAPPER_CLASS;
    wrapper.setAttribute(ATTR_WEBFIX_IGNORED, 'true');
    wrapper.setAttribute('data-webfix-fix-id', fixId);

    // Apply inline style to wrapper to guarantee horizontal scrolling behavior
    wrapper.style.maxWidth = '100%';
    wrapper.style.overflowX = 'auto';
    wrapper.style.webkitOverflowScrolling = 'touch';
    wrapper.style.display = 'block';
    wrapper.style.margin = '1em 0';

    // Insert wrapper before table, then move table inside wrapper
    const parent = table.parentNode;
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    table.setAttribute(ATTR_WEBFIX_MODIFIED, fixId);

    return {
      fixId,
      type: 'dom-wrapper',
      elementSelector: tableSelector,
      wrapperElementId: wrapperId,
    };
  }

  unwrapTable(wrapperId: string, fixId: string): boolean {
    const wrapper = this.doc.getElementById(wrapperId);
    if (!wrapper || !wrapper.parentNode) {
      return false;
    }

    const parent = wrapper.parentNode;
    // Move all children back out
    while (wrapper.firstChild) {
      const child = wrapper.firstChild as HTMLElement;
      if (child.removeAttribute) {
        child.removeAttribute(ATTR_WEBFIX_MODIFIED);
      }
      parent.insertBefore(child, wrapper);
    }

    parent.removeChild(wrapper);
    return true;
  }

  revertChange(record: FixChangeRecord): boolean {
    if (record.type === 'dom-wrapper' && record.wrapperElementId) {
      return this.unwrapTable(record.wrapperElementId, record.fixId);
    }
    return false;
  }
}
