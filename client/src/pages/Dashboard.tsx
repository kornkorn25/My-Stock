import { useState } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { SummaryCards } from "../components/SummaryCards";
import { AllocationPie } from "../components/AllocationPie";
import { HoldingsTable } from "../components/HoldingsTable";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { TxType } from "../lib/types";

export function Dashboard() {
  const { data, isLoading, isError, error } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialSymbol, setInitialSymbol] = useState("");
  const [initialType, setInitialType] = useState<TxType>("BUY");

  function openAdd() {
    setInitialSymbol("");
    setInitialType("BUY");
    setModalOpen(true);
  }
  function openSell(symbol: string) {
    setInitialSymbol(symbol);
    setInitialType("SELL");
    setModalOpen(true);
  }

  const positions = data?.positions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          + Add Transaction
        </button>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Loading your portfolio…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          Failed to load portfolio: {(error as Error)?.message}
        </div>
      )}

      {data && (
        <>
          <SummaryCards summary={data.summary} />

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
              <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Allocation</h2>
              <AllocationPie positions={positions} />
            </div>
            <div className="lg:col-span-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Holdings</h2>
              <HoldingsTable positions={positions} onSell={openSell} />
            </div>
          </div>
        </>
      )}

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        positions={positions}
        initialSymbol={initialSymbol}
        initialType={initialType}
      />
    </div>
  );
}
