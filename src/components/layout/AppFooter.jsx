export function AppFooter({ footer }) {
  return (
    <footer className="w-full bg-surface border-t border-slate-200 shadow-[0_-1px_4px_rgba(0,0,0,0.02)] py-3 sm:py-space-md mt-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="w-full px-3 sm:px-margin-tablet lg:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-space-sm text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-space-sm gap-y-1 text-slate-500 font-body-sm text-body-sm">
          <span>{footer.copyright}</span>
          <span className="text-slate-300">•</span>
          <span className="text-brand-600 font-label-sm text-label-sm font-semibold">{footer.version}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-space-lg gap-y-1 font-label-sm text-label-sm text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
            {footer.server}
          </span>
          <span className="text-slate-500 hover:text-slate-800 transition-colors">{footer.help}</span>
        </div>
      </div>
    </footer>
  );
}
