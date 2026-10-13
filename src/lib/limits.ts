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
  /** News sources plus one page per indicator reading; the routine keeps news to 4–6. */
  sourcesMax: 30,
  sourceTitleMax: 160,
  publisherMax: 60,
  generatedByMax: 60,

  /** The indicator basket: scored series behind the pressure number. */
  indicatorsMin: 1,
  indicatorsMax: 20,
  indicatorIdMax: 40,
  indicatorLabelMax: 56,
  indicatorUnitMax: 28,
  indicatorDetailMax: 64,
  indicatorWeightMin: 0.5,
  indicatorWeightMax: 2,
  /** How far the published indicatorScore may sit from the weighted mean of the listed scores. */
  compositeTolerance: 1,
  newsAdjustmentMax: 5,
  compositeReasonMax: 160,

  /** Unscored "fundamentals check" tiles: the counter-evidence the score ignores on purpose. */
  fundamentalsMin: 1,
  fundamentalsMax: 3,
} as const;
