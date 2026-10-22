export function AppFooter({ footer }) {
  return (
    <footer className="w-full bg-white border-t border-slate-200 shadow-[0_-1px_4px_rgba(0,0,0,0.02)] py-space-md mt-auto">
      <div className="w-full px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm text-slate-500 font-body-sm text-body-sm">
          <span>{footer.copyright}</span>
          <span className="text-slate-300">•</span>
          <span className="text-[#0284c7] font-label-sm text-label-sm font-semibold">{footer.version}</span>
        </div>
        <div className="flex items-center gap-space-lg font-label-sm text-label-sm text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
            {footer.server}
          </span>
          <span className="text-slate-500 hover:text-slate-800 transition-colors">{footer.help}</span>
        </div>
      </div>
    </footer>
  );
}
