import { MaterialIcon } from "../MaterialIcon.jsx";

export function PromotedCard({ promoted }) {
  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-slate-700">
          Anggota Promoted & Konversi
        </span>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          Tahap Lanjut
        </span>
      </div>
      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="font-metric-xl text-metric-xl font-extrabold tracking-tight tabular-nums text-indigo-950">
            {promoted.pendingCount}
          </span>
          <span className="font-body-sm text-body-sm ml-1 font-medium text-slate-500">belum tentukan jadwal</span>
        </div>
        <div className="text-right">
          <span className="font-label-sm text-label-sm block text-slate-500">Total Promoted</span>
          <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-slate-800">{promoted.totalLabel}</span>
        </div>
      </div>
      <div className="space-y-space-sm">
        <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100">
          <div className="h-full transition-all duration-500 bg-indigo-600" style={{ width: promoted.chosenWidth }} />
          <div className="h-full transition-all duration-500 bg-slate-200" style={{ width: promoted.pendingWidth }} />
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm">
          <span className="font-semibold flex items-center gap-1 text-slate-700">
            <MaterialIcon name="check" className="text-[14px] text-teal-600 font-bold" /> {promoted.chosenLabel}
          </span>
          <span className="font-medium text-rose-600">{promoted.followUpLabel}</span>
        </div>
      </div>
    </div>
  );
}
