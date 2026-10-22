import { MaterialIcon } from "../MaterialIcon.jsx";

export function UnselectedClassCard({
  count = 0,
  totalBatchStudents = 0,
  percentage = 0,
  selectedCount = 0,
  batchLabel = "Batch",
}) {
  return (
    <div className="rounded-xl p-space-lg shadow-sm flex flex-col justify-between bg-white border border-slate-200 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] border border-sky-200 flex items-center justify-center">
            <MaterialIcon name="calendar_today" className="text-[18px]" />
          </div>
          <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-[#0284c7]">
            Belum Memilih Kelas
          </span>
        </div>
        <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-[#0369a1] border border-sky-200">
          {batchLabel}
        </span>
      </div>

      <div className="my-space-md flex items-baseline justify-between">
        <div>
          <span className="font-metric-xl text-metric-xl font-extrabold tracking-tight tabular-nums text-slate-900">
            {count}
          </span>
          <span className="font-body-sm text-body-sm ml-2 font-medium text-slate-500">
            dari {totalBatchStudents} total pendaftar batch 
          </span>
        </div>
        <div className="text-right">
          <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-[#0284c7]">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="space-y-space-sm">
        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#0284c7]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between font-label-sm text-label-sm text-slate-600">
          <span>
            {percentage}% dari total {batchLabel.toLowerCase()} belum menentukan kelas
          </span>
          <span className="font-semibold text-slate-700">
            {selectedCount} Pendaftar Telah Memilih Kelas
          </span>
        </div>
      </div>
    </div>
  );
}
