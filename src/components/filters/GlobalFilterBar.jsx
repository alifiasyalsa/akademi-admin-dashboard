import { MaterialIcon } from "../MaterialIcon.jsx";
import { SearchableSelect } from "./SearchableSelect.jsx";

export function GlobalFilterBar({
  filters,
  selection,
  onSelectionChange,
  activeMainTab = "monitoring",
}) {
  const isRegistrasi = activeMainTab === "registrasi";

  const selectedClassObj = filters?.classes?.find(
    (c) => String(c.id) === String(selection.classId)
  );
  const selectedWeekObj = filters?.weeks?.find(
    (w) => String(w.id) === String(selection.weekId)
  );

  return (
    <section className="bg-white rounded-xl p-space-lg shadow-sm border border-slate-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-sky-50 text-[#0284c7] border border-sky-200">
            <MaterialIcon
              name={isRegistrasi ? "space_dashboard" : "grid_view"}
              className="text-[26px] text-[#0284c7]"
            />
          </div>
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-500 font-semibold">
                Active Control Plane
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
              <span className="font-label-sm text-label-sm font-semibold text-[#0284c7]">
                Live Monitor
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-slate-900">
              Workbench Monitoring Akademik
            </h1>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 overflow-x-auto">
          {/* Batch Selector (Aktif di kedua tab) */}
          <SearchableSelect
            options={filters.batches}
            value={selection.batchId}
            onChange={(newBatchId) =>
              onSelectionChange({ ...selection, batchId: newBatchId })
            }
            placeholder="Pilih Batch..."
            searchPlaceholder="Ketik nomor/nama batch..."
            minWidth="min-w-[170px]"
          />

          <div className="h-5 w-[1px] hidden sm:block bg-slate-300" />

          {/* Kelas Selector */}
          {isRegistrasi ? (
            <div
              className="hidden md:flex items-center gap-2 opacity-40 cursor-not-allowed bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 select-none"
              title="Filter kelas dinonaktifkan di tab Registrasi (santri belum memilih kelas)"
            >
              <MaterialIcon name="school" className="text-[18px] text-slate-400" />
              <span className="font-label-sm text-label-sm font-medium text-slate-400">
                {selectedClassObj?.label || "Tahsin Lanjutan A • Sabtu 08:00"}
              </span>
              <MaterialIcon name="lock" className="text-[14px] text-slate-400" />
            </div>
          ) : (
            <SearchableSelect
              options={filters.classes}
              value={selection.classId}
              onChange={(newClassId) =>
                onSelectionChange({ ...selection, classId: newClassId })
              }
              placeholder="Pilih Kelas..."
              searchPlaceholder="Ketik nama/level/gender kelas..."
              minWidth="min-w-[220px]"
            />
          )}

          <div className="h-5 w-[1px] hidden sm:block bg-slate-300" />

          {/* Pekan Selector */}
          {isRegistrasi ? (
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-label-sm text-label-sm font-medium opacity-40 cursor-not-allowed select-none"
              title="Filter pekan dinonaktifkan di tab Registrasi"
            >
              <MaterialIcon name="schedule" className="text-[16px]" />
              <span>
                {selectedWeekObj?.label || "Pekan 4 (24 Okt 2024 - H+1 Review)"}
              </span>
            </div>
          ) : (
            <SearchableSelect
              options={filters.weeks}
              value={selection.weekId}
              onChange={(newWeekId) =>
                onSelectionChange({ ...selection, weekId: newWeekId })
              }
              placeholder="Pilih Pekan..."
              searchPlaceholder="Ketik pekan..."
              variant="primary"
              align="right"
              minWidth="min-w-[160px]"
            />
          )}
        </div>
      </div>
    </section>
  );
}

