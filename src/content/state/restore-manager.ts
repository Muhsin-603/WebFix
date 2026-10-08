import { FixResult } from '../../shared/types/index.js';
import { FixPlanner } from '../fixes/fix-planner.js';
import { logger } from '../diagnostics/logger.js';

export class RestoreManager {
  private appliedFixes: Map<string, FixResult> = new Map();
  private fixPlanner: FixPlanner;
  private doc: Document;

  constructor(fixPlanner: FixPlanner, doc: Document = document) {
    this.fixPlanner = fixPlanner;
    this.doc = doc;
  }

  recordAppliedFix(result: FixResult): void {
    this.appliedFixes.set(result.fixId, result);
  }

  hasAppliedFix(fixId: string): boolean {
    return this.appliedFixes.has(fixId);
  }

  getAppliedFixIds(): string[] {
    return Array.from(this.appliedFixes.keys());
  }

  revertFix(fixId: string): boolean {
    const result = this.appliedFixes.get(fixId);
    if (!result) {
      logger.warn(`Cannot revert unknown or unapplied fix ${fixId}`);
      return false;
    }

    const success = this.fixPlanner.revertFix(result);
    if (success) {
      this.appliedFixes.delete(fixId);
      logger.info(`Reverted fix ${fixId} successfully`);
    } else {
      logger.error(`Failed to revert fix ${fixId}`);
    }
    return success;
  }

  restoreAll(): { successCount: number; failCount: number } {
    let successCount = 0;
    let failCount = 0;

    const fixIds = Array.from(this.appliedFixes.keys());
    for (const fixId of fixIds) {
      const ok = this.revertFix(fixId);
      if (ok) {
        successCount++;
      } else {
        failCount++;
      }
    }

    this.appliedFixes.clear();
    logger.info(`Restored all fixes. Success: ${successCount}, Fail: ${failCount}`);
    return { successCount, failCount };
  }

  clear(): void {
    this.appliedFixes.clear();
  }
}
