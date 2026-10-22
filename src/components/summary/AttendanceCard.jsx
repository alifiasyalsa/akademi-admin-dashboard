export function AttendanceCard({ attendance }) {
  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-[#0284c7]">
          Partisipasi & Presensi Pekan Ini
        </span>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-[#0369a1] border border-sky-200">
          {attendance.weekBadge}
        </span>
      </div>
      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="font-metric-xl text-metric-xl font-extrabold tracking-tight tabular-nums text-slate-900">
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
        <div className="flex items-center justify-between font-label-sm text-label-sm pt-1 text-slate-600">
          {attendance.legend.map((item) => (
            <span key={item.label} className={`flex items-center gap-1 ${item.textClass}`}>
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`} /> {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
