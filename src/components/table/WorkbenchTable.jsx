import { useState, useEffect, useMemo } from "react";
import { TableToolbar } from "./TableToolbar.jsx";
import { TablePagination } from "./TablePagination.jsx";
import { MemberRow } from "./MemberRow.jsx";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { downloadCsv } from "../../services/csvExport.js";

const followupDate = (followup) => followup?.dateLabel && followup.at ? followup.dateLabel : "";

function buildMonitoringColumns(weekLabel) {
  return [
    { header: "Nama", value: (s) => s.name },
    { header: "No. HP", value: (s) => s.phoneDisplay },
    { header: "Email", value: (s) => s.email },
    { header: "Batch", value: (s) => s.batchNo },
    { header: "Kelas", value: (s) => s.className },
    { header: "Hari", value: (s) => s.classDay },
    { header: `Presensi Pekan ${weekLabel}`, value: (s) => s.presence?.label },
    { header: "Historis Presensi", value: (s) => s.history?.score },
    { header: "Komitmen per Pekan", value: (s) => s.weeklyCommitmentValue ?? "" },
    { header: "Kewajiban s/d Pekan Ini", value: (s) => s.obligationValue ?? "" },
    { header: "Infaq Komitmen (CMS)", value: (s) => s.validBreakdown?.commitment ?? "" },
    { header: "Transaksi Class Banner", value: (s) => s.validBreakdown?.classBanner ?? "" },
    { header: "Input Manual", value: (s) => s.validBreakdown?.manual ?? "" },
    { header: "Total Valid Masuk", value: (s) => s.validValue ?? "" },
    { header: "Status Infaq", value: (s) => s.validNote },
    { header: "Pengingat Presensi Terakhir", value: (s) => followupDate(s.lastPresensiRemind) },
    { header: "Total Pengingat Presensi", value: (s) => s.lastPresensiRemind?.totalCount ?? 0 },
    { header: "Pengingat Infaq Terakhir", value: (s) => followupDate(s.lastInfaqRemind) },
    { header: "Total Pengingat Infaq", value: (s) => s.lastInfaqRemind?.totalCount ?? 0 },
  ];
}

function matchesFilters(student, activeTab, activeSubTab, searchQuery) {
  const searchTerm = searchQuery.toLowerCase().trim();
  const matchesTab = activeTab === "all" || student.categories?.includes(activeTab);
  const matchesSubTab = activeSubTab === "all" || student.categories?.includes(activeSubTab);
  const matchesSearch = !searchTerm || student.searchText?.includes(searchTerm);
  return matchesTab && matchesSubTab && matchesSearch;
}

const SORT_FIELDS = {
  valid: "validValue",
};

function SortableHeader({ label, sortKey, sortConfig, onToggle }) {
  const dir = sortConfig.key === sortKey ? sortConfig.dir : null;
  return (
    <th
      className="py-space-md px-space-md text-right font-semibold"
      aria-sort={dir === "desc" ? "descending" : dir === "asc" ? "ascending" : "none"}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        title={
          dir === "desc"
            ? "Urut terbesar → terkecil (klik: terkecil dulu)"
            : dir === "asc"
            ? "Urut terkecil → terbesar (klik: kembali ke urutan awal)"
            : `Klik untuk urutkan ${label} dari terbesar`
        }
        className={`inline-flex items-center gap-0.5 uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-900 transition-colors ${
          dir ? "text-brand-600" : ""
        }`}
      >
        {label}
        <MaterialIcon
          name={dir === "desc" ? "arrow_downward" : dir === "asc" ? "arrow_upward" : "unfold_more"}
          className="text-[14px]"
        />
      </button>
    </th>
  );
}

