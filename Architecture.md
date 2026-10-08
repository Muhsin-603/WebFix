# WebFix V0.1 — Master Build Prompt

## 1. Project

Build **WebFix**, a Chrome browser extension that automatically improves the responsiveness of poorly designed webpages.

WebFix operates entirely on the user's browser-rendered page.

It must:

- Inspect the current webpage's DOM and computed styles.
- Detect common responsiveness/layout problems.
- Propose safe fixes.
- Allow the user to enable/disable individual fixes.
- Apply selected fixes locally to the current webpage.
- Validate the result.
- Allow the user to restore the original page.
- Support both manual and automatic activation.

WebFix must **not modify the actual website/server**. All changes exist only in the user's browser session.

---

# 2. V0.1 Scope

V0.1 must detect and attempt to fix:

1. Horizontal overflow
2. Fixed-width containers
3. Oversized images
4. Oversized media
5. Wide tables
6. Elements extending beyond the viewport
7. Misplaced buttons

Do NOT implement AI in V0.1.

Do NOT attempt to make every website perfectly responsive.

The goal is to create a reliable **rule-based responsive adaptation engine** that works on a meaningful subset of poorly responsive websites.

---

# 3. Technology Stack

Use:

- Chrome
- Chrome Extension Manifest V3
- TypeScript
- HTML
- CSS
- Vanilla JavaScript/TypeScript
- npm
- Git
- VS Code

Do NOT introduce React, Next.js, Vue, Tailwind, or another frontend framework unless there is a compelling technical reason.

The extension should remain lightweight.

---

# 4. High-Level Architecture

Use this architecture:

```text
WebFix
│
├── Extension Layer
│   ├── Popup
│   ├── Settings
│   └── Background Service Worker
│
├── Page Layer
│   └── Content Script
│
├── Analysis Engine
│   ├── Viewport Analyzer
│   ├── DOM Analyzer
│   ├── Layout Analyzer
│   └── Problem Detectors
│
├── Fix Engine
│   ├── Fix Planner
│   ├── CSS Fixes
│   ├── DOM Fixes
│   └── Fix Validator
│
├── State Layer
│   ├── Original State
│   ├── Applied Fixes
│   └── Restore Manager
│
└── Diagnostics
    ├── Change Log
    ├── Fix Status
    └── Error Handling
```

The architecture must keep **detection, decision-making, modification, validation, and restoration separate**.

Do not put all functionality into one content script.

---

# 5. Core Data Flow

The primary flow must be:

```text
User opens webpage
        ↓
WebFix detects page
        ↓
Content script initializes
        ↓
Viewport Analyzer
        ↓
DOM/Layout Analysis
        ↓
Problem Detectors
        ↓
Detection Results
        ↓
Fix Planner
        ↓
Proposed Fixes
        ↓
Popup displays fixes
        ↓
User enables/disables fixes
        ↓
Apply selected fixes
        ↓
Validate result
        ↓
Display result
        ↓
Store reversible state
```

Automatic mode:

```text
Page loaded
    ↓
WebFix enabled?
    ↓
Analyze
    ↓
Generate fixes
    ↓
Apply safe fixes automatically
    ↓
Show small status indicator
```

Manual mode:

```text
Page loaded
    ↓
User opens WebFix
    ↓
Analyze Page
    ↓
Review proposed fixes
    ↓
User selects fixes
    ↓
Apply
```

---

# 6. Extension Components

## 6.1 Popup

Create a simple popup.

The popup must show:

```text
WebFix

[ Analyze Page ]

Responsive Status
-----------------
Problems detected: 6

Fixes
-----------------

☑ Horizontal overflow
☑ Fixed-width containers
☑ Oversized images
☐ Oversized media
☑ Wide tables
☑ Viewport overflow
☐ Misplaced buttons

[ Apply Selected Fixes ]

[ Restore Original ]
```

The checkboxes must be individually controllable.

If a detected problem has no safe fix, show it as:

```text
⚠ Detected
No safe automatic fix
```

Do not pretend every detection can be fixed.

---

# 7. Visual Change Log

The popup should show a small diagnostic log.

Example:

