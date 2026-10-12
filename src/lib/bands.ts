export type BandId = 'calm' | 'inflating' | 'stretched' | 'critical' | 'burst';

export interface Band {
  id: BandId;
  label: string;
  min: number;
  max: number;
  /** One line a first-time visitor can read to understand the band. */
  meaning: string;
}

export type Direction = 'up' | 'down' | 'flat';

export interface Delta {
  value: number;
  direction: Direction;
}

export const PRESSURE_MIN = 0;
export const PRESSURE_MAX = 100;

export const BANDS: readonly Band[] = [
  { id: 'calm', label: 'Calm', min: 0, max: 24, meaning: 'Prices roughly track earnings. Nothing to pop.' },
  { id: 'inflating', label: 'Inflating', min: 25, max: 49, meaning: 'Spending and valuations are running ahead of revenue.' },
  { id: 'stretched', label: 'Stretched', min: 50, max: 74, meaning: 'Most classic bubble signals are flashing. Timing is the open question.' },
  { id: 'critical', label: 'Critical', min: 75, max: 99, meaning: 'Cracks are visible. One trigger could do it.' },
  { id: 'burst', label: 'Burst', min: 100, max: 100, meaning: 'It popped.' },
];

export function bandFor(pressure: number): Band {
  if (!Number.isInteger(pressure) || pressure < PRESSURE_MIN || pressure > PRESSURE_MAX) {
    throw new RangeError(`pressure must be an integer between ${PRESSURE_MIN} and ${PRESSURE_MAX}, got ${pressure}`);
  }
  const band = BANDS.find((b) => pressure >= b.min && pressure <= b.max);
  if (!band) throw new RangeError(`no band covers pressure ${pressure}`);
  return band;
}

export function deltaFor(pressure: number, previous: number | undefined): Delta | null {
  if (previous === undefined) return null;
  const value = pressure - previous;
  const direction: Direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return { value, direction };
}
