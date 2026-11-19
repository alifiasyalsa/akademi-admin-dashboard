import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { manualInfaqService } from "../../services/manualInfaqService.js";
import { downloadCsv } from "../../services/csvExport.js";
import { formatDateDisplay, formatDateTimeDisplay, formatRupiah } from "../../services/formatters.js";

const HISTORY_CSV_COLUMNS = [
  { header: "Tanggal Transaksi", value: (r) => r.transaction_date || "" },
  { header: "Nama Santri", value: (r) => r.member_name || "" },
  { header: "Member ID", value: (r) => r.member_id ?? "" },
  { header: "Batch", value: (r) => r._batchLabel || r.batch_id || "" },
  { header: "Class ID", value: (r) => r.class_id ?? "" },
  { header: "Nominal", value: (r) => Number(r.amount) || 0 },
  { header: "Catatan", value: (r) => r.notes || "" },
  { header: "Diinput Oleh", value: (r) => r.created_by || "" },
  { header: "Waktu Input", value: (r) => r.created_at || "" },
];

export function ManualInfaqHistoryModal({
  isOpen,
  batchIds = [],
  batchOptions = [],
  onClose,
  onDelete,
  canDeleteEntry = () => true,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const batchLabelById = useMemo(() => {
    const map = new Map();
    (batchOptions || []).forEach((b) => map.set(String(b.id), b.label || `Batch ${b.id}`));
    return map;
  }, [batchOptions]);

  const scopeLabel =
    batchIds.length === 0
      ? "Semua batch"
      : batchIds.length === 1
      ? batchLabelById.get(String(batchIds[0])) || `Batch ${batchIds[0]}`
      : `${batchIds.length} batch terpilih`;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setErrorMessage("");
    manualInfaqService
      .fetchRecent({ batchIds, limit: 500 })
      .then((data) => active && setRows(data))
      .catch((err) => active && setErrorMessage(err?.message || "Gagal memuat riwayat infaq manual."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, batchIds, reloadKey]);

  useEffect(() => {
    if (isOpen) setSearchQuery("");
  }, [isOpen]);

  const filteredRows = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [row.member_name, row.notes, row.created_by, String(row.member_id), String(row.batch_id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, searchQuery]);

  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [filteredRows]
  );

  async function handleDelete(entry) {
    if (!window.confirm(`Hapus infaq manual ${formatRupiah(entry.amount)} untuk ${entry.member_name || "santri"}?`)) {
      return;
    }
    setDeletingId(entry.id);
    setErrorMessage("");
    try {
      if (onDelete) {
        await onDelete(entry);
      } else {
        await manualInfaqService.remove(entry);
      }
      setRows((prev) => prev.filter((row) => row.id !== entry.id));
    } catch (err) {
      setErrorMessage(err?.message || "Gagal menghapus transaksi.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownloadCsv() {
    if (filteredRows.length === 0) return;
    const exportRows = filteredRows.map((row) => ({
      ...row,
      _batchLabel: batchLabelById.get(String(row.batch_id)) || `Batch ${row.batch_id}`,
    }));
    downloadCsv({
      fileParts: ["infaq-manual", scopeLabel],
      rows: exportRows,
      columns: HISTORY_CSV_COLUMNS,
      context: {
        tab: "infaq_manual_history",
        filter: scopeLabel,
        search: searchQuery.trim() || null,
        total_amount: totalAmount,
      },
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <MaterialIcon name="receipt_long" className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-slate-900">Riwayat Infaq Manual</h3>
              <p className="font-body-sm text-body-sm text-slate-500">
                {scopeLabel} • hingga 500 transaksi terbaru
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Muat ulang"
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <MaterialIcon name={loading ? "hourglass_top" : "sync"} className="text-[20px]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        <div className="py-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <MaterialIcon name="search" className="absolute left-2.5 top-2 text-[16px] pointer-events-none text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama santri, catatan, atau admin..."
              className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700 tabular-nums">
            {filteredRows.length} transaksi • {formatRupiah(totalAmount)}
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={loading || filteredRows.length === 0}
            title={
              filteredRows.length === 0
                ? "Tidak ada data untuk diunduh"
                : `Download ${filteredRows.length} transaksi (sesuai filter pencarian)`
            }
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-surface hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MaterialIcon name="download" className="text-[16px] text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {errorMessage && (
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
            <MaterialIcon name="error" className="text-[16px]" />
            {errorMessage}
          </p>
        )}

        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">Memuat riwayat infaq manual...</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400 italic">
              {rows.length === 0 ? "Belum ada transaksi infaq manual." : "Tidak ada hasil untuk pencarian ini."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const batchLabel = batchLabelById.get(String(row.batch_id)) || `Batch ${row.batch_id}`;
                return (
                  <li key={row.id} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                      <MaterialIcon name="payments" className="text-[16px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-semibold">{row.member_name || `Member #${row.member_id}`}</span>
                        <span className="text-slate-500"> • {batchLabel}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatDateDisplay(row.transaction_date)}
                        {row.notes ? ` • ${row.notes}` : ""}
                        {row.created_by ? ` • oleh ${row.created_by}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-start gap-1.5">
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(row.amount)}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">{formatDateTimeDisplay(row.created_at)}</p>
                      </div>
                      {canDeleteEntry(row) ? (
                        <button
                          type="button"
                          title="Hapus transaksi"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <MaterialIcon name={deletingId === row.id ? "hourglass_top" : "delete"} className="text-[18px]" />
                        </button>
                      ) : (
                        <span title="Hanya pembuat transaksi atau super admin yang bisa menghapus" className="p-1.5 text-slate-300">
                          <MaterialIcon name="lock" className="text-[18px]" />
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
