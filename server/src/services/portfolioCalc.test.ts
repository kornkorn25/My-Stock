import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  recomputeHolding,
  valuePosition,
  allocationPct,
  LedgerTx,
} from "./portfolioCalc";

const d = (v: Decimal.Value) => new Decimal(v);

describe("recomputeHolding - average cost on BUY", () => {
  it("computes weighted average cost across two buys", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
      { type: "BUY", quantity: 10, price: 200, executedAt: "2024-01-02" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("20");
    expect(r.avgCost.toString()).toBe("150"); // (1000+2000)/20
    expect(r.realizedPnl.toString()).toBe("0");
  });

  it("rolls fees into cost basis", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, fee: 10, executedAt: "2024-01-01" },
    ];
    const r = recomputeHolding(txs);
    // (1000 + 10) / 10 = 101
    expect(r.avgCost.toString()).toBe("101");
  });
});

describe("recomputeHolding - fractional shares", () => {
  it("handles PLTR 0.1234 @ 120 precisely", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: "0.1234", price: 120, executedAt: "2024-01-01" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("0.1234");
    expect(r.avgCost.toString()).toBe("120");
    // market value sanity
    const v = valuePosition(r.quantity, r.avgCost, 120);
    expect(v.costBasis.toString()).toBe("14.808"); // 0.1234 * 120
  });

  it("averages two fractional buys without float drift", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: "0.1", price: "0.1", executedAt: "2024-01-01" },
      { type: "BUY", quantity: "0.2", price: "0.2", executedAt: "2024-01-02" },
    ];
    const r = recomputeHolding(txs);
    // cost = 0.01 + 0.04 = 0.05 ; qty 0.3 ; avg = 0.16666...
    expect(r.quantity.toString()).toBe("0.3");
    expect(d(r.avgCost).toDecimalPlaces(10).toString()).toBe("0.1666666667");
  });
});

describe("recomputeHolding - SELL", () => {
  it("realizes profit and keeps avgCost on partial sell", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 4, price: 150, executedAt: "2024-01-03" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("6");
    expect(r.avgCost.toString()).toBe("100"); // unchanged on sell
    expect(r.realizedPnl.toString()).toBe("200"); // (150-100)*4
  });

  it("subtracts fee from realized pnl", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 4, price: 150, fee: 5, executedAt: "2024-01-03" },
    ];
    const r = recomputeHolding(txs);
    expect(r.realizedPnl.toString()).toBe("195"); // 200 - 5
  });

  it("closes position and resets avgCost when selling all", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 10, price: 120, executedAt: "2024-01-03" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("0");
    expect(r.avgCost.toString()).toBe("0");
    expect(r.realizedPnl.toString()).toBe("200");
  });

  it("realizes a loss correctly", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 5, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 5, price: 80, executedAt: "2024-01-03" },
    ];
    const r = recomputeHolding(txs);
    expect(r.realizedPnl.toString()).toBe("-100"); // (80-100)*5
  });

  it("throws when selling more than held", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 3, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 5, price: 120, executedAt: "2024-01-02" },
    ];
    expect(() => recomputeHolding(txs)).toThrow(/Cannot sell/);
  });

  it("supports re-buying after a full close", () => {
    const txs: LedgerTx[] = [
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
      { type: "SELL", quantity: 10, price: 120, executedAt: "2024-01-02" },
      { type: "BUY", quantity: 5, price: 90, executedAt: "2024-01-03" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("5");
    expect(r.avgCost.toString()).toBe("90");
    expect(r.realizedPnl.toString()).toBe("200"); // retained from earlier sell
  });

  it("replays out-of-order input by executedAt", () => {
    const txs: LedgerTx[] = [
      { type: "SELL", quantity: 4, price: 150, executedAt: "2024-01-03" },
      { type: "BUY", quantity: 10, price: 100, executedAt: "2024-01-01" },
    ];
    const r = recomputeHolding(txs);
    expect(r.quantity.toString()).toBe("6");
    expect(r.realizedPnl.toString()).toBe("200");
  });
});

describe("valuePosition", () => {
  it("computes unrealized pnl and pct", () => {
    const v = valuePosition(10, 100, 150);
    expect(v.marketValue.toString()).toBe("1500");
    expect(v.costBasis.toString()).toBe("1000");
    expect(v.unrealizedPnl.toString()).toBe("500");
    expect(v.unrealizedPnlPct.toString()).toBe("50");
  });

  it("returns 0 pct for zero cost basis", () => {
    const v = valuePosition(0, 0, 150);
    expect(v.unrealizedPnlPct.toString()).toBe("0");
  });
});

describe("allocationPct", () => {
  it("computes share of total", () => {
    expect(allocationPct(250, 1000).toString()).toBe("25");
  });
  it("returns 0 when total is zero", () => {
    expect(allocationPct(0, 0).toString()).toBe("0");
  });
});
