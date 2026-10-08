import { AnalysisContext } from '../../shared/types/index.js';
import { ViewportAnalyzer } from './viewport-analyzer.js';
import { DOMAnalyzer } from './dom-analyzer.js';

export class AnalysisEngine {
  static createContext(doc: Document = document, win: Window = window): AnalysisContext {
    const viewport = ViewportAnalyzer.getDimensions(doc, win);
    const root = doc.body || doc.documentElement;
    const elements = DOMAnalyzer.collectVisibleElements(root, win);

    return {
      viewport,
      document: doc,
      elements,
      root,
      timestamp: Date.now(),
    };
  }
}
