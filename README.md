# WebFix V0.1 — Responsive Layout Fixer Chrome Extension

WebFix is a lightweight Chrome browser extension built with **TypeScript**, **Manifest V3**, and **Vanilla DOM APIs** that automatically detects and resolves responsiveness and layout problems directly on user-rendered webpages without touching server or backend code.

---

## 🚀 Key Features

1. **Rule-Based Responsive Adaptation**:
   - Zero AI dependencies in V0.1; uses deterministic geometric and computed style analysis.
2. **7 Core Problem Detectors**:
   - **Horizontal Overflow**: Detects elements extending beyond `clientWidth` or causing `scrollWidth > clientWidth`.
   - **Fixed-Width Containers**: Identifies rigid fixed pixel widths (`width: 1200px`, `min-width: 900px`) that do not adapt to smaller viewports.
   - **Oversized Images**: Identifies unconstrained `<img>` elements that break container or viewport bounds.
   - **Oversized Media**: Scales `video`, `iframe`, `embed`, `object`, and `canvas` while maintaining ratio.
   - **Wide Tables**: Safely wraps rigid data tables in touch-friendly horizontal scroll containers (`.webfix-table-wrapper`) without altering data or structure.
   - **Viewport Overflow**: Detects offscreen or clipped structural blocks.
   - **Misplaced Buttons**: Conservative geometric detection with warning indicators requiring manual review before applying.
3. **Surgical, Non-Destructive Modifications**:
   - CSS changes are applied via an isolated injected stylesheet (`<style id="webfix-injected-styles">`) using scoped selectors (`[data-webfix-id="..."]`), avoiding destruction of inline styles or site stylesheets.
   - DOM modifications (like table wrappers) are tracked and surgically unnested.
4. **Complete Reversibility & User Control**:
   - Enable/disable individual proposed fixes with checkboxes.
   - Revert individual fixes without resetting the whole page.
   - **Restore Original** returns the page strictly to its pre-WebFix state without refreshing.
5. **Modern Dark-Mode Glassmorphism UI**:
   - Responsive Score tracking before and after fixes (`Score: 42 → 86`).
   - Viewport dimensions monitor (`390 × 844 px`).
   - Visual Change Log detailing problems, target selectors, actions taken, and results.
6. **Automatic Mode & Settings**:
   - Optional automatic analysis and application of high-confidence safe fixes on page load.
   - Subtle floating notification badge with dismiss controls.

---

## 📁 Architecture Overview

```text
WebFix
│
├── Extension Layer
│   ├── Popup (src/popup/popup.html, popup.ts, popup.css)
│   ├── Settings (src/settings/settings.html, settings.ts, settings.css)
│   └── Background Service Worker (src/background/service-worker.ts)
│
├── Page Layer
│   └── Content Script (src/content/content-script.ts)
│
├── Analysis Engine (src/content/analysis/)
│   ├── Viewport Analyzer (viewport-analyzer.ts)
│   ├── DOM Analyzer (dom-analyzer.ts)
│   ├── Layout Analyzer (layout-analyzer.ts)
│   └── Analysis Engine (analysis-engine.ts)
│
├── Detectors (src/content/detectors/)
│   ├── Horizontal Overflow (horizontal-overflow.ts)
│   ├── Fixed-Width (fixed-width.ts)
│   ├── Oversized Images (oversized-image.ts)
│   ├── Oversized Media (oversized-media.ts)
│   ├── Wide Tables (wide-table.ts)
│   ├── Viewport Overflow (viewport-overflow.ts)
│   └── Misplaced Buttons (misplaced-button.ts)
│
├── Fix Engine (src/content/fixes/)
│   ├── CSS Fix Engine (css-fix-engine.ts)
│   ├── DOM Fix Engine (dom-fix-engine.ts)
│   ├── Fix Planner (fix-planner.ts)
│   └── Fix Validator (fix-validator.ts)
│
├── State & Restoration (src/content/state/)
│   ├── State Manager (state-manager.ts)
│   └── Restore Manager (restore-manager.ts)
│
└── Diagnostics (src/content/diagnostics/)
    ├── Logger (logger.ts)
    └── Change Log (change-log.ts)
```

---

## 🛠️ Installation & Loading in Chrome

### 1. Build the Extension
```bash
npm install
npm run build
```
This bundles the project into the `dist/` directory with a self-contained IIFE content script, background service worker, popup, settings, manifest, and icons.

### 2. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` folder inside this project directory (`c:\Muhsin\Master_Codes\Projects\WebFix\dist`).
5. Pin **WebFix** in your browser extensions toolbar!

---

## 🧪 Testing & Verification

### Running Automated Unit Tests
```bash
npm run test
```
Runs 12 unit tests covering all 7 detectors, CSS and DOM fix engines, state management transitions, selective revert, and full restoration.

### Local Test Pages
Included in `tests/pages/`:
- `mixed-problems.html`: Stress test page reproducing all 5 major defects simultaneously (1200px header, 1100px container, 1600px image, 1400px table, offscreen button).
- `horizontal-overflow.html`: Single wide banner causing horizontal scroll.
- `fixed-width.html`: Rigid container with pixel min-width.
- `oversized-images.html`: Images breaking container bounds.
- `wide-table.html`: 10-column table overflowing screen.
- `misplaced-button.html`: Absolutely positioned offscreen button.
- `already-responsive.html`: Clean mobile-ready page that produces 0 detections (no-op verification).

---

## 📜 Development Scripts

- `npm run build`: Bundles the multi-target extension into `dist/`.
- `npm run dev`: Watches and builds changes for development.
- `npm run test`: Executes the Vitest test suite.
