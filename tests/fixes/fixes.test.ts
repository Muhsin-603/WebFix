import { describe, it, expect, beforeEach } from 'vitest';
import { CSSFixEngine } from '../../src/content/fixes/css-fix-engine.js';
import { DOMFixEngine } from '../../src/content/fixes/dom-fix-engine.js';
import { FixPlanner } from '../../src/content/fixes/fix-planner.js';
import { FixValidator } from '../../src/content/fixes/fix-validator.js';
import { AnalysisEngine } from '../../src/content/analysis/analysis-engine.js';
import { FixedWidthDetector } from '../../src/content/detectors/fixed-width.js';
import { STYLE_ELEMENT_ID, TABLE_WRAPPER_CLASS } from '../../src/shared/constants/index.js';

describe('WebFix Fix Engine', () => {
  let cssEngine: CSSFixEngine;
  let domEngine: DOMFixEngine;
  let planner: FixPlanner;

  beforeEach(() => {
    document.body.innerHTML = '';
    const oldStyle = document.getElementById(STYLE_ELEMENT_ID);
    if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);

    cssEngine = new CSSFixEngine(document);
    domEngine = new DOMFixEngine(document);
    planner = new FixPlanner(cssEngine, domEngine);

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
  });

  it('injects isolated CSS style tag with unique selector rules', () => {
    document.body.innerHTML = `<div id="box" data-webfix-id="wfx-1">Box</div>`;
    const record = cssEngine.applyRule('fix-1', '[data-webfix-id="wfx-1"]', {
      'max-width': '100%',
      'width': 'auto',
    });

    const styleEl = document.getElementById(STYLE_ELEMENT_ID);
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('max-width: 100% !important;');
    expect(record.type).toBe('css-rule');

    // Cleanly removes rule
    cssEngine.removeRule('fix-1');
    expect(styleEl?.textContent).not.toContain('max-width: 100%');
  });

  it('wraps tables in touch-scrollable container without destroying table', () => {
    document.body.innerHTML = `
      <div id="wrapper">
        <table id="tbl" data-webfix-id="wfx-tbl"><tr><td>Data</td></tr></table>
      </div>
    `;

    const record = domEngine.wrapTableInScrollContainer('fix-tbl-1', '[data-webfix-id="wfx-tbl"]');
    expect(record).not.toBeNull();

    const tbl = document.getElementById('tbl');
    const parent = tbl?.parentElement;
    expect(parent?.classList.contains(TABLE_WRAPPER_CLASS)).toBe(true);
    expect(parent?.style.overflowX).toBe('auto');

    // Unwrapping restores original hierarchy
    domEngine.revertChange(record!);
    expect(tbl?.parentElement?.id).toBe('wrapper');
  });

  it('plans and applies fixed-width fix accurately', () => {
    document.body.innerHTML = `<div id="fixed" style="width: 1000px;">Fixed Box</div>`;
    const el = document.getElementById('fixed')!;
    el.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 1000,
      bottom: 50,
      width: 1000,
      height: 50,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new FixedWidthDetector();
    const detections = detector.detect(context);
    expect(detections.length).toBe(1);

    const proposals = planner.planFixes(detections);
    expect(proposals.length).toBe(1);
    expect(proposals[0].isSafeAutomatic).toBe(true);

    const result = planner.applyFix(proposals[0], detections[0], context);
    expect(result.success).toBe(true);

    const styleEl = document.getElementById(STYLE_ELEMENT_ID);
    expect(styleEl?.textContent).toContain('max-width: 100% !important;');
  });

  it('validates fixed element post-application', () => {
    document.body.innerHTML = `<div id="elem" data-webfix-id="wfx-10">Fixed</div>`;
    const elem = document.getElementById('elem')!;
    elem.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 390,
      bottom: 50,
      width: 390, // Within 400px viewport
      height: 50,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const validation = FixValidator.validate(
      {
        id: 'det-1',
        detectorId: 'fixed-width',
        type: 'fixed-width',
        severity: 'high',
        confidence: 0.9,
        elementSelector: '[data-webfix-id="wfx-10"]',
        elementTagName: 'div',
        description: 'Fixed width box',
        suggestedFixIds: ['fix-10'],
        metrics: { elementWidth: 1000 },
      },
      document,
      window
    );

    expect(validation.valid).toBe(true);
    expect(validation.improved).toBe(true);
  });
});
