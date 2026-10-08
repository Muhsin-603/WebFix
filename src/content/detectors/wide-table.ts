import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';
import { Detector } from './detector.js';
import { DOMAnalyzer } from '../analysis/dom-analyzer.js';
import { VIEWPORT_TOLERANCE_PX, TABLE_WRAPPER_CLASS } from '../../shared/constants/index.js';

export class WideTableDetector implements Detector {
  id = 'wide-table';
  name = 'Wide Table Detector';

  detect(context: AnalysisContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const vpWidth = context.viewport.width;

    const tables = context.document.querySelectorAll('table');
    tables.forEach((table) => {
      if (!DOMAnalyzer.isVisible(table)) return;

      // Check if table is already wrapped in our webfix wrapper or any scrollable container
      const parent = table.parentElement;
      if (parent) {
        if (parent.classList.contains(TABLE_WRAPPER_CLASS)) {
          return;
        }
        const parentStyle = window.getComputedStyle(parent);
        if (['auto', 'scroll'].includes(parentStyle.overflowX)) {
          return;
        }
      }

      const rect = table.getBoundingClientRect();
      const parentWidth = parent ? parent.getBoundingClientRect().width : vpWidth;

      // Table exceeds viewport or container
      const exceedsViewport = rect.width > vpWidth + VIEWPORT_TOLERANCE_PX;
      const exceedsParent = parent && rect.width > parentWidth + VIEWPORT_TOLERANCE_PX;

      if (exceedsViewport || exceedsParent) {
        const wfxId = DOMAnalyzer.getOrAssignWebFixId(table);
        const style = window.getComputedStyle(table);

        results.push({
          id: `det-table-${wfxId}`,
          detectorId: this.id,
          type: 'wide-table',
          severity: exceedsViewport ? 'high' : 'medium',
          confidence: 0.95,
          elementSelector: `[data-webfix-id="${wfxId}"]`,
          elementTagName: 'table',
          description: `Table width (${Math.round(rect.width)}px) exceeds ${exceedsViewport ? 'viewport' : 'container'} width (${Math.round(exceedsViewport ? vpWidth : parentWidth)}px) without horizontal scroll`,
          suggestedFixIds: [`fix-table-${wfxId}`],
          metrics: {
            elementWidth: Math.round(rect.width),
            elementHeight: Math.round(rect.height),
            viewportWidth: vpWidth,
            computedStyles: {
              width: style.width,
            },
          },
        });
      }
    });

    return results;
  }
}
