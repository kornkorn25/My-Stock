import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "../lib/api";
import { Currency, formatMoney, formatSigned } from "../lib/format";

interface FxResponse {
  base: string;
  quote: string;
  rate: number;
  fetchedAt: string;
}

interface CurrencyState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggle: () => void;
  /** USD -> THB spot rate; 0 until the rate has loaded. */
  rate: number;
  rateUpdatedAt: string | null;
  rateLoading: boolean;
  rateError: boolean;
}

const CurrencyContext = createContext<CurrencyState | undefined>(undefined);
const STORAGE_KEY = "spt_currency";

function getInitial(): Currency {
  return localStorage.getItem(STORAGE_KEY) === "THB" ? "THB" : "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(getInitial);

  const fx = useQuery({
    queryKey: ["fx", "USD", "THB"],
    queryFn: () => api.get<FxResponse>("/api/fx?base=USD&quote=THB"),
    enabled: !!getToken(),
    staleTime: 60 * 60 * 1000, // 1h
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });

  const setCurrency = useCallback((c: Currency) => {
    localStorage.setItem(STORAGE_KEY, c);
    setCurrencyState(c);
  }, []);

  const toggle = useCallback(() => {
    setCurrencyState((c) => {
      const next: Currency = c === "USD" ? "THB" : "USD";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value: CurrencyState = {
    currency,
    setCurrency,
    toggle,
    rate: fx.data?.rate ?? 0,
    rateUpdatedAt: fx.data?.fetchedAt ?? null,
    rateLoading: fx.isLoading,
    rateError: fx.isError,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/**
 * Currency-aware money formatters bound to the active currency + live FX rate.
 * Falls back to USD if THB is selected but the rate hasn't loaded yet, so values
 * are never silently wrong.
 */
export function useMoney() {
  const { currency, rate } = useCurrency();
  const effective: Currency = currency === "THB" && rate > 0 ? "THB" : "USD";

  return useMemo(
    () => ({
      currency: effective,
      money: (v: string | number | null | undefined, opts?: { dp?: number }) =>
        formatMoney(v, effective, rate, opts),
      signed: (v: string | number | null | undefined) =>
        formatSigned(v, effective, rate),
    }),
    [effective, rate]
  );
}
