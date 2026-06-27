import { env } from "../lib/env";
import { TtlCache } from "./cache";

export interface Quote {
  symbol: string;
  current: number; // c
  change: number; // d
  percentChange: number; // dp
  high: number; // h
  low: number; // l
  open: number; // o
  previousClose: number; // pc
  fetchedAt: string;
}

const cache = new TtlCache<Quote>(env.quoteCacheTtl);

// De-duplicate concurrent fetches for the same symbol.
const inflight = new Map<string, Promise<Quote>>();

/**
 * Fetch a quote from Finnhub with TTL caching. The API key never leaves the
 * server. Returns cached data within the TTL window to stay under rate limits.
 */
export async function getQuote(symbolRaw: string): Promise<Quote> {
  const symbol = symbolRaw.toUpperCase().trim();

  const cached = cache.get(symbol);
  if (cached) return cached;

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const p = fetchQuote(symbol)
    .then((q) => {
      cache.set(symbol, q);
      return q;
    })
    .finally(() => {
      inflight.delete(symbol);
    });

  inflight.set(symbol, p);
  return p;
}

async function fetchQuote(symbol: string): Promise<Quote> {
  if (!env.finnhubApiKey) {
    throw new HttpQuoteError(
      503,
      "FINNHUB_API_KEY is not configured on the server"
    );
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    symbol
  )}&token=${env.finnhubApiKey}`;

  const resp = await fetch(url);
  if (resp.status === 429) {
    throw new HttpQuoteError(429, "Finnhub rate limit reached, try again shortly");
  }
  if (!resp.ok) {
    throw new HttpQuoteError(502, `Finnhub error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    c: number; d: number; dp: number; h: number; l: number; o: number; pc: number;
  };

  // Finnhub returns c=0 for unknown symbols.
  if (!data || data.c === 0) {
    throw new HttpQuoteError(404, `No quote found for symbol ${symbol}`);
  }

  return {
    symbol,
    current: data.c,
    change: data.d,
    percentChange: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    fetchedAt: new Date().toISOString(),
  };
}

export class HttpQuoteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  logo: string | null;
  exchange: string | null;
  industry: string | null;
  currency: string | null;
}

// Profiles barely change — cache for a day.
const profileCache = new TtlCache<CompanyProfile>(60 * 60 * 24);
const profileInflight = new Map<string, Promise<CompanyProfile>>();

/** Fetch company profile (name + logo) from Finnhub, cached for 24h. */
export async function getProfile(symbolRaw: string): Promise<CompanyProfile> {
  const symbol = symbolRaw.toUpperCase().trim();

  const cached = profileCache.get(symbol);
  if (cached) return cached;

  const existing = profileInflight.get(symbol);
  if (existing) return existing;

  const p = fetchProfile(symbol)
    .then((prof) => {
      profileCache.set(symbol, prof);
      return prof;
    })
    .finally(() => profileInflight.delete(symbol));

  profileInflight.set(symbol, p);
  return p;
}

async function fetchProfile(symbol: string): Promise<CompanyProfile> {
  if (!env.finnhubApiKey) {
    throw new HttpQuoteError(503, "FINNHUB_API_KEY is not configured on the server");
  }
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
    symbol
  )}&token=${env.finnhubApiKey}`;

  const resp = await fetch(url);
  if (resp.status === 429) {
    throw new HttpQuoteError(429, "Finnhub rate limit reached, try again shortly");
  }
  if (!resp.ok) {
    throw new HttpQuoteError(502, `Finnhub error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    name?: string;
    logo?: string;
    exchange?: string;
    finnhubIndustry?: string;
    currency?: string;
  };

  // Finnhub returns {} for unknown symbols.
  if (!data || !data.name) {
    throw new HttpQuoteError(404, `No company profile found for symbol ${symbol}`);
  }

  return {
    symbol,
    name: data.name,
    logo: data.logo || null,
    exchange: data.exchange || null,
    industry: data.finnhubIndustry || null,
    currency: data.currency || null,
  };
}
