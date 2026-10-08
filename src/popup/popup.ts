import {
  WebFixMessage,
  WebFixResponse,
} from "../shared/messaging/index.js";

import {
  PageStatusPayload,
  ProposedFix,
  DiagnosticLogEntry,
} from "../shared/types/index.js";

class WebFixPopupController {
  private currentPayload: PageStatusPayload | null = null;
  private selectedFixIds: Set<string> = new Set();

  constructor() {
    this.bindEvents();
    this.refreshStatus();
  }

  private bindEvents(): void {
    const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzePage());
    }

    const applyBtn = document.getElementById('apply-btn') as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applySelectedFixes());
    }

    const restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement;
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => this.restoreAll());
    }

    const toggleSelectAllBtn = document.getElementById('toggle-select-all') as HTMLButtonElement;
    if (toggleSelectAllBtn) {
      toggleSelectAllBtn.addEventListener('click', () => this.toggleSelectAll());
    }

    const diagToggle = document.getElementById('diagnostics-toggle') as HTMLButtonElement;
    if (diagToggle) {
      diagToggle.addEventListener('click', () => this.toggleDiagnostics());
    }
  }

  private async sendMessageToTab(
    message: WebFixMessage,
    timeoutMs = 25000
  ): Promise<WebFixResponse<PageStatusPayload>> {
    return new Promise((resolve) => {
      // Hard timeout — Manifest V3 ports can silently die, this prevents hanging forever
      const timer = setTimeout(() => {
        resolve({ success: false, error: 'Analysis timed out. The page may be too complex. Try refreshing and retrying.' });
      }, timeoutMs);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          clearTimeout(timer);
          resolve({ success: false, error: 'No active tab found' });
          return;
        }

        const tabId = activeTab.id;

        const attemptSend = (isRetry = false) => {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            const err = chrome.runtime.lastError;
            if (err) {
              if (!isRetry && chrome.scripting) {
                // Auto-inject content script if tab was opened before extension loaded
                chrome.scripting.executeScript(
                  {
                    target: { tabId },
                    files: ['content/content-script.js'],
                  },
                  () => {
                    if (chrome.runtime.lastError) {
                      clearTimeout(timer);
                      resolve({
                        success: false,
                        error: chrome.runtime.lastError.message || 'Cannot communicate with page. Please refresh the page.',
                      });
                    } else {
                      // Script injected, wait briefly and retry
                      setTimeout(() => attemptSend(true), 200);
                    }
                  }
                );
              } else {
                clearTimeout(timer);
                resolve({
                  success: false,
                  error: err.message || 'Cannot communicate with page. Please refresh the page.',
                });
              }
            } else {
              clearTimeout(timer);
              resolve(response || { success: false, error: 'Empty response' });
            }
          });
        };

        attemptSend();
      });
    });
  }

  private async refreshStatus(): Promise<void> {
    const res = await this.sendMessageToTab({ type: 'GET_STATUS' });
    if (res.success && res.data) {
      this.render(res.data);
    } else if (res.error) {
      this.showError(res.error);
    }
  }

  private appendProgressLog(message: string, type: 'info' | 'highlight' | 'warn' | 'success' = 'info'): void {
    const box = document.getElementById('progress-log-box');
    if (!box) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const item = document.createElement('div');
    item.className = 'live-log-item';
    item.innerHTML = `<span class="live-log-time">[${timeStr}]</span> <span class="live-log-msg ${type}">${this.escapeHtml(message)}</span>`;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
  }

  private setProgressBar(percent: number, stageTitle: string, isComplete = false): void {
    const fill = document.getElementById('progress-bar-fill');
    const percentEl = document.getElementById('progress-percent');
    const stageEl = document.getElementById('progress-stage-title');
    if (fill) {
      fill.style.width = `${percent}%`;
      fill.classList.toggle('complete', isComplete);
    }
    if (percentEl) {
      percentEl.innerText = `${percent}%`;
    }
    if (stageEl) {
      stageEl.innerText = stageTitle;
    }
  }

  private async analyzePage(): Promise<void> {
    const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
    const progressCard = document.getElementById('analysis-progress-card');
    const logBox = document.getElementById('progress-log-box');

    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '<span>Analyzing Page...</span>';
    }

    if (progressCard) {
      progressCard.style.display = 'flex';
    }
    if (logBox) {
      logBox.innerHTML = '';
    }

    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    // ─── CRITICAL FIX ─────────────────────────────────────────────────────────
    // Fire the real content-script analysis IMMEDIATELY in parallel.
    // The fake progress animation stages are cosmetic only — they run concurrently.
    // We await the REAL result at the end, not mid-way through.
    // This means progress never blocks at 80% waiting for the content script.
    // ─────────────────────────────────────────────────────────────────────────
    const analysisPromise = this.sendMessageToTab({ type: 'ANALYZE_PAGE' });

    // Cosmetic progress stages (run in parallel with real analysis)
    this.setProgressBar(10, 'Initializing DOM inspection...');
    this.appendProgressLog('Starting WebFix layout audit engine...', 'highlight');

    await delay(300);
    this.setProgressBar(25, 'Inspecting Viewport & Dimensions...');
    this.appendProgressLog('Measuring viewport scrollWidth vs clientWidth...');

    await delay(400);
    this.setProgressBar(42, 'Scanning Horizontal Overflow...');
    this.appendProgressLog('Evaluating container boundaries & horizontal clipping...');

    await delay(450);
    this.setProgressBar(58, 'Auditing Rigid Fixed-Width Containers...');
    this.appendProgressLog('Inspecting fixed-width elements, max-width, & min-width...');

    await delay(400);
    this.setProgressBar(72, 'Analyzing Images, Media, & Tables...');
    this.appendProgressLog('Checking <img> aspect ratios and <table> scroll wrappers...');

    await delay(400);
    this.setProgressBar(85, 'Validating Misplaced Buttons & Score...');
    this.appendProgressLog('Auditing button alignment geometry & calculating heuristic score...');

    // Now wait for the actual analysis result (may already be done)
    this.appendProgressLog('⏳ Waiting for page inspection to complete...', 'highlight');
    const res = await analysisPromise;

    this.setProgressBar(100, 'Analysis Complete ✓', true);

    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>Re-Analyze Page</span>
      `;
    }

    if (res.success && res.data) {
      this.clearError();
      const count = res.data.detections.length;
      const score = res.data.initialScore?.score ?? 100;

      this.appendProgressLog(
        `✓ Audit finished: ${count} issue${count === 1 ? '' : 's'} detected • Responsive Score: ${score}/100`,
        count > 0 ? 'warn' : 'success'
      );

      // Default: select all safe automatic fixes
      this.selectedFixIds.clear();
      for (const fix of res.data.proposedFixes) {
        if (fix.isSafeAutomatic) {
          this.selectedFixIds.add(fix.id);
        }
      }

      this.render(res.data);

      // Automatically open the Visual Change Log accordion so the user sees all details
      const diagContent = document.getElementById('diagnostics-content');
      const chevron = document.getElementById('diagnostics-chevron');
      if (diagContent && chevron) {
        diagContent.style.display = 'block';
        chevron.classList.add('open');
      }
    } else {
      this.appendProgressLog(`✕ Error: ${res.error || 'Failed to inspect page'}`, 'warn');
      this.showError(res.error || 'Failed to analyze page');
    }
  }

  private async applySelectedFixes(): Promise<void> {
    const applyBtn = document.getElementById('apply-btn') as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.innerText = 'Applying...';
    }

    const res = await this.sendMessageToTab({
      type: 'APPLY_FIXES',
      fixIds: Array.from(this.selectedFixIds),
    });

    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Apply Selected Fixes</span>
      `;
    }

    if (res.success && res.data) {
      this.render(res.data);
    } else {
      this.showError(res.error || 'Failed to apply fixes');
    }
  }

  private async restoreAll(): Promise<void> {
    const restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement;
    if (restoreBtn) {
      restoreBtn.disabled = true;
    }

    const res = await this.sendMessageToTab({ type: 'RESTORE_ALL' });
    if (restoreBtn) {
      restoreBtn.disabled = false;
    }

    if (res.success && res.data) {
      this.render(res.data);
    } else {
      this.showError(res.error || 'Failed to restore changes');
    }
  }

  private async toggleIndividualFix(fixId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      this.selectedFixIds.add(fixId);
    } else {
      this.selectedFixIds.delete(fixId);
    }

    // If already in active state, apply or revert immediately
    if (this.currentPayload?.state === 'ACTIVE' || this.currentPayload?.appliedFixIds.includes(fixId)) {
      const res = await this.sendMessageToTab({
        type: 'TOGGLE_FIX',
        fixId,
        enabled,
      });
      if (res.success && res.data) {
        this.render(res.data);
      }
    }
  }

  private toggleSelectAll(): void {
    if (!this.currentPayload) return;
    const allSelected = this.selectedFixIds.size === this.currentPayload.proposedFixes.length;
    this.selectedFixIds.clear();

    if (!allSelected) {
      for (const fix of this.currentPayload.proposedFixes) {
        this.selectedFixIds.add(fix.id);
      }
    }

    this.renderFixes(this.currentPayload.proposedFixes, this.currentPayload.appliedFixIds);
  }

  private toggleDiagnostics(): void {
    const content = document.getElementById('diagnostics-content');
    const chevron = document.getElementById('diagnostics-chevron');
    if (content && chevron) {
      const isOpen = content.style.display !== 'none';
      content.style.display = isOpen ? 'none' : 'block';
      chevron.classList.toggle('open', !isOpen);
    }
  }

  private render(payload: PageStatusPayload): void {
    this.currentPayload = payload;

    const connStatus = document.getElementById('connection-status');
    if (connStatus) {
      connStatus.innerText = payload.state === 'ACTIVE' ? 'Fixes Active' : payload.state;
    }

    const emptyState = document.getElementById('empty-state');
    const statsBar = document.getElementById('stats-bar');
    const fixesSection = document.getElementById('fixes-section');
    const diagSection = document.getElementById('diagnostics-section');

    if (payload.state === 'UNANALYZED') {
      if (emptyState) emptyState.style.display = 'block';
      if (statsBar) statsBar.style.display = 'none';
      if (fixesSection) fixesSection.style.display = 'none';
      if (diagSection) diagSection.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (statsBar) statsBar.style.display = 'grid';
    if (fixesSection) fixesSection.style.display = 'flex';
    if (diagSection) diagSection.style.display = 'block';

    // Stats
    const vpDim = document.getElementById('vp-dimensions');
    if (vpDim) {
      vpDim.innerHTML = `${payload.viewport.width} &times; ${payload.viewport.height} px`;
    }

    const probCount = document.getElementById('problem-count');
    if (probCount) {
      probCount.innerText = String(payload.detections.length);
    }

    // Score
    const scoreVal = document.getElementById('score-val');
    const scoreDelta = document.getElementById('score-delta');
    if (scoreVal && payload.currentScore) {
      scoreVal.innerText = `${payload.currentScore.score}`;
      if (payload.initialScore && payload.initialScore.score !== payload.currentScore.score) {
        const diff = payload.currentScore.score - payload.initialScore.score;
        if (scoreDelta) {
          scoreDelta.innerText = diff > 0 ? `+${diff}` : `${diff}`;
        }
      } else if (scoreDelta) {
        scoreDelta.innerText = '';
      }
    }

    this.renderFixes(payload.proposedFixes, payload.appliedFixIds);
    this.renderDiagnostics(payload.diagnosticLogs);
  }

  private renderFixes(fixes: ProposedFix[], appliedIds: string[]): void {
    const listEl = document.getElementById('fixes-list');
    if (!listEl) return;

    if (fixes.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 18px 12px; color: #10b981; font-weight: 500;">
          ✓ Page is already responsive. No layout problems detected.
        </div>
      `;
      const btnGroup = document.querySelector('.button-group') as HTMLElement;
      if (btnGroup) btnGroup.style.display = 'none';
      return;
    }

    const btnGroup = document.querySelector('.button-group') as HTMLElement;
    if (btnGroup) btnGroup.style.display = 'flex';

    listEl.innerHTML = '';
    fixes.forEach((fix) => {
      const isApplied = appliedIds.includes(fix.id);
      const isChecked = this.selectedFixIds.has(fix.id) || isApplied;

      const item = document.createElement('div');
      item.className = `fix-item ${isApplied ? 'applied' : ''}`;

      const badgeHtml = fix.isSafeAutomatic
        ? `<span class="fix-badge safe">Safe Fix</span>`
        : `<span class="fix-badge review">Review Needed</span>`;

      const appliedTagHtml = isApplied
        ? `<span class="fix-badge applied-tag">Applied</span>`
        : '';

      item.innerHTML = `
        <input type="checkbox" class="fix-checkbox" id="chk-${fix.id}" ${isChecked ? 'checked' : ''} />
        <div class="fix-content">
          <div class="fix-title-row">
            <span class="fix-title">${this.escapeHtml(fix.title)}</span>
            <div style="display: flex; gap: 4px;">
              ${appliedTagHtml}
              ${badgeHtml}
            </div>
          </div>
          <p class="fix-desc">${this.escapeHtml(fix.description)}</p>
          <code class="fix-target-code">${this.escapeHtml(fix.targetSelector)}</code>
        </div>
      `;

      const chk = item.querySelector(`#chk-${fix.id}`) as HTMLInputElement;
      chk.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.toggleIndividualFix(fix.id, checked);
      });

      listEl.appendChild(item);
    });
  }

  private renderDiagnostics(logs: DiagnosticLogEntry[]): void {
    const countEl = document.getElementById('log-count');
    if (countEl) countEl.innerText = String(logs.length);

    const logEntriesEl = document.getElementById('log-entries');
    if (!logEntriesEl) return;

    if (logs.length === 0) {
      logEntriesEl.innerHTML = `<div style="color: #64748b; font-size: 11px; padding: 4px;">No changes recorded yet.</div>`;
      return;
    }

    logEntriesEl.innerHTML = '';
    logs.forEach((log) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      let statusIcon = '✓';
      let statusClass = 'log-status-applied';
      if (log.result === 'warning') {
        statusIcon = '⚠';
        statusClass = 'log-status-warning';
      } else if (log.result === 'failed') {
        statusIcon = '✕';
        statusClass = 'log-status-failed';
      } else if (log.result === 'reverted') {
        statusIcon = '↩';
        statusClass = 'log-status-reverted';
      }

      entry.innerHTML = `
        <div class="log-entry-row">
          <span class="log-action">${this.escapeHtml(log.action)}</span>
          <span class="${statusClass}">${statusIcon} ${log.result}</span>
        </div>
        <div class="log-details">${this.escapeHtml(log.target)} &bull; ${this.escapeHtml(log.details || log.problem)}</div>
      `;
      logEntriesEl.appendChild(entry);
    });
  }

  private showError(msg: string): void {
    const banner = document.getElementById('error-banner');
    const msgEl = document.getElementById('error-message');
    if (banner && msgEl) {
      msgEl.innerText = msg;
      banner.style.display = 'block';
    }
  }

  private clearError(): void {
    const banner = document.getElementById('error-banner');
    if (banner) banner.style.display = 'none';
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Instantiate popup controller
if (typeof window !== 'undefined') {
  new WebFixPopupController();
}
