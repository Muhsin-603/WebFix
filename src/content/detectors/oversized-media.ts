import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';

export class OversizedMediaDetector implements Detector {
  id = 'oversized-media';
  name = 'Oversized Media Detector';

  private mediaTags = ['video', 'iframe', 'embed', 'object', 'canvas'];

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    const selector = this.mediaTags.join(', ');
    const mediaElements = context.document.querySelectorAll(selector);

    mediaElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (!DOMAnalyzer.isVisible(htmlEl)) return;

      const rect = htmlEl.getBoundingClientRect();
      if (rect.width > vpWidth + VIEWPORT_TOLERANCE_PX) {
        const tagName = htmlEl.tagName.toLowerCase();
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(htmlEl);
        const style = window.getComputedStyle(htmlEl);

        results.push({
          id: `det-media-${wfxId}`,
          detectorId: this.id,
          type: 'oversized-media',
          severity: rect.width > vpWidth + 100 ? 'high' : 'medium',
          confidence: 0.9,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: tagName,
          description: `Embedded <${tagName}> element width (${Math.round(rect.width)}px) exceeds viewport width (${vpWidth}px)`,
          suggestedFixIds: [`fix-media-${wfxId}`],
          metrics: {
            elementWidth: Math.round(rect.width),
            elementHeight: Math.round(rect.height),
            viewportWidth: vpWidth,
            computedStyles: {
              width: style.width,
              height: style.height,
            },
          },
        });
      }
    });

    return results;
  }
}
