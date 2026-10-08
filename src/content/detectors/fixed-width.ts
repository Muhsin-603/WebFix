import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';

export class FixedWidthDetector implements Detector {
  id = 'fixed-width';
  name = 'Fixed-Width Container Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    for (const el of context.elements) {
      if (['html', 'body', 'img', 'video', 'table', 'iframe', 'canvas', 'svg'].includes(el.tagName.toLowerCase())) {
        continue;
      }

      const style = window.getComputedStyle(el);
      const widthVal = style.width;
      const minWidthVal = style.minWidth;

      const parsePx = (val: string): number | null => {
        if (!val || val === 'auto' || val === 'none' || val.endsWith('%')) return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      const widthPx = parsePx(widthVal);
      const minWidthPx = parsePx(minWidthVal);

      // Check if explicit fixed width exceeds viewport
      const exceedsVp = (widthPx !== null && widthPx > vpWidth + VIEWPORT_TOLERANCE_PX) ||
                        (minWidthPx !== null && minWidthPx > vpWidth + VIEWPORT_TOLERANCE_PX);

      if (exceedsVp) {
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(el);
        const rect = el.getBoundingClientRect();
        const effectiveWidth = Math.max(widthPx ?? 0, minWidthPx ?? 0, rect.width);

        const severity = effectiveWidth > vpWidth + 100 ? 'high' : 'medium';
        const confidence = 0.9;

        results.push({
          id: `det-fw-${wfxId}`,
          detectorId: this.id,
          type: 'fixed-width',
          severity,
          confidence,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: el.tagName.toLowerCase(),
          description: `Container has rigid fixed width (${Math.round(effectiveWidth)}px) exceeding viewport width (${vpWidth}px)`,
          suggestedFixIds: [`fix-fw-${wfxId}`],
          metrics: {
            elementWidth: Math.round(effectiveWidth),
            elementHeight: Math.round(rect.height),
            viewportWidth: vpWidth,
            computedStyles: {
              width: widthVal,
              minWidth: minWidthVal,
              maxWidth: style.maxWidth,
            },
          },
        });
      }
    }

    return results;
  }
}