```text
WebFix Report

✓ Fixed 4 overflowing elements
✓ Fixed 2 fixed-width containers
✓ Fixed 1 oversized image
⚠ 1 button requires manual review

Responsive score:
42 → 86
```

The score is optional for V0.1.

If implemented, it must be clearly described as a heuristic score, not an objective measure of website quality.

Each fix should have:

```text
Problem
Target
Action
Result
```

Example:

```text
Horizontal Overflow

Target:
.container

Detected:
Width = 1200px
Viewport = 390px

Applied:
max-width: 100%
width: auto

Status:
✓ Applied
```

---

# 8. Detection Engine

Create a generic detector interface.

Conceptually:

```ts
interface Detector {
    id: string;
    name: string;
    detect(context: AnalysisContext): DetectionResult[];
}
```

Do not hardcode all detection logic into one function.

Each detector should be independently testable.

---

# 9. Analysis Context

Create a shared analysis context.

It should contain information such as:

```ts
interface AnalysisContext {
    viewport: {
        width: number;
        height: number;
    };

    document: Document;

    elements: HTMLElement[];

    root: HTMLElement;

    timestamp: number;
}
```

Expand this structure only when necessary.

Avoid building a giant global state object.

---

# 10. Detector: Horizontal Overflow

Detect whether page content extends beyond the viewport.

Check:

```text
document.documentElement.scrollWidth
document.documentElement.clientWidth
document.body.scrollWidth
document.body.clientWidth
```

Also inspect individual elements whose bounding rectangles extend beyond the viewport.

Example:

```text
Viewport:
390px

Element:
x = 0
width = 850px

Problem:
Horizontal overflow
```

Avoid treating tiny subpixel differences as errors.

Use a small tolerance.

Do not automatically modify every overflowing element.

Identify likely responsible elements first.

---

# 11. Detector: Fixed-Width Containers

Detect elements that use suspicious fixed widths.

Examples:

```css
width: 1200px;
width: 1000px;
min-width: 900px;
```

Compare the element width against viewport width.

Potential problem:

```text
Element width > viewport width
AND
width/min-width is fixed
```

Do not modify every element with a pixel width.

Some fixed-width elements are legitimate.

Use additional signals:

- Element width
- Viewport width
- Parent width
- Computed CSS
- Overflow
- Element type
- Position
- Relationship to surrounding layout

---

# 12. Detector: Oversized Images

Inspect:

```html
<img>
```

Determine:

```text
rendered width
rendered height
natural width
natural height
viewport width
```

Potential fix:

```css
max-width: 100%;
height: auto;
```

Do not distort aspect ratio.

Do not blindly change images that are intentionally larger than the viewport if they are inside a scrollable viewer.

---

# 13. Detector: Oversized Media

Support common media:

```text
video
iframe
embed
object
canvas
```

Detect when their rendered dimensions exceed the usable viewport.

Possible fixes:

```css
max-width: 100%;
height: auto;
```

For elements where height:auto is inappropriate, use a safer strategy.

Do not destroy aspect ratios.

Do not blindly resize interactive embedded applications.

---

# 14. Detector: Wide Tables

Detect:

```html
<table>
```

where:

```text
table width > available container width
```

Preferred V0.1 fix:

Wrap the table in a scrollable container where possible.

Conceptually:

```html
<div class="webfix-table-wrapper">
    <table>...</table>
</div>
```

with:

```css
.webfix-table-wrapper {
    max-width: 100%;
    overflow-x: auto;
}
```

Do not immediately rewrite table structure.

Preserve the site's data and functionality.

---

# 15. Detector: Elements Extending Beyond Viewport

Inspect visible elements.

Use:

```ts
element.getBoundingClientRect()
```

Check:

```text
left < 0
right > viewport width
top < 0
bottom > viewport height
```

Use tolerance values.

Ignore elements that are intentionally positioned outside the viewport, such as:

- off-screen menus
- hidden elements
- dialogs
- animation elements
- elements with display:none
- elements with visibility:hidden

Determine whether the element is actually visible before reporting it.

---

# 16. Detector: Misplaced Buttons

This detector must be conservative.

Do NOT attempt to understand arbitrary visual design.

For V0.1 define "misplaced button" using measurable geometry.

Potential signals:

### Signal A — viewport overflow

```text
button.right > viewport.right
```

