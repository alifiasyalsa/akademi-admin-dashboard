import { useState, useEffect, useMemo } from "react";
import { TableToolbar } from "./TableToolbar.jsx";
import { TablePagination } from "./TablePagination.jsx";
import { MemberRow } from "./MemberRow.jsx";
import { MaterialIcon } from "../MaterialIcon.jsx";

function matchesFilters(student, activeTab, searchQuery) {
  const searchTerm = searchQuery.toLowerCase().trim();
  const matchesTab = activeTab === "all" || student.categories?.includes(activeTab);
  const matchesSearch = !searchTerm || student.searchText?.includes(searchTerm);
  return matchesTab && matchesSearch;
}

export function WorkbenchTable({
  table,
  selectedWeek,
  activeTab,
  searchQuery,
  onTabChange,
  onSearchChange,
  onSendWa,
  onRefresh,
  onOpenTemplates,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const weekLabel = String(selectedWeek || table?.selectedWeek || 1).replace(/^p/i, "");

  // Filter santri sesuai tab & query pencarian
  const visibleStudents = useMemo(() => {
    return (table.students || []).filter((student) => matchesFilters(student, activeTab, searchQuery));
  }, [table.students, activeTab, searchQuery]);

  // Reset ke halaman 1 saat filter tab, search query, atau dataset kelas berganti
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, table]);

  // Kalkulasi pagination
  const totalItems = visibleStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const pagedStudents = useMemo(() => {
    return visibleStudents.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [visibleStudents, safePage, pageSize]);

  // Helper daftar nomor tombol halaman
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  }, [totalPages, safePage]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Aksi Tabel: Terpisah dari baris filter & pencarian */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-white">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Workbench Santri &amp; Presensi</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Pekan {weekLabel}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar santri, historis presensi 8 pekan, status validasi infaq, dan tindakan WA
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#0284c7] bg-sky-50 hover:bg-sky-100 border border-sky-200 shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <MaterialIcon name="chat" className="text-[18px] text-[#0284c7]" />
          <span>Pengaturan Template WA</span>
        </button>
      </div>

      <TableToolbar
        tabs={table.tabs}
        activeTab={activeTab}
        searchQuery={searchQuery}
        onTabChange={onTabChange}
        onSearchChange={onSearchChange}
        onRefresh={onRefresh}
      />

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-label-sm text-label-sm uppercase tracking-wider border-b border-slate-200">
              <th className="py-space-md px-space-lg font-semibold">Nama & Kontak</th>
              <th className="py-space-md px-space-md font-semibold">Presensi Pekan {weekLabel}</th>
              <th className="py-space-md px-space-md font-semibold">Historis (8 Pk)</th>
              <th className="py-space-md px-space-md text-right font-semibold">Kewajiban</th>
              <th className="py-space-md px-space-md text-right font-semibold">Valid Masuk</th>
              <th className="py-space-md px-space-md font-semibold">Terakhir Follow-up</th>
              <th className="py-space-md px-space-lg text-right font-semibold">Tindakan WA Mandiri</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-body-md text-body-md">
            {pagedStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center text-slate-500 font-body-md">
                  <MaterialIcon name="person_search" className="text-[36px] text-slate-300 mx-auto mb-2 block" />
                  Belum ada data.
                </td>
              </tr>
            ) : (
              pagedStudents.map((student) => (
                <MemberRow key={student.id} student={student} onSendWa={onSendWa} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Reusable */}
      <TablePagination
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={totalItems}
        pageSize={pageSize}
        currentPage={safePage}
        totalPages={totalPages}
        pageNumbers={pageNumbers}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        extraInfo={table.updatedAt}
        itemLabel={`Santri${table.totalRegistered && totalItems !== table.totalRegistered ? ` (dari ${table.totalRegistered} terdaftar)` : ""}`}
      />
    </section>
  );
}
