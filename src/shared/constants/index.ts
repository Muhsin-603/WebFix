import { ExtensionSettings } from '../types/index.js';

export const ATTR_WEBFIX_ID = 'data-webfix-id';
export const ATTR_WEBFIX_MODIFIED = 'data-webfix-modified';
export const ATTR_WEBFIX_IGNORED = 'data-webfix-ignore';

export const STYLE_ELEMENT_ID = 'webfix-injected-styles';
export const TABLE_WRAPPER_CLASS = 'webfix-table-wrapper';
export const STATUS_BADGE_ID = 'webfix-floating-status-badge';

export const VIEWPORT_TOLERANCE_PX = 3;
export const BUTTON_OVERFLOW_TOLERANCE_PX = 5;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  automaticMode: false,
  applyOnlySafeFixes: true,
  showNotifications: true,
};

export const STORAGE_KEYS = {
  SETTINGS: 'webfix_settings',
} as const;
