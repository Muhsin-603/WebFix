export type ProblemType =
  | 'horizontal-overflow'
  | 'fixed-width'
  | 'oversized-image'
  | 'oversized-media'
  | 'wide-table'
  | 'viewport-overflow'
  | 'misplaced-button';

export type Severity = 'low' | 'medium' | 'high';

export interface ViewportDimensions {
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}

export interface AnalysisContext {
  viewport: ViewportDimensions;
  document: Document;
  elements: HTMLElement[];
  root: HTMLElement;
  timestamp: number;
}

export interface DetectionResult {
  id: string;
  detectorId: string;
  type: ProblemType;
  severity: Severity;
  confidence: number; // 0.0 to 1.0 (heuristic)
  elementSelector: string;
  elementTagName: string;
  description: string;
  suggestedFixIds: string[];
  metrics: {
    elementWidth?: number;
    elementHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    rect?: {
      top: number;
      left: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };
    computedStyles?: Record<string, string>;
  };
}

export interface ProposedFix {
  id: string;
  detectionId: string;
  detectorId: string;
  type: ProblemType;
  title: string;
  description: string;
  targetSelector: string;
  targetTagName: string;
  isSafeAutomatic: boolean;
  strategy: 'css' | 'dom';
  applied: boolean;
  statusText?: string;
}

export interface FixChangeRecord {
  fixId: string;
  type: 'css-rule' | 'dom-wrapper' | 'attribute';
  elementSelector?: string;
  cssRule?: string;
  attributeName?: string;
  previousValue?: string | null;
  wrapperElementId?: string;
  targetElementWebFixId?: string;
}

export interface FixResult {
  fixId: string;
  success: boolean;
  error?: string;
  changes: FixChangeRecord[];
  timestamp: number;
}

export type SiteState =
  | 'UNANALYZED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'APPLYING'
  | 'ACTIVE'
  | 'RESTORING'
  | 'RESTORED'
  | 'ERROR';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  problem: string;
  target: string;
  action: string;
  result: 'applied' | 'reverted' | 'failed' | 'warning';
  details?: string;
}

export interface ResponsiveScore {
  score: number; // 0-100
  totalProblems: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
}

export interface ExtensionSettings {
  automaticMode: boolean;
  applyOnlySafeFixes: boolean;
  showNotifications: boolean;
}

export interface PageStatusPayload {
  state: SiteState;
  viewport: ViewportDimensions;
  detections: DetectionResult[];
  proposedFixes: ProposedFix[];
  appliedFixIds: string[];
  diagnosticLogs: DiagnosticLogEntry[];
  initialScore?: ResponsiveScore;
  currentScore?: ResponsiveScore;
  url: string;
  error?: string;
}
