import { DiagnosticLogEntry, DetectionResult, ResponsiveScore } from '../../shared/types/index.js';

export class ChangeLogManager {
  private logs: DiagnosticLogEntry[] = [];

  addLog(entry: Omit<DiagnosticLogEntry, 'id' | 'timestamp'>): DiagnosticLogEntry {
    const fullEntry: DiagnosticLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    this.logs.unshift(fullEntry);
    if (this.logs.length > 50) {
      this.logs.pop();
    }
    return fullEntry;
  }

  getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  /**
   * Calculates a heuristic responsive score from 0 to 100 based on remaining detections.
   * High severity problems deduct 15 points, medium 8 points, low 4 points.
   */
  calculateScore(detections: DetectionResult[]): ResponsiveScore {
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const d of detections) {
      if (d.severity === 'high') high++;
      else if (d.severity === 'medium') medium++;
      else low++;
    }

    const deduction = high * 18 + medium * 9 + low * 4;
    const score = Math.max(10, Math.min(100, Math.round(100 - deduction)));

    return {
      score: detections.length === 0 ? 100 : score,
      totalProblems: detections.length,
      highSeverityCount: high,
      mediumSeverityCount: medium,
      lowSeverityCount: low,
    };
  }
}
