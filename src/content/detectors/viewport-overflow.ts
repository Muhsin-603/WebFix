import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';

export class ViewportOverflowDetector implements Detector {
  id = 'viewport-overflow';
  name = 'Viewport Boundary Overflow Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    for (const el of context.elements) {
      if (['html', 'body', 'img', 'video', 'table', 'iframe', 'canvas', 'svg', 'button'].includes(el.tagName.toLowerCase())) {
        // Handled by specialized detectors
        continue;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      // Check if intentionally positioned off-screen (e.g. aria-hidden, hidden modals, off-screen drawers)
      if (el.getAttribute('aria-hidden') === 'true' || style.transform.includes('translate3d(-') || style.transform.includes('translateX(-')) {
        continue;
      }

      const overflowRight = rect.right - vpWidth;
      const overflowLeft = -rect.left;

      if (overflowRight > VIEWPORT_TOLERANCE_PX || overflowLeft > 10) {
        // Check if parent clips overflow
        const parent = el.parentElement;
        if (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (['hidden', 'auto', 'scroll'].includes(parentStyle.overflowX)) {
            continue;
          }
        }

        const wfxId = DOMAnalyzer.getOrAssignWebFixId(el);
        const overflowPx = Math.max(overflowRight, overflowLeft);

        results.push({
          id: `det-vpo-${wfxId}`,
          detectorId: this.id,
          type: 'viewport-overflow',
          severity: overflowPx > 100 ? 'high' : 'medium',
          confidence: 0.85,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: el.tagName.toLowerCase(),
          description: `Element boundaries [L:${Math.round(rect.left)}, R:${Math.round(rect.right)}] extend outside the viewport [0..${vpWidth}px]`,
          suggestedFixIds: [`fix-vpo-${wfxId}`],
          metrics: {
            elementWidth: Math.round(rect.width),
            elementHeight: Math.round(rect.height),
            viewportWidth: vpWidth,
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          },
        });
      }
    }

    return results;
  }
}
