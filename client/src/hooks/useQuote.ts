import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Quote } from "../lib/types";

export function useQuote(symbol: string | undefined) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api.get<{ quote: Quote }>(`/api/quote?symbol=${symbol}`),
    enabled: !!symbol,
    refetchInterval: 60_000,
    retry: 1,
  });
}
