import { MaterialIcon } from "../MaterialIcon.jsx";

export function TableToolbar({
  tabs,
  activeTab,
  searchQuery,
  onTabChange,
  onSearchChange,
  onRefresh,
}) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between gap-3 bg-white border-b border-slate-200 flex-nowrap overflow-x-auto">
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.countStyle === "badge" ? (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  {tab.count}
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${isActive ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative w-48 lg:w-56">
          <MaterialIcon name="search" className="absolute left-2.5 top-2 text-[16px] pointer-events-none text-slate-400" />
          <input
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
            placeholder="Cari santri/kontak..."
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="p-1.5 rounded-lg transition-all bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer shrink-0"
          title="Refresh Data"
          onClick={onRefresh}
        >
          <MaterialIcon name="sync" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
