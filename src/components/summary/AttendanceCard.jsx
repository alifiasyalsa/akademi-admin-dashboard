export function AttendanceCard({ attendance }) {
  const byLevel = attendance?.byLevel || [];

  return (
    <div className="rounded-xl p-3 sm:p-space-lg shadow-sm flex flex-col justify-between bg-surface border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-brand-600">
          Partisipasi & Presensi Pekan Ini
        </span>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
          {attendance.weekBadge}
        </span>
      </div>
      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="text-[28px] leading-9 sm:font-metric-xl sm:text-metric-xl font-extrabold tracking-tight tabular-nums text-slate-900">
            {attendance.rate}
          </span>
          <span className="font-body-sm text-body-sm ml-1.5 font-medium text-slate-500">tingkat kehadiran</span>
        </div>
        <div className="text-right">
          <span className="font-headline-md text-headline-md font-bold tabular-nums text-slate-800">
            {attendance.studentCount}
          </span>
          <span className="font-body-sm text-body-sm ml-0.5 text-slate-500">Anggota</span>
        </div>
      </div>
      <div className="space-y-space-sm">
        <div className="w-full h-2.5 rounded-full flex overflow-hidden bg-slate-100">
          {attendance.bar.map((segment) => (
            <div
              key={segment.key}
              className={`h-full transition-all duration-500 ${segment.className}`}
              style={{ width: segment.width }}
              title={segment.title}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-label-sm text-label-sm pt-1 text-slate-600">
          {attendance.legend.map((item) => (
            <span key={item.label} className={`flex items-center gap-1 ${item.textClass}`}>
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`} /> {item.label}
            </span>
          ))}
        </div>

        {byLevel.length > 0 && (
          <div className="pt-3 mt-1 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Per Level (Pekan Ini)
              </p>
              <p className="text-[10px] text-slate-400">Urut partisipasi terbesar</p>
            </div>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {byLevel.map((row, index) => (
                <li
                  key={row.level}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5"
                  title={`${row.level}: ${row.hadir} hadir • ${row.tidakHadir} tidak hadir • ${row.belumDiisi} belum diisi • ${row.belumBerjalan} belum berjalan`}
                >
                  <span className="w-5 h-5 rounded-md bg-surface border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0 tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{row.level}</p>
                    <p className="text-[10px] text-slate-500 tabular-nums">
                      {row.students} anggota ({row.share}) • {row.hadir}H / {row.tidakHadir}A
                      {row.belumDiisi > 0 ? ` • ${row.belumDiisi} belum diisi` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums text-brand-700">{row.rate}</p>
                    <p className="text-[10px] text-slate-400">kehadiran</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
