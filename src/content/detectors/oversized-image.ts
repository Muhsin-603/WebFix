import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';

export class OversizedImageDetector implements Detector {
  id = 'oversized-image';
  name = 'Oversized Image Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    const images = context.document.querySelectorAll('img');
    images.forEach((img) => {
      if (!DOMAnalyzer.isVisible(img as HTMLElement)) return;

      const rect = img.getBoundingClientRect();
      const parent = img.parentElement;
      const isParentScrollable = parent && ['auto', 'scroll'].includes(window.getComputedStyle(parent).overflowX);

      // If parent is intentionally scrollable image gallery/viewer, ignore
      if (isParentScrollable) return;

      const renderedWidth = rect.width;
      const naturalWidth = (img as HTMLImageElement).naturalWidth;

      if (renderedWidth > vpWidth + VIEWPORT_TOLERANCE_PX || (renderedWidth === 0 && naturalWidth > vpWidth)) {
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(img as HTMLElement);
        const style = window.getComputedStyle(img);

        results.push({
          id: `det-img-${wfxId}`,
          detectorId: this.id,
          type: 'oversized-image',
          severity: renderedWidth > vpWidth + 80 ? 'high' : 'medium',
          confidence: 0.95,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: 'img',
          description: `Image rendered width (${Math.round(renderedWidth)}px) exceeds viewport width (${vpWidth}px)`,
          suggestedFixIds: [`fix-img-${wfxId}`],
          metrics: {
            elementWidth: Math.round(renderedWidth),
            elementHeight: Math.round(rect.height),
            viewportWidth: vpWidth,
            computedStyles: {
              width: style.width,
              maxWidth: style.maxWidth,
              height: style.height,
            },
          },
        });
      }
    });

    return results;
  }
}
