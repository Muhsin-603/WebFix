import { AnalysisContext, DetectionResult } from '../../shared/types/index.js';

export interface Detector {
  id: string;
  name: string;
  detect(context: AnalysisContext): DetectionResult[];
}