### Signal B — severe negative positioning

```text
button.left < 0
```

### Signal C — overlap

Button overlaps an unrelated visible element in a suspicious way.

### Signal D — fixed positioning causing obstruction

A fixed button occupies a large area or blocks content.

### Signal E — extreme positioning

Computed styles contain suspicious combinations such as:

```text
position: absolute/fixed
large left/right/top values
```

Use multiple signals before classifying a button as misplaced.

Never modify a button merely because its position differs from the expected design.

---

# 17. Detection Results

Every detector should produce structured results.

Example:

```ts
interface DetectionResult {
    id: string;

    detectorId: string;

    type:
        | "horizontal-overflow"
        | "fixed-width"
        | "oversized-image"
        | "oversized-media"
        | "wide-table"
        | "viewport-overflow"
        | "misplaced-button";

    severity: "low" | "medium" | "high";

    confidence: number;

    element?: HTMLElement;

    description: string;

    suggestedFixIds: string[];
}
```

Confidence should be heuristic.

Do not pretend it is machine-learning confidence.

---

# 18. Fix Engine

Create a separate fix system.

Conceptually:

```ts
interface Fix {
    id: string;

    name: string;

    description: string;

    canApply(
        detection: DetectionResult,
        context: AnalysisContext
    ): boolean;

    apply(
        detection: DetectionResult
    ): FixResult;

    revert(
        fixResult: FixResult
    ): void;
}
```

The fix engine must never directly depend on popup UI.

---

# 19. Fix Planner

The Fix Planner converts:

```text
Detection
```

into:

```text
Proposed Fix
```

Example:

```text
Detection:
Fixed-width container

        ↓

Fix Planner

        ↓

Proposal:
Set max-width: 100%
Remove conflicting width where safe
```

A detector identifies a problem.

A planner decides what should be done.

A fixer actually performs the change.

Keep those responsibilities separate.

---

# 20. CSS Modification Strategy

Prefer injecting a WebFix-generated stylesheet over permanently mutating inline styles.

For example:

```html
<style id="webfix-styles">
    ...
</style>
```

Use unique WebFix identifiers.

Example:

```text
data-webfix-id
data-webfix-modified
```

Do not overwrite the website's original stylesheet.

Use CSS specificity carefully.

Avoid:

```css
* {
    all: unset;
}
```

Avoid global destructive rules.

The site's existing design should remain intact wherever possible.

---

# 21. DOM Modification Strategy

DOM modifications are allowed but must be conservative.

Every DOM modification must be:

```text
tracked
reversible
isolated
```

For example, if a table is wrapped:

```text
Original:
table

WebFix:
wrapper
  └── table
```

The Restore Manager must be able to remove the wrapper and return the DOM to its previous state.

---

# 22. Restoration System

Restoration is mandatory.

Create:

```text
RestoreManager
```

It should track:

```text
CSS changes
DOM changes
attributes
inline styles
created elements
removed elements
event/listener changes
```

Prefer storing the **minimum necessary state** rather than cloning the entire DOM.

Do not use:

```js
document.body.innerHTML = originalHTML;
```

as the restoration mechanism.

That can destroy:

- event listeners
- application state
- framework state
- user input
- dynamically generated content

Restoration must be surgical.

---

# 23. Fix IDs

Every applied fix should have a unique ID.

Example:

```text
fix-001
fix-002
fix-003
```

or UUIDs.

The system should know:

```text
Fix
 ├── Detection
 ├── Target element
 ├── Changes
 ├── Status
 └── Revert information
```

---

# 24. User-Controlled Fixes

The popup must allow:

```text
☑ Fix A
☐ Fix B
☑ Fix C
```

The user may disable a proposed fix.

Disabled fixes must not be applied.

If a fix is already applied and the user disables it:

```text
Disable
   ↓
Restore that specific fix
```

Do not restore the entire webpage.

---

# 25. Automatic Mode

Support two modes.

## Manual

User explicitly clicks:

```text
Analyze Page
```

and then:

```text
Apply Selected Fixes
```

## Automatic

When enabled:

```text
Page loaded
    ↓
WebFix analyzes
    ↓
Safe high-confidence fixes
    ↓
Applied automatically
```

