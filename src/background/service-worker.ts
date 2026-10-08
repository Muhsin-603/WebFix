import { WebFixMessage, WebFixResponse, ExtensionSettings } from '../shared/types/index.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants/index.js';

// Initialize extension settings upon installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
    if (!result[STORAGE_KEYS.SETTINGS]) {
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
    }
  });
});

// Centralized message routing between popup and content scripts
chrome.runtime.onMessage.addListener(
  (
    message: WebFixMessage,
    _sender,
    sendResponse: (res: WebFixResponse<unknown>) => void
  ) => {
    if (message.type === 'GET_SETTINGS') {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        sendResponse({
          success: true,
          data: result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS,
        });
      });
      return true;
    }

    if (message.type === 'UPDATE_SETTINGS') {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        const current = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
        const updated: ExtensionSettings = { ...current, ...message.settings };
        chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated }, () => {
          sendResponse({ success: true, data: updated });
        });
      });
      return true;
    }

    // Forward other messages to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message || 'Cannot connect to webpage. Refresh the page and try again.',
          });
        } else {
          sendResponse(response);
        }
      });
    });

    return true; // Keep channel open
  }
);
