/** PostHog Cloud EU ingestion host. A project on PostHog Cloud US uses https://us.i.posthog.com instead. */
const POSTHOG_DEFAULT_HOST = 'https://eu.i.posthog.com';

/** posthog-js `defaults` snapshot: pins the library to the behaviour it shipped with on that date. */
export const POSTHOG_DEFAULTS_DATE = '2026-05-30';

/** A build-time env value, trimmed; empty when unset. Takes the value, not the name, so Vite can inline it. */
const envValue = (value: string | undefined): string => value?.trim() ?? '';

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

/** Site-wide settings. Content lives in content/status.json, not here. */
export const SITE = {
  name: 'Bubble Burst',
  question: 'Will the AI bubble burst?',
  description: 'A sourced read on the AI bubble, updated several times a day: one score from 0 to 100, the indicators behind it, four signals, a short analysis and the sources behind every claim.',
  author: 'Claude',
  builder: { name: 'proatwork', url: 'https://proatwork.ro' },
  /**
   * Applies to every analytics provider that is configured (GA4, PostHog).
   * 'none': no consent bar; analytics runs fully on every visit. Fine for a US-only audience.
   * 'advanced': consent bar; the scripts load with all storage denied until the visitor allows it.
   *   Google still receives cookieless pings and can model the missing visitors; PostHog captures
   *   nothing until the visitor chooses, then counts a decline cookielessly (only with "Cookieless
   *   server hash mode" on in the PostHog project; otherwise declined visits are dropped).
   * 'basic': consent bar; nothing is loaded from Google or PostHog until the visitor allows it.
   * Switch to 'advanced' or 'basic' before serving EU visitors.
   */
  consentMode: 'none' as 'none' | 'advanced' | 'basic',
  gaMeasurementId: envValue(import.meta.env.PUBLIC_GA_MEASUREMENT_ID),
  posthogKey: envValue(import.meta.env.PUBLIC_POSTHOG_KEY),
  posthogHost: stripTrailingSlashes(envValue(import.meta.env.PUBLIC_POSTHOG_HOST)) || POSTHOG_DEFAULT_HOST,
  url: stripTrailingSlashes(envValue(import.meta.env.PUBLIC_SITE_URL)),
} as const;

/** Display names of the analytics providers this build ships; empty when none is configured. */
export const ANALYTICS_PROVIDERS: readonly string[] = [
  ...(SITE.gaMeasurementId ? ['Google Analytics'] : []),
  ...(SITE.posthogKey ? ['PostHog'] : []),
];

export { STORAGE_KEYS } from './lib/storage-keys.ts';
