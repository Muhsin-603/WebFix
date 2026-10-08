import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisEngine } from '../../src/content/analysis/analysis-engine.js';
import { HorizontalOverflowDetector } from '../../src/content/detectors/horizontal-overflow.js';
import { FixedWidthDetector } from '../../src/content/detectors/fixed-width.js';
import { OversizedImageDetector } from '../../src/content/detectors/oversized-image.js';
import { OversizedMediaDetector } from '../../src/content/detectors/oversized-media.js';
import { WideTableDetector } from '../../src/content/detectors/wide-table.js';
import { ViewportOverflowDetector } from '../../src/content/detectors/viewport-overflow.js';
import { MisplacedButtonDetector } from '../../src/content/detectors/misplaced-button.js';

describe('WebFix Detectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 400 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
  });

  it('detects horizontal overflow when element extends beyond viewport width', () => {
    document.body.innerHTML = `
      <div id="wide-div" style="width: 1000px; height: 100px;">Wide Content</div>
    `;
    const el = document.getElementById('wide-div')!;
    el.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 1000,
      bottom: 100,
      width: 1000,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    Object.defineProperty(document.documentElement, 'scrollWidth', { value: 1000, configurable: true });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new HorizontalOverflowDetector();
    const results = detector.detect(context);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('horizontal-overflow');
    expect(results[0].severity).toBe('high');
  });

  it('detects fixed-width containers exceeding viewport width', () => {
    document.body.innerHTML = `
      <div id="fixed-box" style="width: 900px; height: 100px;">Fixed Box</div>
    `;
    const el = document.getElementById('fixed-box')!;
    el.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 900,
      bottom: 100,
      width: 900,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new FixedWidthDetector();
    const results = detector.detect(context);

    expect(results.length).toBe(1);
    expect(results[0].type).toBe('fixed-width');
    expect(results[0].metrics.elementWidth).toBe(900);
  });

  it('detects oversized images', () => {
    document.body.innerHTML = `
      <img id="huge-img" src="test.jpg" style="width: 800px; height: 300px;" />
    `;
    const img = document.getElementById('huge-img')!;
    img.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 800,
      bottom: 300,
      width: 800,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new OversizedImageDetector();
    const results = detector.detect(context);

    expect(results.length).toBe(1);
    expect(results[0].type).toBe('oversized-image');
  });

  it('detects wide tables without scrollable wrapper', () => {
    document.body.innerHTML = `
      <table id="data-tbl">
        <tr><td>Col 1</td><td>Col 2</td><td>Col 3</td><td>Col 4</td></tr>
      </table>
    `;
    const tbl = document.getElementById('data-tbl')!;
    tbl.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 1200,
      bottom: 200,
      width: 1200,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new WideTableDetector();
    const results = detector.detect(context);

    expect(results.length).toBe(1);
    expect(results[0].type).toBe('wide-table');
  });

  it('detects misplaced buttons outside the viewport', () => {
    document.body.innerHTML = `
      <button id="floating-btn" style="position: absolute; left: 600px; top: 50px;">Offscreen</button>
    `;
    const btn = document.getElementById('floating-btn')!;
    btn.getBoundingClientRect = () => ({
      top: 50,
      left: 600,
      right: 700,
      bottom: 90,
      width: 100,
      height: 40,
      x: 600,
      y: 50,
      toJSON: () => {},
    });

    const context = AnalysisEngine.createContext(document, window);
    const detector = new MisplacedButtonDetector();
    const results = detector.detect(context);

    expect(results.length).toBe(1);
    expect(results[0].type).toBe('misplaced-button');
  });

  it('reports zero issues on already responsive pages', () => {
    document.body.innerHTML = `
      <div style="max-width: 100%; width: 350px;">
        <p>Responsive text</p>
        <button style="position: static; width: 120px;">Button</button>
      </div>
    `;
    Object.defineProperty(document.documentElement, 'scrollWidth', { value: 400, configurable: true });

    const context = AnalysisEngine.createContext(document, window);
    const detectors = [
      new HorizontalOverflowDetector(),
      new FixedWidthDetector(),
      new OversizedImageDetector(),
      new OversizedMediaDetector(),
      new WideTableDetector(),
      new ViewportOverflowDetector(),
      new MisplacedButtonDetector(),
    ];

    const allResults = detectors.flatMap((d) => d.detect(context));
    expect(allResults.length).toBe(0);
  });
});
