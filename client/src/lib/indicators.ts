// Classic floor-trader pivot points. Support (S1/S2/S3) and resistance
// (R1/R2/R3) are derived from a period's high, low and close. We feed the
// daily high/low and the previous close from the Finnhub quote, which gives a
// practical set of intraday support/resistance levels to decide entries.

export interface PivotLevels {
  pivot: number;
  s1: number;
  s2: number;
  s3: number;
  r1: number;
  r2: number;
  r3: number;
}

export function computePivots(high: number, low: number, close: number): PivotLevels | null {
  if (!isFinite(high) || !isFinite(low) || !isFinite(close) || high <= 0 || low <= 0) {
    return null;
  }
  const p = (high + low + close) / 3;
  const range = high - low;
  return {
    pivot: p,
    s1: 2 * p - high,
    s2: p - range,
    s3: low - 2 * (high - p),
    r1: 2 * p - low,
    r2: p + range,
    r3: high + 2 * (p - low),
  };
}
