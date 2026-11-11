import { useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { formatRupiah, formatDateDisplay } from "../../services/formatters.js";

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function BreakdownLine({ label, amount, strong = false }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "pt-1.5 border-t border-slate-200 font-bold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatRupiah(amount)}</span>
    </div>
  );
}

export function ManualInfaqModal({ isOpen, student, batchLabel, onClose, onSubmit, onDelete, canDeleteEntry = () => true }) {
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayIso);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setTransactionDate(todayIso());
      setNotes("");
      setErrorMessage("");
    }
  }, [isOpen, student?.rowKey]);

  if (!isOpen || !student) return null;

  const breakdown = student.validBreakdown || { commitment: 0, classBanner: 0, manual: 0, manualEntries: [] };
  const total = breakdown.commitment + breakdown.classBanner + breakdown.manual;
  const amountNumber = Number(amount) || 0;

  async function handleSubmit(event) {
    event.preventDefault();
    if (amountNumber <= 0) {
      setErrorMessage("Nominal harus lebih dari 0.");
      return;
    }
    if (!transactionDate) {
      setErrorMessage("Tanggal transaksi wajib diisi.");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    try {
      await onSubmit({ amount: amountNumber, transactionDate, notes: notes.trim() });
      setAmount("");
      setNotes("");
    } catch (err) {
      setErrorMessage(err?.message || "Gagal menyimpan transaksi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Hapus infaq manual ${formatRupiah(entry.amount)} (${formatDateDisplay(entry.transaction_date)})?`)) {
      return;
    }
    setDeletingId(entry.id);
    setErrorMessage("");
    try {
      await onDelete(entry);
    } catch (err) {
      setErrorMessage(err?.message || "Gagal menghapus transaksi.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <MaterialIcon name="add_card" className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-slate-900">Input Manual Infaq</h3>
              <p className="font-body-sm text-body-sm text-slate-500">
                {student.name}
                {batchLabel ? ` • ${batchLabel}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Rincian Valid Masuk */}
        <div className="py-4 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-body-sm text-body-sm space-y-1.5">
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-brand-600">
              <MaterialIcon name="receipt_long" className="text-[16px]" />
              <span>Rincian Valid Masuk</span>
            </div>
            <BreakdownLine label="Infaq Komitmen (CMS)" amount={breakdown.commitment} />
            <BreakdownLine label="Transaksi Class Banner" amount={breakdown.classBanner} />
            <BreakdownLine label="Input Manual" amount={breakdown.manual} />
            <BreakdownLine label="Total Valid Masuk" amount={total} strong />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-label-sm text-label-sm font-semibold text-slate-600">Nominal (Rp)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={amount ? amountNumber.toLocaleString("id-ID") : ""}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                  placeholder="15.000"
                  className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </label>
              <label className="block">
                <span className="font-label-sm text-label-sm font-semibold text-slate-600">Tanggal Transaksi</span>
                <input
                  type="date"
                  value={transactionDate}
                  max={todayIso()}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </label>
            </div>
            <label className="block">
              <span className="font-label-sm text-label-sm font-semibold text-slate-600">Catatan (opsional)</span>
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Mis. transfer ke rekening BSI, bukti via WA"
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </label>

            {errorMessage && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                <MaterialIcon name="error" className="text-[16px]" />
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-label-md text-label-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg font-label-md text-label-md font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <MaterialIcon name={saving ? "hourglass_top" : "save"} className="text-[18px]" />
                <span>{saving ? "Menyimpan..." : "Simpan Transaksi"}</span>
              </button>
            </div>
          </form>

          {/* Riwayat input manual */}
          <div className="pt-3 border-t border-slate-100">
            <p className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Riwayat Input Manual ({breakdown.manualEntries.length})
            </p>
            {breakdown.manualEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada transaksi manual.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {breakdown.manualEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{formatRupiah(entry.amount)}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {formatDateDisplay(entry.transaction_date)}
                        {entry.notes ? ` • ${entry.notes}` : ""}
                        {entry.created_by ? ` • oleh ${entry.created_by}` : ""}
                      </p>
                    </div>
                    {canDeleteEntry(entry) ? (
                      <button
                        type="button"
                        title="Hapus transaksi"
                        disabled={deletingId === entry.id}
                        onClick={() => handleDelete(entry)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <MaterialIcon name={deletingId === entry.id ? "hourglass_top" : "delete"} className="text-[18px]" />
                      </button>
                    ) : (
                      <span title="Hanya pembuat transaksi atau super admin yang bisa menghapus" className="p-1.5 text-slate-300 shrink-0">
                        <MaterialIcon name="lock" className="text-[18px]" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
