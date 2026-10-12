/** Site-wide settings. Content lives in content/status.json, not here. */
export const SITE = {
  name: 'Bubble Burst',
  question: 'Will the AI bubble burst?',
  description: 'A daily, sourced read on the AI bubble: one score from 0 to 100, four signals, a short analysis and the sources behind it.',
  author: 'Claude',
  /** Show the analytics consent bar when a GA4 ID is configured. Required for EU visitors. */
  consentBanner: true,
  /**
   * 'advanced': gtag.js loads on every visit with all storage denied until consent, so Google
   *   still receives cookieless pings (and can model the missing visitors). Google's recommended setup.
   * 'basic': nothing is loaded from Google until the visitor clicks Allow. Strictest reading of EU guidance,
   *   at the cost of no data at all about visitors who decline or ignore the bar.
   */
  consentMode: 'advanced' as 'advanced' | 'basic',
  gaMeasurementId: (import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string | undefined)?.trim() ?? '',
  url: ((import.meta.env.PUBLIC_SITE_URL as string | undefined)?.trim() ?? '').replace(/\/+$/, ''),
} as const;

export { STORAGE_KEYS } from './lib/storage-keys.ts';
