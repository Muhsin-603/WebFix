import { AnalysisContext, DetectionResult, FixResult, ProposedFix } from '../../shared/types/index.js';

export interface Fix {
  id: string;
  name: string;
  description: string;
  isSafeAutomatic: boolean;
  strategy: 'css' | 'dom';

  canApply(detection: DetectionResult, context: AnalysisContext): boolean;
  createProposal(detection: DetectionResult): ProposedFix;
  apply(detection: DetectionResult, context: AnalysisContext): FixResult;
  revert(result: FixResult, doc: Document): boolean;
}
