import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { CompanyProfile } from "../lib/types";

export function useProfile(symbol: string | undefined) {
  return useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => api.get<{ profile: CompanyProfile }>(`/api/profile?symbol=${symbol}`),
    enabled: !!symbol,
    staleTime: Infinity, // profiles rarely change; fetch once per session
    retry: false,
  });
}
