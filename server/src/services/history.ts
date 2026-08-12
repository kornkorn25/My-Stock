import { TtlCache } from "./cache";

export interface DailyBar {
  time: number; // unix seconds, start of trading day
  open: number;
  high: number;
  low: number;
  close: number;
}

// Daily bars only change once a day closes, so an aggressive cache is safe
// and keeps us from hammering the upstream provider.
const cache = new TtlCache<DailyBar[]>(4 * 60 * 60);
const inflight = new Map<string, Promise<DailyBar[]>>();

/**
 * Fetch ~1y of daily OHLC bars for a symbol. Finnhub's free plan doesn't
 * include `/stock/candle` for US equities (403), so this uses Yahoo Finance's
 * public chart endpoint instead — keyless, no separate quota to manage.
 * Cached for 4h and de-duped across concurrent requests for the same symbol.
 */
export async function getDailyHistory(symbolRaw: string, range = "1y"): Promise<DailyBar[]> {
  const symbol = symbolRaw.toUpperCase().trim();
  const key = `${symbol}:${range}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = fetchHistory(symbol, range)
    .then((bars) => {
      cache.set(key, bars);
      return bars;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

async function fetchHistory(symbol: string, range: string): Promise<DailyBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=1d`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MyStockApp/1.0)" },
  });
  if (resp.status === 404) {
    throw new HttpHistoryError(404, `No price history found for symbol ${symbol}`);
  }
  if (!resp.ok) {
    throw new HttpHistoryError(502, `History provider error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }> };
      }>;
    };
  };

  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];

  const bars: DailyBar[] = [];
  if (q) {
    for (let i = 0; i < timestamps.length; i++) {
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const c = q.close?.[i];
      // Holidays / half-days come back as nulls in the parallel arrays — skip them.
      if (o == null || h == null || l == null || c == null) continue;
      bars.push({ time: timestamps[i], open: o, high: h, low: l, close: c });
    }
  }

  if (bars.length === 0) {
    throw new HttpHistoryError(404, `No price history found for symbol ${symbol}`);
  }

  return bars;
}

export class HttpHistoryError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
