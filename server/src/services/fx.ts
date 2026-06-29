import { TtlCache } from "./cache";

export interface FxRate {
  base: string; // e.g. "USD"
  quote: string; // e.g. "THB"
  rate: number; // 1 base = rate quote
  fetchedAt: string;
}

// FX rates barely move minute-to-minute; an hour cache is plenty and keeps us
// well under the free provider's limits.
const cache = new TtlCache<FxRate>(60 * 60);
const inflight = new Map<string, Promise<FxRate>>();

/**
 * Fetch a spot FX rate (base -> quote) from a free, key-less provider, cached
 * for an hour. Used to let the UI show portfolio values in THB as well as USD.
 */
export async function getFxRate(baseRaw: string, quoteRaw: string): Promise<FxRate> {
  const base = baseRaw.toUpperCase().trim();
  const quote = quoteRaw.toUpperCase().trim();
  const key = `${base}:${quote}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = fetchRate(base, quote)
    .then((r) => {
      cache.set(key, r);
      return r;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

async function fetchRate(base: string, quote: string): Promise<FxRate> {
  // open.er-api.com is free and needs no API key. It returns all rates for a
  // base currency; we pick out the one we want.
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new HttpFxError(502, `FX provider error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };

  const rate = data?.rates?.[quote];
  if (data?.result !== "success" || typeof rate !== "number") {
    throw new HttpFxError(502, `No FX rate for ${base}->${quote}`);
  }

  return {
    base,
    quote,
    rate,
    fetchedAt: new Date().toISOString(),
  };
}

export class HttpFxError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
