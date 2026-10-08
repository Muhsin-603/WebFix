import { DetectionResult, ViewportDimensions } from '../../shared/types/index.js';
import { ViewportAnalyzer } from '../analysis/viewport-analyzer.js';
import { VIEWPORT_TOLERANCE_PX } from '../../shared/constants/index.js';
import { logger } from '../diagnostics/logger.js';

export interface ValidationResult {
  valid: boolean;
  improved: boolean;
  message: string;
  previousWidth?: number;
  currentWidth?: number;
}

export class FixValidator {
  static validate(
    detection: DetectionResult,
    doc: Document = document,
    win: Window = window
  ): ValidationResult {
    const el = doc.querySelector(detection.elementSelector) as HTMLElement;
    if (!el) {
      logger.warn(`Validation: Target element ${detection.elementSelector} no longer exists`);
      return {
        valid: false,
        improved: false,
        message: 'Target element could not be found in the DOM',
      };
    }

    const currentVp: ViewportDimensions = ViewportAnalyzer.getDimensions(doc, win);
    const rect = el.getBoundingClientRect();
    const prevWidth = detection.metrics.elementWidth || 0;
    const currentWidth = Math.round(rect.width);

    switch (detection.type) {
      case 'horizontal-overflow':
      case 'fixed-width':
      case 'oversized-image':
      case 'oversized-media': {
        const fitsInViewport = currentWidth <= currentVp.width + VIEWPORT_TOLERANCE_PX;
        const improved = prevWidth > 0 ? currentWidth < prevWidth : fitsInViewport;

        return {
          valid: fitsInViewport,
          improved,
          message: fitsInViewport
            ? `Element scaled cleanly to ${currentWidth}px (fits in ${currentVp.width}px viewport)`
            : `Element width is ${currentWidth}px, still exceeding ${currentVp.width}px viewport`,
          previousWidth: prevWidth,
          currentWidth,
        };
      }

      case 'wide-table': {
        // For tables, check if parent is scrollable wrapper
        const parent = el.parentElement;
        const isWrapped = parent && parent.classList.contains('webfix-table-wrapper');
        return {
          valid: !!isWrapped,
          improved: !!isWrapped,
          message: isWrapped
            ? 'Table safely enclosed in scrollable container'
            : 'Table wrapper not detected',
        };
      }

      case 'viewport-overflow':
      case 'misplaced-button': {
        const boundsOk =
          rect.left >= -VIEWPORT_TOLERANCE_PX &&
          rect.right <= currentVp.width + VIEWPORT_TOLERANCE_PX;
        return {
          valid: boundsOk,
          improved: boundsOk,
          message: boundsOk
            ? `Element now within visible screen bounds [L:${Math.round(rect.left)}, R:${Math.round(rect.right)}]`
            : `Element still extends out of bounds [L:${Math.round(rect.left)}, R:${Math.round(rect.right)}]`,
        };
      }

      default:
        return {
          valid: true,
          improved: true,
          message: 'Fix verified',
        };
    }
  }
}
