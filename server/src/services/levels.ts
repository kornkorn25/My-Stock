import { DailyBar } from "./history";

export interface LevelZone {
  price: number;
  type: "support" | "resistance";
  strength: number; // 0-100, higher = more touches + more recent
  touches: number;
  lastTouch: string; // ISO date of the most recent bar that touched this zone
}

export interface SupportResistance {
  support: LevelZone[];
  resistance: LevelZone[];
}

interface Pivot {
  price: number;
  index: number;
}

// Bars on each side that must be lower/higher for a bar to count as a swing
// point. 3 catches short-term structure without reacting to every wiggle.
const LOOKBACK = 3;
// Pivots within this fraction of each other's price get merged into one zone
// — real support/resistance is a band, not a single tick.
const CLUSTER_TOLERANCE_PCT = 0.015;
// Levels further than this from the current price aren't actionable.
const MAX_DISTANCE_PCT = 0.25;
const MAX_ZONES_PER_SIDE = 3;
const MIN_BARS = LOOKBACK * 2 + 5;

/** A bar is a swing high/low if its high/low is the most extreme in the window around it. */
function findSwingPivots(bars: DailyBar[]): { highs: Pivot[]; lows: Pivot[] } {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];

  for (let i = LOOKBACK; i < bars.length - LOOKBACK; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - LOOKBACK; j <= i + LOOKBACK; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) isHigh = false;
      if (bars[j].low <= bars[i].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ price: bars[i].high, index: i });
    if (isLow) lows.push({ price: bars[i].low, index: i });
  }

  return { highs, lows };
}

/** Merge pivots that sit within CLUSTER_TOLERANCE_PCT of each other into zones. */
function clusterPivots(pivots: Pivot[]): { price: number; touches: number; lastIndex: number }[] {
  if (pivots.length === 0) return [];

  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: Pivot[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const cluster = clusters[clusters.length - 1];
    const avg = cluster.reduce((s, p) => s + p.price, 0) / cluster.length;
    if (Math.abs(sorted[i].price - avg) / avg <= CLUSTER_TOLERANCE_PCT) {
      cluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  return clusters.map((cluster) => ({
    price: cluster.reduce((s, p) => s + p.price, 0) / cluster.length,
    touches: cluster.length,
    lastIndex: Math.max(...cluster.map((p) => p.index)),
  }));
}

/**
 * Support/resistance from clustered swing highs/lows over the supplied bars
 * (expects ~1y of daily bars). Each zone is scored by how many times price
 * touched it (more = stronger) and how recently (more recent = more
 * relevant), replacing the old single-day floor-trader pivot formula, which
 * ignored all price history beyond today's high/low.
 */
export function computeSupportResistance(bars: DailyBar[], currentPrice: number): SupportResistance {
  if (bars.length < MIN_BARS || !isFinite(currentPrice) || currentPrice <= 0) {
    return { support: [], resistance: [] };
  }

  const { highs, lows } = findSwingPivots(bars);
  const clusters = clusterPivots([...highs, ...lows]);
  const lastIndex = bars.length - 1;

  const zones: LevelZone[] = clusters
    .filter((c) => Math.abs(c.price - currentPrice) / currentPrice <= MAX_DISTANCE_PCT)
    .map((c) => {
      const recency = lastIndex === 0 ? 1 : c.lastIndex / lastIndex; // 0..1, 1 = touched most recently
      const strength = Math.round(Math.min(1, c.touches / 4) * 70 + recency * 30);
      return {
        price: c.price,
        type: c.price < currentPrice ? "support" : "resistance",
        strength: Math.max(1, Math.min(100, strength)),
        touches: c.touches,
        lastTouch: new Date(bars[c.lastIndex].time * 1000).toISOString(),
      } satisfies LevelZone;
    });

  const support = zones
    .filter((z) => z.type === "support")
    .sort((a, b) => b.price - a.price) // nearest below price first
    .slice(0, MAX_ZONES_PER_SIDE);

  const resistance = zones
    .filter((z) => z.type === "resistance")
    .sort((a, b) => a.price - b.price) // nearest above price first
    .slice(0, MAX_ZONES_PER_SIDE);

  return { support, resistance };
}
