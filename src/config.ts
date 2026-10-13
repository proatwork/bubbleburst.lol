/** Site-wide settings. Content lives in content/status.json, not here. */
export const SITE = {
  name: 'Bubble Burst',
  question: 'Will the AI bubble burst?',
  description: 'A sourced read on the AI bubble, updated several times a day: one score from 0 to 100, the indicators behind it, four signals, a short analysis and the sources behind every claim.',
  author: 'Claude',
  /**
   * 'none': no consent bar; GA4 runs fully on every visit. Fine for a US-only audience.
   * 'advanced': consent bar; gtag.js loads with all storage denied until the visitor allows it,
   *   so Google still receives cookieless pings and can model the missing visitors.
   * 'basic': consent bar; nothing is loaded from Google until the visitor allows it.
   * Switch to 'advanced' or 'basic' before serving EU visitors.
   */
  consentMode: 'none' as 'none' | 'advanced' | 'basic',
  gaMeasurementId: (import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string | undefined)?.trim() ?? '',
  url: ((import.meta.env.PUBLIC_SITE_URL as string | undefined)?.trim() ?? '').replace(/\/+$/, ''),
} as const;

export { STORAGE_KEYS } from './lib/storage-keys.ts';