For V0.1, automatic mode should only automatically apply **high-confidence, low-risk fixes**.

Examples:

```text
img {
    max-width: 100%;
    height: auto;
}
```

Potentially safe.

Whereas:

```text
Rewrite navigation DOM
```

should not happen automatically.

---

# 26. Safety Rules

WebFix must prioritize preserving functionality.

Never blindly modify:

```text
forms
inputs
buttons
links
iframes
authentication interfaces
payment interfaces
CAPTCHA
complex JavaScript applications
```

unless the specific fix is highly confident and low risk.

Do not remove event listeners.

Do not replace entire DOM subtrees unnecessarily.

Do not interfere with browser-native functionality.

Do not alter network requests.

Do not alter cookies.

Do not alter authentication.

Do not alter backend/server data.

WebFix is a **presentation-layer adaptation tool**.

---

# 27. SPA Support

Websites may use:

```text
React
Angular
Vue
Svelte
etc.
```

The extension should not depend on any specific framework.

Use DOM observation where necessary.

Consider:

```ts
MutationObserver
```

for dynamically changing pages.

However, do not continuously re-analyze the entire page on every mutation.

Use debouncing/throttling.

---

# 28. Performance

Performance is important.

Do not scan the entire DOM repeatedly without reason.

Initial analysis:

```text
Analyze once
```

Dynamic pages:

```text
Mutation detected
      ↓
Debounce
      ↓
Analyze affected area if possible
```

Avoid infinite loops:

```text
WebFix modifies DOM
    ↓
MutationObserver detects modification
    ↓
WebFix modifies DOM again
    ↓
infinite loop
```

Mark WebFix-generated elements and ignore them during detection.

---

# 29. Background Service Worker

Use the service worker for extension-level responsibilities.

Do not put page DOM manipulation in the service worker.

The service worker communicates with content scripts.

Conceptually:

```text
Popup
  ↕
Service Worker
  ↕
Content Script
  ↕
Page DOM
```

---

# 30. Message Protocol

Create a typed message system.

Examples:

```ts
type WebFixMessage =
    | {
        type: "ANALYZE_PAGE";
      }
    | {
        type: "APPLY_FIXES";
        fixIds: string[];
      }
    | {
        type: "REVERT_FIX";
        fixId: string;
      }
    | {
        type: "RESTORE_ALL";
      }
    | {
        type: "GET_STATUS";
      };
```

Keep messages centralized.

Do not scatter arbitrary string messages throughout the codebase.

---

# 31. Settings

V0.1 settings should include:

```text
Automatic Mode
[ ON / OFF ]

Automatically apply only safe fixes
[ ON / OFF ]

Show change notifications
[ ON / OFF ]
```

Keep settings minimal.

Do not build a giant settings dashboard.

---

# 32. Site State

The system should distinguish:

```text
UNANALYZED
ANALYZING
ANALYZED
APPLYING
ACTIVE
RESTORING
RESTORED
ERROR
```

Use a predictable state machine rather than dozens of unrelated boolean variables.

---

# 33. Error Handling

A failed fix must not break the webpage.

Example:

```text
Fix A → success
Fix B → failed
Fix C → success
```

The system should keep A and C applied.

It should report:

```text
2 fixes applied
1 fix failed
```

Do not allow one failed fix to crash the entire engine.

---

# 34. Logging

Create a lightweight internal logger.

Example:

```text
[WebFix] Analysis started
[WebFix] Viewport: 390x844
[WebFix] Found 3 overflow candidates
[WebFix] Found 2 fixed-width containers
[WebFix] Applying fix: fixed-width-container
[WebFix] Fix successful
```

Use log levels:

```text
debug
info
warn
error
```

Disable excessive debug logging in production builds.

---

# 35. Folder Structure

Use a modular structure similar to:

