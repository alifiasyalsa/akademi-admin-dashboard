import { MaterialIcon } from "../MaterialIcon.jsx";

export function AppHeader({ header }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="h-16 w-full px-margin-desktop flex items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-space-md">
            <div className="w-9 h-9 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(2,132,199,0.3)]">
              <MaterialIcon name="menu_book" className="text-[20px]" />
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-slate-900 font-bold tracking-tight">
                  QuranBest
                </span>
                <span className="font-label-sm text-label-sm text-[#0284c7] uppercase bg-sky-50 px-space-xs py-0.5 rounded border border-sky-200 font-semibold">
                  Akademi
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-slate-500 font-medium">Monitoring Kelas Terpadu</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="hidden md:flex items-center gap-space-xs px-space-md py-1 rounded-full bg-sky-50 border border-sky-200">
            <span className={`w-2 h-2 rounded-full ${header.isLive ? "bg-teal-500" : "bg-[#0284c7]"} animate-pulse`} />
            <span className="font-label-sm text-label-sm text-[#0369a1] font-semibold">{header.syncLabel}</span>
          </div>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-label-md font-semibold text-slate-900 leading-tight">{header.adminName}</p>
              <p className="font-label-sm text-label-sm text-slate-500 font-medium">{header.adminRole}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#0284c7] border border-sky-300 font-semibold">
              <MaterialIcon name="person" className="text-[#0284c7] text-[18px]" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
