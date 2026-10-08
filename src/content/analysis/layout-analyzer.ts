export interface ElementLayoutMetrics {
  rect: DOMRect;
  computedStyle: CSSStyleDeclaration;
  isFixed: boolean;
  isAbsolute: boolean;
  parsedWidthPx: number | null;
  parsedMinWidthPx: number | null;
  parsedMaxWidthPx: number | null;
  hasSuspiciousFixedWidth: boolean;
  overflowsViewportX: boolean;
  overflowsViewportY: boolean;
  isOutOfBoundsLeft: boolean;
  isOutOfBoundsRight: boolean;
}

export class LayoutAnalyzer {
  static getMetrics(el: HTMLElement, viewportWidth: number, viewportHeight: number, win: Window = window): ElementLayoutMetrics {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);

    const isFixed = style.position === 'fixed';
    const isAbsolute = style.position === 'absolute';

    const parsePx = (val: string): number | null => {
      if (!val || val === 'auto' || val === 'none' || val.endsWith('%')) return null;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    };

    const parsedWidthPx = parsePx(style.width);
    const parsedMinWidthPx = parsePx(style.minWidth);
    const parsedMaxWidthPx = parsePx(style.maxWidth);

    // Suspicious if explicit fixed width > viewport width, or > 800px on small screens
    const widthExceedsViewport = (parsedWidthPx !== null && parsedWidthPx > viewportWidth + 3) ||
                                 (parsedMinWidthPx !== null && parsedMinWidthPx > viewportWidth + 3);

    const overflowsViewportX = rect.right > viewportWidth + 3 || rect.left < -3;
    const overflowsViewportY = rect.bottom > viewportHeight + 1000; // Only extreme bounds
    const isOutOfBoundsLeft = rect.right < 0 || rect.left < -10;
    const isOutOfBoundsRight = rect.left > viewportWidth;

    return {
      rect,
      computedStyle: style,
      isFixed,
      isAbsolute,
      parsedWidthPx,
      parsedMinWidthPx,
      parsedMaxWidthPx,
      hasSuspiciousFixedWidth: widthExceedsViewport,
      overflowsViewportX,
      overflowsViewportY,
      isOutOfBoundsLeft,
      isOutOfBoundsRight,
    };
  }
}
