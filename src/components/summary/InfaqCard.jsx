export function InfaqCard({ infaq }) {
  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-[#0284c7]">
          Pemenuhan Infaq Komitmen
        </span>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full tabular-nums bg-rose-50 text-rose-700 border border-rose-200">
          {infaq.overdueBadge}
        </span>
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
          <div className="h-full rounded-full transition-all duration-500 bg-[#0284c7]" style={{ width: infaq.barWidth }} />
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm">
          <span className="font-semibold tabular-nums text-[#0369a1]">{infaq.validAmount}</span>
          <span className="tabular-nums text-rose-600 font-semibold">{infaq.gapAmount}</span>
        </div>
      </div>
    </div>
  );
}
