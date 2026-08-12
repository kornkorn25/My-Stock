import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { LevelsResponse } from "../lib/types";

/**
 * Support/resistance zones from ~1y of daily swing highs/lows (see
 * server/src/services/levels.ts). Keyed on symbol only — `price` rides along
 * in the request via closure so a normal quote-driven re-render doesn't
 * refetch on every tick, only on an interval or when the symbol changes.
 */
export function useLevels(symbol: string | undefined, price: number | undefined) {
  return useQuery({
    queryKey: ["levels", symbol],
    queryFn: () => api.get<LevelsResponse>(`/api/levels?symbol=${symbol}&price=${price}`),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
