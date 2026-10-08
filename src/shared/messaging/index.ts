import { ExtensionSettings, PageStatusPayload } from '../types/index.js';

export type WebFixMessage =
  | { type: 'ANALYZE_PAGE' }
  | { type: 'APPLY_FIXES'; fixIds: string[] }
  | { type: 'REVERT_FIX'; fixId: string }
  | { type: 'RESTORE_ALL' }
  | { type: 'GET_STATUS' }
  | { type: 'TOGGLE_FIX'; fixId: string; enabled: boolean }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ExtensionSettings> };

export interface WebFixResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type StatusResponse = WebFixResponse<PageStatusPayload>;
