import { JSDOM } from 'jsdom';
import fs from 'fs';
import { resolve } from 'path';

const html = fs.readFileSync(resolve('tests/pages/mixed-problems.html'), 'utf-8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost:3000/mixed-problems.html',
});

const { window } = dom;
const { document } = window;

// Set viewport width to 390px (mobile)
Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });

// Mock getBoundingClientRect
const originalGetBCR = window.HTMLElement.prototype.getBoundingClientRect;
window.HTMLElement.prototype.getBoundingClientRect = function() {
  const tagName = this.tagName.toLowerCase();
  const className = this.className || '';

  if (className.includes('broken-header')) {
    return { top: 0, left: 0, right: 1200, bottom: 80, width: 1200, height: 80 };
  }
  if (className.includes('broken-container')) {
    return { top: 100, left: 0, right: 1100, bottom: 900, width: 1100, height: 800 };
  }
  if (className.includes('broken-image')) {
    return { top: 200, left: 0, right: 1600, bottom: 600, width: 1600, height: 400 };
  }
  if (className.includes('broken-table')) {
    return { top: 650, left: 0, right: 1400, bottom: 850, width: 1400, height: 200 };
  }
  if (className.includes('broken-button')) {
    return { top: 90, left: 1500, right: 1650, bottom: 130, width: 150, height: 40 };
  }
  return { top: 0, left: 0, right: 390, bottom: 50, width: 390, height: 50 };
};

Object.defineProperty(document.documentElement, 'scrollWidth', { value: 1600, configurable: true });
Object.defineProperty(document.documentElement, 'clientWidth', { value: 390, configurable: true });

// Mock chrome API
window.chrome = {
  runtime: {
    onMessage: {
      addListener: (cb) => { window.__messageListener = cb; },
    },
  },
  storage: {
    sync: {
      get: (keys, cb) => cb({}),
    },
  },
};

// Execute bundled content-script.js
const contentScriptCode = fs.readFileSync(resolve('dist/content/content-script.js'), 'utf-8');
window.eval(contentScriptCode);

console.log('--- 1. Testing ANALYZE_PAGE ---');
window.__messageListener({ type: 'ANALYZE_PAGE' }, {}, (response) => {
  console.log('Analyze success:', response.success);
  console.log('Detections found:', response.data.detections.length);
  response.data.detections.forEach((d) => {
    console.log(` - [${d.type}] ${d.description} (selector: ${d.elementSelector})`);
  });

  const fixIds = response.data.proposedFixes.map((f) => f.id);
  console.log('\n--- 2. Testing APPLY_FIXES ---');
  window.__messageListener({ type: 'APPLY_FIXES', fixIds }, {}, (applyRes) => {
    console.log('Apply success:', applyRes.success);
    console.log('Applied fix IDs:', applyRes.data.appliedFixIds);

    const styleEl = document.getElementById('webfix-injected-styles');
    console.log('\nInjected Style Tag Present?', !!styleEl);
    if (styleEl) {
      console.log('Injected Style Content:\n', styleEl.textContent);
    }

    const tableWrapper = document.querySelector('.webfix-table-wrapper');
    console.log('\nTable Wrapper created?', !!tableWrapper);
    if (tableWrapper) {
      console.log('Table parent is wrapper?', tableWrapper.contains(document.querySelector('.broken-table')));
    }

    console.log('\n--- 3. Testing RESTORE_ALL ---');
    window.__messageListener({ type: 'RESTORE_ALL' }, {}, (restoreRes) => {
      console.log('Restore success:', restoreRes.success);
      console.log('Applied fixes after restore:', restoreRes.data.appliedFixIds.length);
      console.log('Injected Style Content after restore:\n', styleEl?.textContent || '(empty)');
      console.log('Table Wrapper after restore?', !!document.querySelector('.webfix-table-wrapper'));
    });
  });
});
