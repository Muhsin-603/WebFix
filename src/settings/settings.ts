import { ExtensionSettings, WebFixMessage, WebFixResponse } from '../shared/types/index.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants/index.js';

class WebFixSettingsController {
  private autoModeToggle = document.getElementById('setting-auto-mode') as HTMLInputElement;
  private safeOnlyToggle = document.getElementById('setting-safe-only') as HTMLInputElement;
  private showNotifsToggle = document.getElementById('setting-show-notifications') as HTMLInputElement;
  private toast = document.getElementById('save-toast') as HTMLElement;

  constructor() {
    this.loadSettings();
    this.bindEvents();
  }

  private loadSettings(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
        this.renderToggles(settings);
      });
    } else {
      this.renderToggles(DEFAULT_SETTINGS);
    }
  }

  private renderToggles(settings: ExtensionSettings): void {
    if (this.autoModeToggle) this.autoModeToggle.checked = settings.automaticMode;
    if (this.safeOnlyToggle) this.safeOnlyToggle.checked = settings.applyOnlySafeFixes;
    if (this.showNotifsToggle) this.showNotifsToggle.checked = settings.showNotifications;
  }

  private bindEvents(): void {
    const handleUpdate = () => {
      const updated: ExtensionSettings = {
        automaticMode: this.autoModeToggle.checked,
        applyOnlySafeFixes: this.safeOnlyToggle.checked,
        showNotifications: this.showNotifsToggle.checked,
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated }, () => {
          this.showToast();
          // Also broadcast to service worker
          chrome.runtime.sendMessage<WebFixMessage, WebFixResponse>({
            type: 'UPDATE_SETTINGS',
            settings: updated,
          });
        });
      } else {
        this.showToast();
      }
    };

    this.autoModeToggle?.addEventListener('change', handleUpdate);
    this.safeOnlyToggle?.addEventListener('change', handleUpdate);
    this.showNotifsToggle?.addEventListener('change', handleUpdate);
  }

  private showToast(): void {
    if (this.toast) {
      this.toast.style.display = 'block';
      setTimeout(() => {
        this.toast.style.display = 'none';
      }, 2500);
    }
  }
}

if (typeof window !== 'undefined') {
  new WebFixSettingsController();
}
