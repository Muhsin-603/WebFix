import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';

export class HorizontalOverflowDetector implements Detector {
  id = 'horizontal-overflow';
  name = 'Horizontal Overflow Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;
    const scrollWidth = context.viewport.scrollWidth;

    // First verify if page actually has horizontal overflow
    if (scrollWidth - vpWidth <= VIEWPORT_TOLERANCE_PX) {
      return results;
    }

    // Find visible elements extending beyond viewport width
    for (const el of context.elements) {
      if (el === context.document.body || el === context.document.documentElement) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const overflowAmount = rect.right - vpWidth;

      if (overflowAmount > VIEWPORT_TOLERANCE_PX) {
        // Exclude elements whose parent already has overflow-x: auto/scroll or hidden
        const parent = el.parentElement;
        if (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (['auto', 'scroll', 'hidden'].includes(parentStyle.overflowX)) {
            continue;
          }
        }

        const selector = DOMAnalyzer.getFriendlySelector(el);
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(el);

        const confidence = Math.min(0.95, 0.65 + (overflowAmount / vpWidth) * 0.3);
        const severity = overflowAmount > 100 ? 'high' : overflowAmount > 30 ? 'medium' : 'low';

        results.push({
          id: `det-hov-${wfxId}`,
          detectorId: this.id,
          type: 'horizontal-overflow',
          severity,
          confidence,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: el.tagName.toLowerCase(),
          description: `Element extends ${Math.round(overflowAmount)}px beyond viewport width (${Math.round(rect.right)}px vs ${vpWidth}px)`,
          suggestedFixIds: [`fix-overflow-${wfxId}`],
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