export function WorkbenchTable({
  table,
  selectedWeek,
  activeTab,
  searchQuery,
  onTabChange,
  onSearchChange,
  onSendWa,
  onManualInfaq,
  onRefresh,
  onOpenTemplates,
  exportFileParts = [],
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeSubTab, setActiveSubTab] = useState("all");
  // Sortir per kolom nominal: klik → "desc" (terbesar) → "asc" (terkecil) → null (urutan awal)
  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const weekLabel = String(selectedWeek || table?.selectedWeek || 1).replace(/^p/i, "");

  const subTabs = (table.tabs || []).find((tab) => tab.id === activeTab)?.subTabs || [];
  const effectiveSubTab = subTabs.some((sub) => sub.id === activeSubTab) ? activeSubTab : "all";

  useEffect(() => {
    setActiveSubTab("all");
  }, [activeTab]);

  // Filter santri sesuai tab, sub-filter & query pencarian, lalu sortir (ikut terbawa ke ekspor CSV)
  const visibleStudents = useMemo(() => {
    const filtered = (table.students || []).filter((student) =>
      matchesFilters(student, activeTab, effectiveSubTab, searchQuery)
    );
    const field = SORT_FIELDS[sortConfig.key];
    if (!field || !sortConfig.dir) return filtered;
    const direction = sortConfig.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => direction * ((Number(a[field]) || 0) - (Number(b[field]) || 0)));
  }, [table.students, activeTab, effectiveSubTab, searchQuery, sortConfig]);

  // Reset ke halaman 1 saat filter tab, sub-filter, sortir, search query, atau dataset kelas berganti
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, effectiveSubTab, searchQuery, sortConfig, table]);

  function toggleSort(key) {
    setSortConfig((prev) => {
      if (prev.key !== key || !prev.dir) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return { key: null, dir: null };
    });
  }

  function handleExportCsv() {
    const tabLabel = (table.tabs || []).find((tab) => tab.id === activeTab)?.label || activeTab;
    const subTabLabel = effectiveSubTab !== "all" ? subTabs.find((sub) => sub.id === effectiveSubTab)?.label : null;
    downloadCsv({
      fileParts: ["monitoring", ...exportFileParts, `pekan-${weekLabel}`, tabLabel, subTabLabel, searchQuery && `cari-${searchQuery}`],
      rows: visibleStudents,
      columns: buildMonitoringColumns(weekLabel),
      context: { tab: "monitoring", filter: tabLabel, sub_filter: subTabLabel, week: weekLabel, search: searchQuery || null },
    });
  }

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
          {table.notice && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              <MaterialIcon name="warning" className="text-[14px]" />
              {table.notice}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={visibleStudents.length === 0}
            title={`Download ${visibleStudents.length} baris sesuai filter tabel saat ini`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MaterialIcon name="download" className="text-[18px] text-slate-500" />
            <span>Download CSV ({visibleStudents.length})</span>
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <MaterialIcon name="chat" className="text-[18px] text-brand-600" />
            <span>Pengaturan Template WA</span>
          </button>
        </div>
      </div>

      <TableToolbar
        tabs={table.tabs}
        activeTab={activeTab}
        subTabs={subTabs}
        activeSubTab={effectiveSubTab}
        onSubTabChange={setActiveSubTab}
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
              <th className="py-space-md px-space-md font-semibold">Hari</th>
              <th className="py-space-md px-space-md font-semibold">Historis (8 Pk)</th>
              <th className="py-space-md px-space-md text-right font-semibold">Kewajiban</th>
              <SortableHeader label="Valid Masuk" sortKey="valid" sortConfig={sortConfig} onToggle={toggleSort} />
              <th className="py-space-md px-space-md font-semibold" title="Tanggal pengingat terakhir & total berapa kali dihubungi">
                Follow-up (Terakhir · Total)
              </th>
              <th className="py-space-md px-space-lg text-right font-semibold">Tindakan WA Mandiri</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-body-md text-body-md">
            {pagedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center text-slate-500 font-body-md">
                  <MaterialIcon name="person_search" className="text-[36px] text-slate-300 mx-auto mb-2 block" />
                  Belum ada data.
                </td>
              </tr>
            ) : (
              pagedStudents.map((student) => (
                <MemberRow
                  key={student.rowKey || student.id}
                  student={student}
                  onSendWa={onSendWa}
                  onManualInfaq={onManualInfaq}
                />
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
