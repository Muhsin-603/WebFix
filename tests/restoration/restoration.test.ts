import { describe, it, expect, beforeEach } from 'vitest';
import { CSSFixEngine } from '../../src/content/fixes/css-fix-engine.js';
import { DOMFixEngine } from '../../src/content/fixes/dom-fix-engine.js';
import { FixPlanner } from '../../src/content/fixes/fix-planner.js';
import { RestoreManager } from '../../src/content/state/restore-manager.js';
import { StateManager } from '../../src/content/state/state-manager.js';
import { AnalysisEngine } from '../../src/content/analysis/analysis-engine.js';
import { STYLE_ELEMENT_ID, TABLE_WRAPPER_CLASS } from '../../src/shared/constants/index.js';

describe('WebFix State and Restoration Pipeline', () => {
  let cssEngine: CSSFixEngine;
  let domEngine: DOMFixEngine;
  let planner: FixPlanner;
  let restoreManager: RestoreManager;
  let stateManager: StateManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    const oldStyle = document.getElementById(STYLE_ELEMENT_ID);
    if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);

    cssEngine = new CSSFixEngine(document);
    domEngine = new DOMFixEngine(document);
    planner = new FixPlanner(cssEngine, domEngine);
    restoreManager = new RestoreManager(planner, document);
    stateManager = new StateManager(planner, restoreManager);

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  });

  it('manages state lifecycle and selective revert', () => {
    document.body.innerHTML = `
      <div id="c1" data-webfix-id="wfx-1">Container 1</div>
      <div id="c2" data-webfix-id="wfx-2">Container 2</div>
    `;

    const detections = [
      {
        id: 'det-1',
        detectorId: 'fixed-width',
        type: 'fixed-width' as const,
        severity: 'high' as const,
        confidence: 0.9,
        elementSelector: '[data-webfix-id="wfx-1"]',
        elementTagName: 'div',
        description: 'Fixed container 1',
        suggestedFixIds: ['fix-1'],
        metrics: { elementWidth: 800 },
      },
      {
        id: 'det-2',
        detectorId: 'fixed-width',
        type: 'fixed-width' as const,
        severity: 'medium' as const,
        confidence: 0.9,
        elementSelector: '[data-webfix-id="wfx-2"]',
        elementTagName: 'div',
        description: 'Fixed container 2',
        suggestedFixIds: ['fix-2'],
        metrics: { elementWidth: 600 },
      },
    ];

    const proposals = planner.planFixes(detections);
    stateManager.setAnalysisResults(detections, proposals);

    expect(stateManager.getState()).toBe('ANALYZED');
    const initialScore = stateManager.getStatusPayload().initialScore?.score;
    expect(initialScore).toBeLessThan(100);

    // Apply only fix-1
    const context = AnalysisEngine.createContext(document, window);
    stateManager.applyFixes(['fix-1'], context);

    expect(stateManager.getState()).toBe('ACTIVE');
    expect(restoreManager.getAppliedFixIds()).toEqual(['fix-1']);

    // Revert fix-1
    const reverted = stateManager.revertFix('fix-1');
    expect(reverted).toBe(true);
    expect(restoreManager.getAppliedFixIds()).toEqual([]);
    expect(stateManager.getState()).toBe('ANALYZED');
  });

  it('restores all applied fixes cleanly', () => {
    document.body.innerHTML = `
      <div id="wrapper">
        <table id="tbl" data-webfix-id="wfx-t"><tr><td>Data</td></tr></table>
        <div id="box" data-webfix-id="wfx-b">Box</div>
      </div>
    `;

    const detections = [
      {
        id: 'det-t',
        detectorId: 'wide-table',
        type: 'wide-table' as const,
        severity: 'high' as const,
        confidence: 0.9,
        elementSelector: '[data-webfix-id="wfx-t"]',
        elementTagName: 'table',
        description: 'Wide table',
        suggestedFixIds: ['fix-t'],
        metrics: { elementWidth: 1000 },
      },
      {
        id: 'det-b',
        detectorId: 'fixed-width',
        type: 'fixed-width' as const,
        severity: 'high' as const,
        confidence: 0.9,
        elementSelector: '[data-webfix-id="wfx-b"]',
        elementTagName: 'div',
        description: 'Fixed box',
        suggestedFixIds: ['fix-b'],
        metrics: { elementWidth: 900 },
      },
    ];

    const proposals = planner.planFixes(detections);
    stateManager.setAnalysisResults(detections, proposals);

    const context = AnalysisEngine.createContext(document, window);
    stateManager.applyFixes(['fix-t', 'fix-b'], context);

    // Verify DOM wrapper and CSS style tag exist
    expect(document.querySelector(`.${TABLE_WRAPPER_CLASS}`)).not.toBeNull();
    const styleEl = document.getElementById(STYLE_ELEMENT_ID);
    expect(styleEl?.textContent).toContain('fix-b');

    // Full Restore
    const restoreResult = stateManager.restoreAll();
    expect(restoreResult.successCount).toBe(2);
    expect(stateManager.getState()).toBe('RESTORED');

    // Wrapper removed and table placed back
    expect(document.querySelector(`.${TABLE_WRAPPER_CLASS}`)).toBeNull();
    expect(document.getElementById('tbl')?.parentElement?.id).toBe('wrapper');

    // CSS rule removed
    expect(styleEl?.textContent).not.toContain('fix-b');
  });
});
