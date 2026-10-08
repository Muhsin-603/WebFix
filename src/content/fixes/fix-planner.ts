import { DetectionResult, ProposedFix, AnalysisContext, FixResult } from '../../shared/types/index.js';
import { CSSFixEngine } from './css-fix-engine.js';
import { DOMFixEngine } from './dom-fix-engine.js';
import { logger } from '../diagnostics/logger.js';

export class FixPlanner {
  private cssEngine: CSSFixEngine;
  private domEngine: DOMFixEngine;

  constructor(cssEngine: CSSFixEngine, domEngine: DOMFixEngine) {
    this.cssEngine = cssEngine;
    this.domEngine = domEngine;
  }

  planFixes(detections: DetectionResult[]): ProposedFix[] {
    return detections.map((det) => this.createProposal(det));
  }

  private createProposal(det: DetectionResult): ProposedFix {
    switch (det.type) {
      case 'horizontal-overflow':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Constrain horizontal overflow',
          description: 'Apply max-width: 100% and width: auto to prevent page cutoff',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'css',
          applied: false,
        };

      case 'fixed-width':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Make fixed-width container fluid',
          description: 'Allow container to adapt to screen width (max-width: 100%, min-width: 0)',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'css',
          applied: false,
        };

      case 'oversized-image':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Scale image responsively',
          description: 'Set max-width: 100% and preserve natural aspect ratio',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'css',
          applied: false,
        };

      case 'oversized-media':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Fit media inside viewport',
          description: 'Constrain video/embed width to 100% while maintaining height ratio',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'css',
          applied: false,
        };

      case 'wide-table':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Enable table horizontal scrolling',
          description: 'Wrap table in touch-friendly scrollable container without altering data',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'dom',
          applied: false,
        };

      case 'viewport-overflow':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Contain overflowing boundaries',
          description: 'Clamp element within viewport edges (max-width: 100%, overflow: clip)',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: true,
          strategy: 'css',
          applied: false,
        };

      case 'misplaced-button':
        return {
          id: det.suggestedFixIds[0] || `fix-${det.id}`,
          detectionId: det.id,
          detectorId: det.detectorId,
          type: det.type,
          title: 'Re-align clipped button',
          description: 'Clamp button position inside visible boundaries (Manual review recommended)',
          targetSelector: det.elementSelector,
          targetTagName: det.elementTagName,
          isSafeAutomatic: false, // Conservative: requires user confirmation
          strategy: 'css',
          applied: false,
        };
    }
  }

  applyFix(proposal: ProposedFix, detection: DetectionResult, _context: AnalysisContext): FixResult {
    try {
      logger.info(`Applying fix ${proposal.id} (${proposal.type}) for ${proposal.targetSelector}`);

      if (proposal.strategy === 'dom' && proposal.type === 'wide-table') {
        const record = this.domEngine.wrapTableInScrollContainer(proposal.id, proposal.targetSelector);
        if (!record) {
          throw new Error(`Failed to wrap table at ${proposal.targetSelector}`);
        }
        return {
          fixId: proposal.id,
          success: true,
          changes: [record],
          timestamp: Date.now(),
        };
      }

      // CSS strategy
      let cssRules: Record<string, string> = {};
      switch (proposal.type) {
        case 'horizontal-overflow':
          cssRules = {
            'max-width': '100%',
            'width': 'auto',
            'box-sizing': 'border-box',
          };
          break;
        case 'fixed-width':
          cssRules = {
            'max-width': '100%',
            'width': '100%',
            'min-width': '0',
            'box-sizing': 'border-box',
          };
          break;
        case 'oversized-image':
          cssRules = {
            'max-width': '100%',
            'height': 'auto',
            'object-fit': 'contain',
          };
          break;
        case 'oversized-media':
          cssRules = {
            'max-width': '100%',
            'box-sizing': 'border-box',
          };
          break;
        case 'viewport-overflow':
          cssRules = {
            'max-width': '100%',
            'margin-left': '0',
            'margin-right': '0',
            'box-sizing': 'border-box',
          };
          break;
        case 'misplaced-button':
          cssRules = {
            'max-width': '100%',
            'right': 'auto',
            'left': '0',
            'position': 'relative',
          };
          break;
      }

      const record = this.cssEngine.applyRule(proposal.id, proposal.targetSelector, cssRules);
      return {
        fixId: proposal.id,
        success: true,
        changes: [record],
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Error applying fix ${proposal.id}: ${errorMsg}`);
      return {
        fixId: proposal.id,
        success: false,
        error: errorMsg,
        changes: [],
        timestamp: Date.now(),
      };
    }
  }

  revertFix(result: FixResult): boolean {
    logger.info(`Reverting fix ${result.fixId}`);
    let success = true;

    for (const change of result.changes) {
      if (change.type === 'css-rule') {
        const removed = this.cssEngine.removeRule(change.fixId);
        if (!removed) success = false;
      } else if (change.type === 'dom-wrapper') {
        const unwrapped = this.domEngine.revertChange(change);
        if (!unwrapped) success = false;
      }
    }

    return success;
  }
}
