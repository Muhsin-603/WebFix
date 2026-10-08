import { AnalysisEngine } from './analysis/analysis-engine.js';
import { HorizontalOverflowDetector } from './detectors/horizontal-overflow.js';
import { FixedWidthDetector } from './detectors/fixed-width.js';
import { OversizedImageDetector } from './detectors/oversized-image.js';
import { OversizedMediaDetector } from './detectors/oversized-media.js';
import { WideTableDetector } from './detectors/wide-table.js';
import { ViewportOverflowDetector } from './detectors/viewport-overflow.js';
import { MisplacedButtonDetector } from './detectors/misplaced-button.js';
import { Detector } from './detectors/detector.js';

import { CSSFixEngine } from './fixes/css-fix-engine.js';
import { DOMFixEngine } from './fixes/dom-fix-engine.js';
import { FixPlanner } from './fixes/fix-planner.js';
import { RestoreManager } from './state/restore-manager.js';
import { StateManager } from './state/state-manager.js';
import { logger } from './diagnostics/logger.js';
import { WebFixMessage, WebFixResponse, PageStatusPayload, ExtensionSettings } from '../shared/types/index.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS, STATUS_BADGE_ID } from '../shared/constants/index.js';

class WebFixContentController {
  private detectors: Detector[];
  private cssEngine: CSSFixEngine;
  private domEngine: DOMFixEngine;
  private fixPlanner: FixPlanner;
  private restoreManager: RestoreManager;
  private stateManager: StateManager;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private mutationObserver: MutationObserver | null = null;
  private mutationTimeout: number | null = null;

  constructor() {
    this.cssEngine = new CSSFixEngine(document);
    this.domEngine = new DOMFixEngine(document);
    this.fixPlanner = new FixPlanner(this.cssEngine, this.domEngine);
    this.restoreManager = new RestoreManager(this.fixPlanner, document);
    this.stateManager = new StateManager(this.fixPlanner, this.restoreManager);

    this.detectors = [
      new HorizontalOverflowDetector(),
      new FixedWidthDetector(),
      new OversizedImageDetector(),
      new OversizedMediaDetector(),
      new WideTableDetector(),
      new ViewportOverflowDetector(),
      new MisplacedButtonDetector(),
    ];

    this.init();
  }

