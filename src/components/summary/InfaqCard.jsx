export function InfaqCard({ infaq }) {
  const byWeek = infaq?.byWeek || [];

  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-surface border border-slate-200">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-brand-600">
          Pemenuhan Infaq Komitmen
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {infaq.achievedBadge && (
            <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full tabular-nums bg-teal-50 text-teal-700 border border-teal-200">
              {infaq.achievedBadge}
            </span>
          )}
          <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full tabular-nums bg-rose-50 text-rose-700 border border-rose-200">
            {infaq.overdueBadge}
          </span>
        </div>
      </div>
      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="font-metric-xl text-metric-xl font-extrabold tracking-tight tabular-nums text-slate-900">
            {infaq.rate}
          </span>
          <span className="font-body-sm text-body-sm ml-1.5 text-slate-500">terkumpul</span>
        </div>
        <div className="text-right">
          <span className="font-label-sm text-label-sm block text-slate-500">{infaq.targetLabel}</span>
          <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-slate-800">{infaq.targetAmount}</span>
        </div>
      </div>
      <div className="space-y-space-sm">
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-100">
          <div className="h-full rounded-full transition-all duration-500 bg-brand-600" style={{ width: infaq.barWidth }} />
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm">
          <span className="font-semibold tabular-nums text-brand-700">{infaq.validAmount}</span>
          <span className="tabular-nums text-rose-600 font-semibold">{infaq.gapAmount}</span>
        </div>

        {byWeek.length > 0 && (
          <div className="pt-3 mt-1 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {infaq.achievedLabel || "Capaian Transaksi Per Pekan"}
              </p>
              {infaq.freeMembers > 0 && (
                <p className="text-[10px] text-slate-400 tabular-nums">{infaq.freeMembers} bebas biaya</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {byWeek.map((row) => {
                const pct = row.total > 0 ? (row.achieved / row.total) * 100 : 0;
                return (
                  <div
                    key={row.week}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                    title={`Pekan ${row.week}: ${row.achieved} dari ${row.total} anggota sudah menutup kewajiban s/d pekan ini`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Pk {row.week}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-brand-700">{row.rate}</span>
                    </div>
                    <p className="text-xs font-bold tabular-nums text-slate-800 mt-0.5">
                      {row.achieved}/{row.total}
                    </p>
                    <div className="mt-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
