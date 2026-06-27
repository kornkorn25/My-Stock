import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  PortfolioResponse,
  Holding,
  Transaction,
  TxType,
} from "../lib/types";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api.get<PortfolioResponse>("/api/portfolio"),
    // Portfolio depends on near-realtime quotes; refresh periodically.
    refetchInterval: 60_000,
  });
}

export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: () => api.get<{ holdings: Holding[] }>("/api/holdings"),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<{ transactions: Transaction[] }>("/api/transactions"),
  });
}

export interface TxInput {
  symbol: string;
  type: TxType;
  quantity: string;
  price: string;
  fee?: string;
  note?: string;
  executedAt: string;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["portfolio"] });
  qc.invalidateQueries({ queryKey: ["holdings"] });
  qc.invalidateQueries({ queryKey: ["transactions"] });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TxInput) =>
      api.post<{ transaction: Transaction }>("/api/transactions", input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TxInput> }) =>
      api.put<{ transaction: Transaction }>(`/api/transactions/${id}`, input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/api/transactions/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) =>
      api.del<{ ok: boolean }>(`/api/holdings/${symbol}`),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, targetPct }: { symbol: string; targetPct: string | null }) =>
      api.put<{ holding: Holding }>(`/api/holdings/${symbol}/target`, { targetPct }),
    onSuccess: () => invalidateAll(qc),
  });
}
