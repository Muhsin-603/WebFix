import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { BUTTON_OVERFLOW_TOLERANCE_PX } from '../../shared/constants/index.js';

export class MisplacedButtonDetector implements Detector {
  id = 'misplaced-button';
  name = 'Misplaced Button Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    const buttons = context.document.querySelectorAll<HTMLElement>(
      'button, a[role="button"], input[type="button"], input[type="submit"], .btn, .button'
    );

    buttons.forEach((btn) => {
      if (!DOMAnalyzer.isVisible(btn)) return;

      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);

      const isOffscreenRight = rect.right > vpWidth + BUTTON_OVERFLOW_TOLERANCE_PX;
      const isOffscreenLeft = rect.left < -BUTTON_OVERFLOW_TOLERANCE_PX;
      const isExtremePosition =
        (style.position === 'absolute' || style.position === 'fixed') &&
        (parseFloat(style.left) > vpWidth || parseFloat(style.right) < -50);

      // Multiple signals check
      if (isOffscreenRight || isOffscreenLeft || isExtremePosition) {
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(btn);

        let signalDesc = '';
        if (isOffscreenRight) signalDesc += `extends ${Math.round(rect.right - vpWidth)}px past right edge; `;
        if (isOffscreenLeft) signalDesc += `positioned ${Math.round(Math.abs(rect.left))}px past left edge; `;
        if (isExtremePosition) signalDesc += `extreme absolute/fixed offset; `;

        results.push({
          id: `det-btn-${wfxId}`,
          detectorId: this.id,
          type: 'misplaced-button',
          severity: 'medium',
          confidence: 0.75, // Conservative confidence
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: btn.tagName.toLowerCase(),
          description: `Button is clipped or misplaced outside viewport: ${signalDesc.trim()}`,
          suggestedFixIds: [`fix-btn-${wfxId}`],
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
            computedStyles: {
              position: style.position,
              left: style.left,
              right: style.right,
              top: style.top,
            },
          },
        });
      }
    });

    return results;
  }
}
