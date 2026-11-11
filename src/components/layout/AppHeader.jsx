import { MaterialIcon } from "../MaterialIcon.jsx";

export function AppHeader({ header, onOpenActivity, onOpenRoles, onSignOut }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="h-16 w-full px-margin-desktop flex items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-space-md">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-[0_2px_8px_rgba(178,58,112,0.3)]">
              <MaterialIcon name="menu_book" className="text-[20px]" />
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-slate-900 font-bold tracking-tight">
                  QuranBest
                </span>
                <span className="font-label-sm text-label-sm text-brand-600 uppercase bg-brand-50 px-space-xs py-0.5 rounded border border-brand-200 font-semibold">
                  Akademi
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-slate-500 font-medium">Monitoring Kelas Terpadu</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="hidden md:flex items-center gap-space-xs px-space-md py-1 rounded-full bg-brand-50 border border-brand-200">
            <span className={`w-2 h-2 rounded-full ${header.isLive ? "bg-teal-500" : "bg-brand-600"} animate-pulse`} />
            <span className="font-label-sm text-label-sm text-brand-700 font-semibold">{header.syncLabel}</span>
          </div>
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-label-md font-semibold text-slate-900 leading-tight flex items-center justify-end gap-1.5">
                {header.roleBadge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      header.roleBadge === "Super Admin"
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {header.roleBadge}
                  </span>
                )}
                {header.adminName}
              </p>
              <p className="font-label-sm text-label-sm text-slate-500 font-medium">{header.adminRole}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 border border-brand-300 font-semibold">
              <MaterialIcon name="person" className="text-brand-600 text-[18px]" />
            </div>
          </div>
          {onOpenActivity && (
            <button
              type="button"
              onClick={onOpenActivity}
              title="Log aktivitas akun"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <MaterialIcon name="history" className="text-[16px]" />
              <span className="hidden lg:inline">Aktivitas</span>
            </button>
          )}
          {onOpenRoles && (
            <button
              type="button"
              onClick={onOpenRoles}
              title="Kelola peran akun (Super Admin)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors cursor-pointer"
            >
              <MaterialIcon name="admin_panel_settings" className="text-[16px]" />
              <span className="hidden lg:inline">Kelola Akun</span>
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Keluar dari akun"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            >
              <MaterialIcon name="logout" className="text-[16px]" />
              <span className="hidden lg:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