```text
webfix/
│
├── src/
│   │
│   ├── background/
│   │   └── service-worker.ts
│   │
│   ├── content/
│   │   ├── content-script.ts
│   │   ├── analysis/
│   │   │   ├── analysis-engine.ts
│   │   │   ├── viewport-analyzer.ts
│   │   │   ├── dom-analyzer.ts
│   │   │   └── layout-analyzer.ts
│   │   │
│   │   ├── detectors/
│   │   │   ├── detector.ts
│   │   │   ├── horizontal-overflow.ts
│   │   │   ├── fixed-width.ts
│   │   │   ├── oversized-image.ts
│   │   │   ├── oversized-media.ts
│   │   │   ├── wide-table.ts
│   │   │   ├── viewport-overflow.ts
│   │   │   └── misplaced-button.ts
│   │   │
│   │   ├── fixes/
│   │   │   ├── fix.ts
│   │   │   ├── fix-planner.ts
│   │   │   ├── css-fix-engine.ts
│   │   │   ├── dom-fix-engine.ts
│   │   │   └── fix-validator.ts
│   │   │
│   │   ├── state/
│   │   │   ├── state-manager.ts
│   │   │   └── restore-manager.ts
│   │   │
│   │   └── diagnostics/
│   │       ├── logger.ts
│   │       └── change-log.ts
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   │
│   ├── settings/
│   │   ├── settings.html
│   │   ├── settings.ts
│   │   └── settings.css
│   │
│   ├── shared/
│   │   ├── types/
│   │   ├── constants/
│   │   └── messaging/
│   │
│   └── manifest.json
│
├── tests/
│   ├── detectors/
│   ├── fixes/
│   └── restoration/
│
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

The exact folder structure can change if there is a technically superior organization, but responsibilities must remain separated.

---

# 36. Testing Strategy

Do not test only on one website.

Create local test pages.

Example:

```text
tests/pages/
│
├── horizontal-overflow.html
├── fixed-width.html
├── oversized-images.html
├── wide-table.html
├── misplaced-button.html
├── mixed-problems.html
└── already-responsive.html
```

Each page should intentionally reproduce a specific problem.

Test:

```text
Detection
Fix
Validation
Restoration
```

---

# 37. Important Test Case

Create an intentionally terrible webpage:

```text
Viewport: 390px

Header: 1200px
Container: 1100px
Image: 1600px
Table: 1400px
Button: positioned outside viewport
```

WebFix should detect these independently.

Then:

```text
Apply all
    ↓
Page becomes usable
    ↓
Restore
    ↓
Original broken layout returns
```

This is one of the primary V0.1 acceptance tests.

---

# 38. Already Responsive Websites

If the page is already responsive:

```text
Problems detected: 0
```

Do not modify anything.

WebFix should effectively become a no-op.

---

# 39. Avoid Over-Fixing

This is one of the most important rules.

A webpage being unusual does not mean it is broken.

For every proposed fix ask:

```text
Is the element actually causing a responsiveness problem?
```

not:

```text
Can I change this element?
```

Only modify when evidence supports the change.

---

# 40. V0.1 Acceptance Criteria

V0.1 is complete when:

### Extension

- Chrome can load the unpacked extension.
- Popup opens.
- Content script communicates with popup.
- Manual analysis works.
- Automatic mode works.
- Settings persist.

### Detection

The system can detect:

- horizontal overflow
- fixed-width containers
- oversized images
- oversized media
- wide tables
- viewport overflow
- suspiciously misplaced buttons

### Fixing

The system can safely fix a meaningful subset of detected problems.

### User control

Users can:

- select fixes
- deselect fixes
- apply fixes
- revert individual fixes
- restore all changes

### Diagnostics

The user can see:

- what was detected
- what was fixed
- what failed
- what remains unresolved

### Safety

The extension:

- does not modify server data
- does not modify network requests
- does not destroy application state
- does not replace the entire DOM
- does not break the original page when a fix fails

---

# 41. Explicit Non-Goals

Do NOT implement these in V0.1:

- AI
- LLM APIs
- computer vision
- screenshot analysis
- automatic website redesign
- automatic color/theme redesign
- navigation redesign
- accessibility auditing
- SEO optimization
- backend modification
- proxy servers
- cloud infrastructure
- user accounts
- databases
- analytics
- cross-browser support
- mobile applications
- website builder functionality

These may become future versions.

---

# 42. Future Architecture

The architecture should make future additions possible.

Potential V0.2:

```text
More detectors
More fix strategies
Better layout analysis
Site-specific profiles
```

Potential V0.3:

```text
Visual diagnostics
Accessibility improvements
Advanced layout reconstruction
```

Potential V1:

```text
                Responsive Engine
                       │
          ┌────────────┴────────────┐
          │                         │
      Rule Engine              AI Planner
          │                         │
          └────────────┬────────────┘
                       │
                  Fix Planner
                       │
                  Fix Engine
