import { MaterialIcon } from "../MaterialIcon.jsx";

export function Toast({ toast }) {
  const isVisible = Boolean(toast);

  return (
    <div
      className={`fixed top-[4.5rem] sm:top-20 left-3 right-3 sm:left-auto sm:right-8 z-50 flex items-start sm:items-center gap-space-sm bg-slate-900 text-white px-3 sm:px-space-lg py-3 rounded-xl shadow-xl transition-all duration-300 transform max-w-full sm:max-w-md ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <MaterialIcon name={toast?.icon || "check_circle"} className="text-brand-400 text-[20px] shrink-0 mt-0.5 sm:mt-0" />
      <div className="min-w-0">
        <p className="font-label-md text-label-md font-semibold text-white break-words">
          {toast?.title || "Pesan WhatsApp Disiapkan"}
        </p>
        <p className="font-body-sm text-body-sm text-slate-300 opacity-90 break-words">
          {toast?.subtitle || "Membuka generator chat resmi..."}
        </p>
      </div>
    </div>
  );
}
