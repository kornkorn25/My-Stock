import { describe, it, expect } from "vitest";
import { computeSupportResistance } from "./levels";
import { DailyBar } from "./history";

/** Flat 40-bar series (all OHLC = 100) with individual bars overridden to plant swing points. */
function makeBars(overrides: Record<number, Partial<DailyBar>> = {}, count = 40): DailyBar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 86400,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    ...overrides[i],
  }));
}

describe("computeSupportResistance", () => {
  it("returns nothing when there isn't enough history", () => {
    const bars = makeBars({}, 5);
    const r = computeSupportResistance(bars, 100);
    expect(r.support).toEqual([]);
    expect(r.resistance).toEqual([]);
  });

  it("clusters repeated swing lows into one support zone, touched twice", () => {
    const bars = makeBars({ 10: { low: 90 }, 20: { low: 90 } });
    const r = computeSupportResistance(bars, 100);
    expect(r.support).toHaveLength(1);
    expect(r.support[0].price).toBeCloseTo(90);
    expect(r.support[0].touches).toBe(2);
    expect(r.support[0].type).toBe("support");
  });

  it("clusters repeated swing highs into one resistance zone, touched twice", () => {
    const bars = makeBars({ 15: { high: 110 }, 25: { high: 110 } });
    const r = computeSupportResistance(bars, 100);
    expect(r.resistance).toHaveLength(1);
    expect(r.resistance[0].price).toBeCloseTo(110);
    expect(r.resistance[0].touches).toBe(2);
    expect(r.resistance[0].type).toBe("resistance");
  });

  it("orders support zones nearest-to-price first", () => {
    const bars = makeBars({ 10: { low: 90 }, 20: { low: 90 }, 30: { low: 95 } });
    const r = computeSupportResistance(bars, 100);
    expect(r.support.map((z) => Math.round(z.price))).toEqual([95, 90]);
  });

  it("scores a more-touched, more-recent zone higher", () => {
    const bars = makeBars({ 10: { low: 90 }, 20: { low: 90 }, 30: { low: 80 } });
    const r = computeSupportResistance(bars, 100);
    const strong = r.support.find((z) => Math.round(z.price) === 90)!;
    const weak = r.support.find((z) => Math.round(z.price) === 80)!;
    expect(strong.strength).toBeGreaterThan(weak.strength);
  });

  it("drops zones too far from the current price to be actionable", () => {
    const bars = makeBars({ 10: { low: 50 } }); // 50% below price
    const r = computeSupportResistance(bars, 100);
    expect(r.support).toEqual([]);
  });

  it("classifies a zone as support below price and resistance above", () => {
    const bars = makeBars({ 10: { low: 90 }, 20: { low: 90 }, 15: { high: 110 }, 25: { high: 110 } });
    const r = computeSupportResistance(bars, 100);
    expect(r.support.every((z) => z.price < 100)).toBe(true);
    expect(r.resistance.every((z) => z.price > 100)).toBe(true);
  });
});
