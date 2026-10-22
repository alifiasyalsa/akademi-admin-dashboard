import { MaterialIcon } from "../MaterialIcon.jsx";

export function NeedFollowupCard({
  urgentCount = 0,
  pendingPercentage = 0,
  label = "Mendesak",
  criteria = "santri melewati batas waktu follow-up (>3 hari)",
}) {
  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-white border border-slate-200 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <MaterialIcon name="history" className="text-[18px]" />
          </div>
          <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-amber-800">
            Perlu Follow-up
          </span>
        </div>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          {label}
        </span>
      </div>

      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="font-metric-xl text-metric-xl font-extrabold tracking-tight tabular-nums text-slate-900">
            {urgentCount}
          </span>
          <span className="font-body-sm text-body-sm ml-2 font-medium text-slate-500">
            {criteria}
          </span>
        </div>
        <div className="text-right">
          <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-amber-600">
            {pendingPercentage}%
          </span>
          <span className="font-body-sm text-body-sm ml-1 text-slate-400">dari pending</span>
        </div>
      </div>

      <div className="space-y-space-sm">
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
          <div
            className="h-full transition-all duration-500 bg-amber-400"
            style={{ width: `${pendingPercentage}%` }}
          />
          <div
            className="h-full transition-all duration-500 bg-slate-200"
            style={{ width: `${100 - pendingPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm text-slate-600">
          <span>Membutuhkan reminder ulang via WhatsApp</span>
          <span className="font-semibold text-amber-700">Prioritas Hari Ini</span>
        </div>
      </div>
    </div>
  );
}
