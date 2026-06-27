import { useState } from "react";
import {
  useTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
} from "../hooks/usePortfolio";
import { Transaction } from "../lib/types";
import { money, shares, formatDate } from "../lib/format";
import { ApiError } from "../lib/api";

export function History() {
  const { data, isLoading, isError, error } = useTransactions();
  const del = useDeleteTransaction();
  const update = useUpdateTransaction();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Transaction>>({});
  const [rowError, setRowError] = useState<string | null>(null);

  const txs = data?.transactions ?? [];

  function startEdit(t: Transaction) {
    setEditing(t.id);
    setRowError(null);
    setDraft({
      symbol: t.symbol,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      executedAt: t.executedAt.slice(0, 10),
      note: t.note ?? "",
    });
  }

  async function saveEdit(id: string) {
    setRowError(null);
    try {
      await update.mutateAsync({
        id,
        input: {
          symbol: draft.symbol,
          type: draft.type,
          quantity: draft.quantity,
          price: draft.price,
          fee: draft.fee || "0",
          note: draft.note || undefined,
          executedAt: draft.executedAt
            ? new Date(draft.executedAt).toISOString()
            : undefined,
        },
      });
      setEditing(null);
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this transaction? Holdings will be recalculated.")) return;
    setRowError(null);
    try {
      await del.mutateAsync(id);
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold dark:text-white">Transaction History</h1>

      {isLoading && <div className="text-slate-400">Loading…</div>}
      {isError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {(error as Error)?.message}
        </div>
      )}
      {rowError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{rowError}</div>
      )}

      {data && txs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          No transactions yet.
        </div>
      )}

      {txs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[760px] text-sm dark:text-slate-200">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Symbol</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3 text-right">Fee</th>
                <th className="px-3 py-3">Note</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) =>
                editing === t.id ? (
                  <tr key={t.id} className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={draft.executedAt as string}
                        onChange={(e) => setDraft({ ...draft, executedAt: e.target.value })}
                        className="w-32 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.symbol}
                        onChange={(e) =>
                          setDraft({ ...draft, symbol: e.target.value.toUpperCase() })
                        }
                        className="w-16 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-xs uppercase"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          setDraft({ ...draft, type: e.target.value as Transaction["type"] })
                        }
                        className="rounded border border-slate-300 px-1 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={draft.fee}
                        onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                        className="w-16 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.note ?? ""}
                        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                        className="w-28 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveEdit(t.id)}
                          disabled={update.isPending}
                          className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3">{formatDate(t.executedAt)}</td>
                    <td className="px-3 py-3 font-semibold dark:text-white">{t.symbol}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          t.type === "BUY"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{shares(t.quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(t.price)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(t.fee)}</td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{t.note}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(t.id)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
