import { useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { activityLogService, ACTIVITY_LABELS } from "../../services/activityLogService.js";
import { formatDateTimeDisplay, formatRupiah } from "../../services/formatters.js";

const DOMAIN_LABELS = { infaq: "Infaq", presensi: "Presensi", registrasi: "Registrasi" };

function describeActivity(row) {
  const d = row.details || {};
  switch (row.action) {
    case "reminder.sent":
      return [DOMAIN_LABELS[d.domain] || d.domain, d.reminder_count ? `ke-${d.reminder_count}` : null, d.template]
        .filter(Boolean)
        .join(" • ");
    case "manual_infaq.create":
    case "manual_infaq.delete":
      return [formatRupiah(d.amount), d.transaction_date, d.notes].filter(Boolean).join(" • ");
    case "template.create":
    case "template.update":
      return d.title || "";
    case "template.set_default":
      return [d.category, d.status_key].filter(Boolean).join(" • ");
    case "role.update":
      return [d.email, d.role === "super_admin" ? "Super Admin" : "Admin"].filter(Boolean).join(" → ");
    case "role.delete":
      return d.email ? `${d.email} → Admin` : "";
    case "export.csv":
      return [d.tab, d.filter, d.sub_filter, d.class, d.week && `Pekan ${d.week}`, `${d.rows ?? 0} baris`]
        .filter(Boolean)
        .join(" • ");
    default:
      return "";
  }
}

export function ActivityLogModal({ isOpen, currentUser, isSuperAdmin = false, onClose }) {
  const [scopeChoice, setScope] = useState("mine");
  const scope = isSuperAdmin ? scopeChoice : "mine";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setErrorMessage("");
    activityLogService
      .fetchRecent({ userId: scope === "mine" ? currentUser?.id : null, limit: 200 })
      .then((data) => active && setRows(data))
      .catch((err) => active && setErrorMessage(err?.message || "Gagal memuat log aktivitas."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, scope, currentUser?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center">
              <MaterialIcon name="history" className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-slate-900">Log Aktivitas Akun</h3>
              <p className="font-body-sm text-body-sm text-slate-500">200 aktivitas terbaru</p>
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

        {isSuperAdmin && (
          <div className="py-3 inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 self-start mt-3">
            {[
              { id: "mine", label: "Aktivitas Saya" },
              { id: "all", label: "Semua Akun" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  scope === opt.id ? "bg-brand-200 text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-3 border border-slate-200 rounded-xl">
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">Memuat log aktivitas...</p>
          ) : errorMessage ? (
            <p className="m-4 flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <MaterialIcon name="error" className="text-[16px]" />
              {errorMessage}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400 italic">Belum ada aktivitas tercatat.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => {
                const meta = ACTIVITY_LABELS[row.action] || { label: row.action, icon: "bolt" };
                const description = describeActivity(row);
                return (
                  <li key={row.id} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <MaterialIcon name={meta.icon} className="text-[16px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-semibold">{meta.label}</span>
                        {row.member_name && <span className="text-slate-600"> — {row.member_name}</span>}
                      </p>
                      {description && <p className="text-[11px] text-slate-500 truncate">{description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold tabular-nums text-slate-700">{formatDateTimeDisplay(row.created_at)}</p>
                      {scope === "all" && (
                        <p className="text-[11px] text-slate-500 truncate max-w-[10rem]" title={row.user_email || ""}>
                          {row.user_name || row.user_email || "-"}
                        </p>
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
