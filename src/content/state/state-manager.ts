import {
  SiteState,
  DetectionResult,
  ProposedFix,
  PageStatusPayload,
  ResponsiveScore,
  AnalysisContext,
} from '../../shared/types/index.js';
import { ViewportAnalyzer } from '../analysis/viewport-analyzer.js';
import { ChangeLogManager } from '../diagnostics/change-log.js';
import { RestoreManager } from './restore-manager.js';
import { FixPlanner } from '../fixes/fix-planner.js';
import { FixValidator } from '../fixes/fix-validator.js';
import { logger } from '../diagnostics/logger.js';

export class StateManager {
  private state: SiteState = 'UNANALYZED';
  private detections: DetectionResult[] = [];
  private proposedFixes: ProposedFix[] = [];
  private changeLog: ChangeLogManager = new ChangeLogManager();
  private restoreManager: RestoreManager;
  private fixPlanner: FixPlanner;
  private initialScore?: ResponsiveScore;
  private currentScore?: ResponsiveScore;
  private errorMessage?: string;

  constructor(fixPlanner: FixPlanner, restoreManager: RestoreManager) {
    this.fixPlanner = fixPlanner;
    this.restoreManager = restoreManager;
  }

  getState(): SiteState {
    return this.state;
  }

  setState(newState: SiteState): void {
    logger.info(`State change: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  setAnalysisResults(detections: DetectionResult[], fixes: ProposedFix[], context?: AnalysisContext): void {
    this.detections = detections;
    this.proposedFixes = fixes;
    this.initialScore = this.changeLog.calculateScore(detections);
    this.currentScore = { ...this.initialScore };
    this.setState('ANALYZED');

    // Record analysis diagnostic entries
    this.changeLog.clear();
    if (context) {
      this.changeLog.addLog({
        problem: 'Viewport Geometry',
        target: 'window',
        action: 'Inspected Viewport',
        result: 'applied',
        details: `${context.viewport.width}x${context.viewport.height}px (scroll: ${context.viewport.scrollWidth}px) • ${context.elements.length} elements`,
      });
    }

    if (detections.length === 0) {
      this.changeLog.addLog({
        problem: 'Layout Responsiveness',
        target: 'document',
        action: 'Verified Fully Responsive',
        result: 'applied',
        details: 'All 7 layout detectors found 0 overflow or sizing issues',
      });
    } else {
      detections.forEach((d) => {
        this.changeLog.addLog({
          problem: d.description,
          target: d.elementSelector,
          action: `Detected: ${d.type}`,
          result: 'warning',
          details: `Severity: ${d.severity} • Confidence: ${Math.round(d.confidence * 100)}%`,
        });
      });
    }
  }

  applyFixes(fixIds: string[], context: AnalysisContext): { applied: number; failed: number } {
    this.setState('APPLYING');
    let appliedCount = 0;
    let failedCount = 0;

    for (const fixId of fixIds) {
      const proposal = this.proposedFixes.find((f) => f.id === fixId);
      const detection = this.detections.find((d) => d.id === proposal?.detectionId);

      if (!proposal || !detection) {
        logger.warn(`Could not find proposal/detection for fixId ${fixId}`);
        continue;
      }

      // If already applied, skip
      if (this.restoreManager.hasAppliedFix(fixId)) {
        continue;
      }

      const result = this.fixPlanner.applyFix(proposal, detection, context);
      if (result.success) {
        this.restoreManager.recordAppliedFix(result);
        proposal.applied = true;
        appliedCount++;

        // Validate
        const validation = FixValidator.validate(detection, context.document, window);

        this.changeLog.addLog({
          problem: detection.description,
          target: proposal.targetSelector,
          action: proposal.title,
          result: validation.valid ? 'applied' : 'warning',
          details: validation.message,
        });
      } else {
        failedCount++;
        this.changeLog.addLog({
          problem: detection.description,
          target: proposal.targetSelector,
          action: proposal.title,
          result: 'failed',
          details: result.error,
        });
      }
    }

    // Recompute current score based on remaining unresolved problems
    const appliedSet = new Set(this.restoreManager.getAppliedFixIds());
    const remainingDetections = this.detections.filter(
      (d) => !d.suggestedFixIds.some((fid) => appliedSet.has(fid))
    );
    this.currentScore = this.changeLog.calculateScore(remainingDetections);

    this.setState(this.restoreManager.getAppliedFixIds().length > 0 ? 'ACTIVE' : 'ANALYZED');
    return { applied: appliedCount, failed: failedCount };
  }

  revertFix(fixId: string): boolean {
    const proposal = this.proposedFixes.find((f) => f.id === fixId);
    const detection = this.detections.find((d) => d.id === proposal?.detectionId);

    const success = this.restoreManager.revertFix(fixId);
    if (success && proposal) {
      proposal.applied = false;
      this.changeLog.addLog({
        problem: detection ? detection.description : 'Reverted item',
        target: proposal.targetSelector,
        action: `Reverted: ${proposal.title}`,
        result: 'reverted',
      });

      // Recompute score
      const appliedSet = new Set(this.restoreManager.getAppliedFixIds());
      const remainingDetections = this.detections.filter(
        (d) => !d.suggestedFixIds.some((fid) => appliedSet.has(fid))
      );
      this.currentScore = this.changeLog.calculateScore(remainingDetections);

      if (this.restoreManager.getAppliedFixIds().length === 0) {
        this.setState('ANALYZED');
      }
    }
    return success;
  }

  restoreAll(): { successCount: number; failCount: number } {
    this.setState('RESTORING');
    const result = this.restoreManager.restoreAll();

    for (const proposal of this.proposedFixes) {
      proposal.applied = false;
    }

    this.changeLog.addLog({
      problem: 'Full page restoration',
      target: 'document',
      action: 'Restored all applied WebFix changes',
      result: 'reverted',
      details: `${result.successCount} changes reverted`,
    });

    this.currentScore = this.initialScore ? { ...this.initialScore } : undefined;
    this.setState('RESTORED');
    return result;
  }

  getStatusPayload(): PageStatusPayload {
    const vp = ViewportAnalyzer.getDimensions(document, window);
    return {
      state: this.state,
      viewport: vp,
      detections: this.detections,
      proposedFixes: this.proposedFixes,
      appliedFixIds: this.restoreManager.getAppliedFixIds(),
      diagnosticLogs: this.changeLog.getLogs(),
      initialScore: this.initialScore,
      currentScore: this.currentScore,
      url: window.location.href,
      error: this.errorMessage,
    };
  }

  setError(msg: string): void {
    this.errorMessage = msg;
    this.setState('ERROR');
  }
}
