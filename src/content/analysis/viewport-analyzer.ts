import { ViewportDimensions } from '../../shared/types/index.js';

export class ViewportAnalyzer {
  static getDimensions(doc: Document = document, win: Window = window): ViewportDimensions {
    const docEl = doc.documentElement;
    const body = doc.body;

    const width = win.innerWidth || docEl.clientWidth || (body ? body.clientWidth : 0);
    const height = win.innerHeight || docEl.clientHeight || (body ? body.clientHeight : 0);

    const docElScrollWidth = docEl ? docEl.scrollWidth : 0;
    const bodyScrollWidth = body ? body.scrollWidth : 0;
    const scrollWidth = Math.max(docElScrollWidth, bodyScrollWidth, width);

    const docElScrollHeight = docEl ? docEl.scrollHeight : 0;
    const bodyScrollHeight = body ? body.scrollHeight : 0;
    const scrollHeight = Math.max(docElScrollHeight, bodyScrollHeight, height);

    return {
      width,
      height,
      scrollWidth,
      scrollHeight,
    };
  }

  static hasHorizontalPageOverflow(viewport: ViewportDimensions, tolerancePx = 3): boolean {
    return viewport.scrollWidth - viewport.width > tolerancePx;
  }
}