  private init(): void {
    logger.info('WebFix Content Script loaded');
    this.setupMessageListener();
    this.loadSettingsAndCheckAutoMode();
    this.setupMutationObserver();
  }

  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(
        (message: WebFixMessage, _sender, sendResponse: (res: WebFixResponse<PageStatusPayload>) => void) => {
          this.handleMessage(message)
            .then((payload) => sendResponse({ success: true, data: payload }))
            .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
          return true; // Keep channel open for async response
        }
      );
    }
  }

  private async handleMessage(message: WebFixMessage): Promise<PageStatusPayload> {
    logger.debug(`Received message: ${message.type}`);

    switch (message.type) {
      case 'ANALYZE_PAGE':
        return this.runAnalysis();

      case 'APPLY_FIXES': {
        const context = AnalysisEngine.createContext(document, window);
        const { applied } = this.stateManager.applyFixes(message.fixIds, context);
        if (applied > 0) {
          this.renderStatusBadge(applied);
        }
        return this.stateManager.getStatusPayload();
      }

      case 'REVERT_FIX': {
        this.stateManager.revertFix(message.fixId);
        return this.stateManager.getStatusPayload();
      }

      case 'TOGGLE_FIX': {
        if (message.enabled) {
          const context = AnalysisEngine.createContext(document, window);
          const { applied } = this.stateManager.applyFixes([message.fixId], context);
          if (applied > 0) {
            this.renderStatusBadge(applied);
          }
        } else {
          this.stateManager.revertFix(message.fixId);
        }
        return this.stateManager.getStatusPayload();
      }

      case 'RESTORE_ALL': {
        this.stateManager.restoreAll();
        this.removeStatusBadge();
        return this.stateManager.getStatusPayload();
      }

      case 'GET_STATUS':
        return this.stateManager.getStatusPayload();

      default:
        return this.stateManager.getStatusPayload();
    }
  }

  runAnalysis(): PageStatusPayload {
    this.stateManager.setState('ANALYZING');
    const context = AnalysisEngine.createContext(document, window);

    const allDetections = [];
    for (const detector of this.detectors) {
      try {
        const results = detector.detect(context);
        allDetections.push(...results);
      } catch (err) {
        logger.error(`Error in detector ${detector.name}:`, err);
      }
    }

    const proposedFixes = this.fixPlanner.planFixes(allDetections);
    this.stateManager.setAnalysisResults(allDetections, proposedFixes, context);
    logger.info(`Analysis complete. Found ${allDetections.length} problem(s), planned ${proposedFixes.length} fix(es).`);

    return this.stateManager.getStatusPayload();
  }

  private loadSettingsAndCheckAutoMode(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        if (result && result[STORAGE_KEYS.SETTINGS]) {
          this.settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
        }
        if (this.settings.automaticMode) {
          this.triggerAutomaticMode();
        }
      });
    }
  }

  private triggerAutomaticMode(): void {
    const execute = () => {
      logger.info('Automatic mode activated');
      const payload = this.runAnalysis();

      const safeFixes = payload.proposedFixes.filter((f) => f.isSafeAutomatic);
      if (safeFixes.length > 0) {
        const context = AnalysisEngine.createContext(document, window);
        const { applied } = this.stateManager.applyFixes(
          safeFixes.map((f) => f.id),
          context
        );
        if (applied > 0 && this.settings.showNotifications) {
          this.renderStatusBadge(applied);
        }
      }
    };

    if (document.readyState === 'complete') {
      execute();
    } else {
      window.addEventListener('load', execute, { once: true });
    }
  }

  private renderStatusBadge(appliedCount: number): void {
    this.removeStatusBadge();

    const badge = document.createElement('div');
    badge.id = STATUS_BADGE_ID;
    badge.setAttribute('data-webfix-ignore', 'true');
    badge.innerHTML = `
      <div style="position: fixed; bottom: 16px; right: 16px; z-index: 2147483647; background: #0f172a; color: #f8fafc; padding: 8px 14px; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #334155;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
        <span>WebFix: ${appliedCount} fix${appliedCount > 1 ? 'es' : ''} applied</span>
        <button id="webfix-badge-dismiss" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0 2px; font-size: 14px; line-height: 1;">&times;</button>
      </div>
    `;

    document.body.appendChild(badge);

    const dismissBtn = badge.querySelector('#webfix-badge-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.removeStatusBadge());
    }

    setTimeout(() => {
      this.removeStatusBadge();
    }, 6000);
  }

  private removeStatusBadge(): void {
    const badge = document.getElementById(STATUS_BADGE_ID);
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }

  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.mutationObserver = new MutationObserver((mutations) => {
      let isWebFixChange = false;
      for (const m of mutations) {
        const target = m.target as HTMLElement;
        if (
          target &&
          (target.id === STATUS_BADGE_ID ||
            target.id === 'webfix-injected-styles' ||
            target.hasAttribute?.('data-webfix-ignore') ||
            target.hasAttribute?.('data-webfix-id'))
        ) {
          isWebFixChange = true;
          break;
        }
      }

      if (isWebFixChange) return;

      // Debounce re-analysis if already in ACTIVE or ANALYZED state
      if (this.stateManager.getState() === 'ACTIVE' && this.settings.automaticMode) {
        if (this.mutationTimeout) {
          window.clearTimeout(this.mutationTimeout);
        }
        this.mutationTimeout = window.setTimeout(() => {
          logger.debug('DOM mutated, re-checking layout in automatic mode');
          this.triggerAutomaticMode();
        }, 1200);
      }
    });

    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }
}

// Initialize content controller
if (typeof window !== 'undefined') {
  new WebFixContentController();
}
