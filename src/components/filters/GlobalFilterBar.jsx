import { MaterialIcon } from "../MaterialIcon.jsx";
import { SearchableSelect } from "./SearchableSelect.jsx";
import { ChecklistSelect } from "./ChecklistSelect.jsx";
import { DAYS } from "../../services/jadwalService.js";

export function GlobalFilterBar({
  filters,
  selection,
  onSelectionChange,
  activeMainTab = "monitoring",
  dayFilter = null,
  batchesPending = false,
}) {
  const isRegistrasi = activeMainTab === "registrasi";

  const selectedWeekObj = filters?.weeks?.find(
    (w) => String(w.id) === String(selection.weekId)
  );

  return (
    <section className="bg-surface rounded-xl p-3 sm:p-space-lg shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-space-lg">
        <div className="flex items-center gap-3 sm:gap-space-md min-w-0 shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-brand-50 text-brand-600 border border-brand-200 shrink-0">
            <MaterialIcon
              name={isRegistrasi ? "space_dashboard" : "grid_view"}
              className="text-[22px] sm:text-[26px] text-brand-600"
            />
          </div>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-500 font-semibold">
                Active Control Plane
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
              <span className="font-label-sm text-label-sm font-semibold text-brand-600">
                Live Monitor
              </span>
            </div>
            <h1 className="text-base sm:font-headline-lg sm:text-headline-lg font-bold tracking-tight text-slate-900 truncate">
              {isRegistrasi ? "Registrasi Santri" : "Monitoring Akademik"}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200 w-full md:w-auto">
          {/* Batch Selector */}
          <ChecklistSelect
            options={filters.batches}
            value={selection.batchIds || (selection.batchId ? [selection.batchId] : [])}
            onChange={(newBatchIds) => onSelectionChange({ ...selection, batchIds: newBatchIds })}
            allLabel="Semua Batch"
            placeholder="Pilih Batch..."
            title="Pilih Batch"
            unitLabel="Batch"
            icon="layers"
            busy={batchesPending}
            align="left"
            minWidth="min-w-[140px] sm:min-w-[170px] flex-1 sm:flex-none"
          />

          {/* Pekan Selector */}
          {isRegistrasi ? (
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-label-sm text-label-sm font-medium opacity-40 cursor-not-allowed select-none"
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
              minWidth="min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none"
            />
          )}

          {/* Hari Selector */}
          {!isRegistrasi && (
            <ChecklistSelect
              options={DAYS}
              value={dayFilter?.selectedDays || []}
              onChange={dayFilter?.onChange || (() => {})}
              allLabel="Semua Hari"
              placeholder="Pilih Hari..."
              title="Pilih Hari"
              unitLabel="Hari"
              icon="calendar_month"
              disabled={!dayFilter?.enabled}
              disabledTitle="Filter hari aktif setelah data kelas dari CMS termuat"
              align="left"
              minWidth="min-w-[130px] sm:min-w-[150px] flex-1 sm:flex-none"
            />
          )}

          {/* Kelas Selector */}
          {!isRegistrasi && (
            <SearchableSelect
              options={filters.classes}
              value={selection.classId}
              onChange={(newClassId) =>
                onSelectionChange({ ...selection, classId: newClassId })
              }
              placeholder="Pilih Kelas..."
              searchPlaceholder="Ketik nama/hari/level/gender kelas..."
              align="right"
              minWidth="min-w-[180px] sm:min-w-[220px] flex-1 md:flex-none"
            />
          )}
        </div>
      </div>
    </section>
  );
}
