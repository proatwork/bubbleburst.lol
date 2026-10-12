/** Length and count limits for content/status.json. One place, so the page always fits a single screen. */
export const LIMITS = {
  headlineMax: 70,
  summaryMax: 260,
  signalsMin: 3,
  signalsMax: 4,
  signalLabelMax: 36,
  signalValueMax: 18,
  signalNoteMax: 72,
  analysisMin: 2,
  analysisMax: 3,
  paragraphMax: 520,
  sourcesMin: 3,
  sourcesMax: 10,
  sourceTitleMax: 160,
  publisherMax: 60,
  generatedByMax: 60,
} as const;
