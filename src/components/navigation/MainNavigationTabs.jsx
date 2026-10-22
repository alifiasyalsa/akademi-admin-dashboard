import { MaterialIcon } from "../MaterialIcon.jsx";

export function MainNavigationTabs({
  activeTab,
  onTabChange,
  pendingCount = 0,
}) {
  const displayCount = Number(pendingCount) || 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-slate-200 pb-space-sm pt-space-xs">
      <div className="inline-flex p-1.5 bg-slate-100 rounded-xl border border-slate-200 gap-1.5">
        <button
          type="button"
          onClick={() => onTabChange("monitoring")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all cursor-pointer ${
            activeTab === "monitoring"
              ? "bg-[#0284c7] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          }`}
        >
          <MaterialIcon name="monitoring" className="text-[18px]" />
          <span>Monitoring Kelas &amp; Infaq</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("registrasi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all cursor-pointer ${
            activeTab === "registrasi"
              ? "bg-[#0284c7] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          }`}
        >
          <MaterialIcon name="how_to_reg" className="text-[18px]" />
          <span>Registrasi</span>
          <span
            className={`px-2 py-0.5 rounded-full font-bold text-[11px] leading-none ${
              activeTab === "registrasi"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {displayCount}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-space-sm text-slate-500 font-label-sm text-label-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            displayCount > 0 ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
        <span className="font-medium">
          {displayCount} Santri perlu penanganan pemilihan kelas
        </span>
      </div>
    </div>
  );
}