```

AI must remain an optional planning layer.

It must not be embedded throughout the system.

---

# 43. Development Rules

Follow these rules strictly.

### Rule 1

Build incrementally.

Implement one detector and one fix at a time.

### Rule 2

Do not create unnecessary abstractions before they are needed.

### Rule 3

Do not rewrite working components unnecessarily.

### Rule 4

Test after every meaningful change.

### Rule 5

Keep prototype code clearly identifiable.

### Rule 6

Never silently modify a webpage when the system is uncertain.

### Rule 7

Prefer reversible operations.

### Rule 8

Prefer CSS fixes over DOM restructuring.

### Rule 9

Never use AI for V0.1.

### Rule 10

Never claim a page is "fixed" merely because horizontal overflow disappeared.

Validate the actual target problem.

---

# 44. Implementation Order

Do not build everything simultaneously.

Build in this order:

## Phase 1 — Extension skeleton

```text
Chrome extension
↓
Manifest
↓
Popup
↓
Content script
↓
Message communication
```

Verify that it works.

---

## Phase 2 — Page analysis

Implement:

```text
Viewport Analyzer
DOM Analyzer
```

Verify measurements.

---

## Phase 3 — First detector

Implement:

```text
Horizontal Overflow Detector
```

Test it against:

```text
responsive page
broken page
edge cases
```

---

## Phase 4 — First fix

Implement:

```text
Overflow Fix
```

Then:

```text
Apply
↓
Validate
↓
Restore
```

Do not continue until this cycle works reliably.

---

## Phase 5

Add:

```text
Fixed-width detector
Fixed-width fix
```

---

## Phase 6

Add:

```text
Oversized image detector
Oversized image fix
```

---

## Phase 7

Add:

```text
Oversized media
Wide tables
Viewport overflow
```

---

## Phase 8

Add:

```text
Misplaced button detection
```

Keep the fix conservative.

---

## Phase 9

Build:

```text
Fix Planner
```

---

## Phase 10

Build:

```text
Change Log
Popup controls
Individual restoration
Full restoration
```

---

## Phase 11

Add:

```text
Automatic mode
```

Only high-confidence, low-risk fixes should be automatically applied.

---

## Phase 12

Test against multiple real-world websites.

Do not optimize specifically for one website.

---

# 45. Important Development Principle

The extension should eventually behave like this:

```text
              WEB PAGE
                  │
                  ▼
          ┌───────────────┐
          │    ANALYZE    │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │    DETECT     │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │  PLAN FIXES   │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ USER DECISION │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ APPLY CHANGES │
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │   VALIDATE    │
          └───────┬───────┘
                  │
             ┌────┴────┐
             ▼         ▼
          SUCCESS     FAIL
             │         │
             ▼         ▼
           STORE     REVERT
             │
             ▼
          RESTORABLE
```

This pipeline is the foundation of WebFix.

Do not bypass it by allowing individual detectors to directly manipulate the DOM.

---

# 46. Final Instruction to the Coding Agent

You are building **WebFix V0.1**, not the final product.

Prioritize:

1. Correctness
2. Reversibility
3. Safety
4. Clear architecture
5. Testability
6. Performance
7. Simplicity

Do not over-engineer.

Do not add features outside the defined V0.1 scope.

Do not introduce AI.

Do not assume that every layout problem has an automatic solution.

When uncertain whether a modification is safe, **do not apply it automatically**.

When implementing each phase:

1. Explain what is being implemented.
2. Create the smallest working implementation.
3. Test it.
4. Show what was verified.
5. Only then proceed to the next phase.

Never silently jump ahead multiple phases.

The goal of V0.1 is not to prove that WebFix can fix every website.

The goal is to prove this fundamental loop:

```text
INSPECT
   ↓
UNDERSTAND
   ↓
PROPOSE
   ↓
MODIFY
   ↓
VALIDATE
   ↓
RESTORE
```

If this loop is reliable, the rest of WebFix can be built on top of it.