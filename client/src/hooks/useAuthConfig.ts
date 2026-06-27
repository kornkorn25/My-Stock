import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface AuthConfig {
  googleClientId: string;
}

/** Public feature flags (e.g. whether Google sign-in is configured). */
export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth-config"],
    queryFn: () => api.get<AuthConfig>("/api/auth/config"),
    staleTime: Infinity,
    retry: false,
  });
}
