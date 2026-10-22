import { MaterialIcon } from "../MaterialIcon.jsx";

export function Toast({ toast }) {
  const isVisible = Boolean(toast);

  return (
    <div
      className={`fixed top-20 right-8 z-50 flex items-center gap-space-sm bg-slate-900 text-white px-space-lg py-3 rounded-xl shadow-xl transition-all duration-300 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <MaterialIcon name={toast?.icon || "check_circle"} className="text-sky-400 text-[20px]" />
      <div>
        <p className="font-label-md text-label-md font-semibold text-white">{toast?.title || "Pesan WhatsApp Disiapkan"}</p>
        <p className="font-body-sm text-body-sm text-slate-300 opacity-90">
          {toast?.subtitle || "Membuka generator chat resmi..."}
        </p>
      </div>
    </div>
  );
}
