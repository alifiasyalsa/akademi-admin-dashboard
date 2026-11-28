import { useState, useMemo, useEffect } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { TablePagination } from "../table/TablePagination.jsx";
import { RegistrasiRow } from "./RegistrasiRow.jsx";
import { downloadCsv } from "../../services/csvExport.js";
import { formatDateTimeDisplay } from "../../services/formatters.js";

const TAB_LABELS = {
  all: "Semua",
  wait: "Belum Pilih",
  pending: "Belum Bayar",
  not_confirm: "Lewat Batas",
  cancel: "Mundur",
  delete: "Dibatalkan",
  attention: "Follow-up",
  unreminded: "Belum Diingatkan",
};

const TIPE_OPTIONS = [
  { id: "all", label: "Semua Tipe" },
  { id: "Promoted", label: "Promoted" },
  { id: "Stay", label: "Stay" },
  { id: "New", label: "New" },
];

const REGISTRASI_COLUMNS = [
  { header: "Nama", value: (p) => p.name },
  { header: "No. HP", value: (p) => p.phone },
  { header: "Email", value: (p) => p.email || "" },
  { header: "Status Pendaftaran", value: (p) => p.regStatusLabel || "Belum Pilih Kelas" },
  { header: "Tipe", value: (p) => p.tipe },
  { header: "Level", value: (p) => (p.level && p.level !== "-" ? p.level : "") },
  { header: "Kelas Rekomendasi", value: (p) => (p.kelas && p.kelas !== "none" ? p.kelas : "") },
  { header: "Status Reminder", value: (p) => p.statusLabel },
  { header: "Jumlah Pengingat", value: (p) => p.reminderCount ?? 0 },
  { header: "Terakhir Diingatkan", value: (p) => (p.lastRemindedAt ? formatDateTimeDisplay(p.lastRemindedAt) : "") },
];

export function RegistrasiTable({
  participants = [],
  classRecommendations = [],
  batchCounts = {},
  loading = false,
  batchLabel = "Batch 14",
  onActionClick,
  onRefresh,
  onOpenTemplates,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedTipe, setSelectedTipe] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter santri secara instan terhadap SELURUH data non-confirm di memori
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // 1. Tab Status Filter
      if (activeTab === "wait") {
        if (p.regStatus !== "wait") return false;
      } else if (activeTab === "pending") {
        if (p.regStatus !== "pending") return false;
      } else if (activeTab === "not_confirm") {
        if (p.regStatus !== "not confirm" && p.regStatus !== "not_confirm") return false;
      } else if (activeTab === "cancel") {
        if (p.regStatus !== "cancel") return false;
      } else if (activeTab === "delete") {
        if (p.regStatus !== "delete") return false;
      } else if (activeTab === "attention") {
        if (p.status !== "followup") return false;
      } else if (activeTab === "unreminded") {
        if (p.status !== "unreminded" && p.status !== "belum") return false;
      }

      // 2. Filter Tipe Pendaftar (Promoted / Stay / New)
      if (selectedTipe !== "all" && p.tipe !== selectedTipe) return false;

      // 3. Filter Rekomendasi Kelas
      if (selectedClass !== "all") {
        if (selectedClass === "none") {
          if (p.kelas && p.kelas !== "none") return false;
        } else {
          if (p.kelas !== selectedClass) return false;
        }
      }

      // 4. Filter Pencarian Nama / Nomor HP / Email / Level
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(query);
        const matchesPhone =
          p.phone?.toLowerCase().includes(query) || p.rawPhone?.toLowerCase().includes(query);
        const matchesEmail = p.email?.toLowerCase().includes(query);
        const matchesLevel = p.level && p.level !== "-" && p.level.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesLevel) return false;
      }

      return true;
    });
  }, [participants, activeTab, selectedTipe, selectedClass, searchQuery]);

  // Kalkulasi Paginasi Client-Side yang Ringan & Cepat
  const totalItems = filteredParticipants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const pagedParticipants = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredParticipants.slice(start, start + pageSize);
  }, [filteredParticipants, safePage, pageSize]);

  // Helper daftar nomor tombol halaman (maksimal 5 item)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (safePage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage, "...", totalPages];
  }, [totalPages, safePage]);

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedTipe, selectedClass, searchQuery]);

  function handleExportCsv() {
    const tabLabel = TAB_LABELS[activeTab] || activeTab;
    const tipeLabel = selectedTipe !== "all" ? selectedTipe : null;
    const classLabel =
      selectedClass !== "all" ? classRecommendations.find((opt) => opt.id === selectedClass)?.label || selectedClass : null;
    downloadCsv({
      fileParts: ["registrasi", batchLabel, tabLabel, tipeLabel, classLabel, searchQuery && `cari-${searchQuery}`],
      rows: filteredParticipants,
      columns: REGISTRASI_COLUMNS,
      context: {
        tab: "registrasi",
        filter: tabLabel,
        tipe: tipeLabel,
        class: classLabel,
        search: searchQuery || null,
      },
    });
  }

  function handleReset() {
    setActiveTab("all");
    setSelectedTipe("all");
    setSelectedClass("all");
    setSearchQuery("");
    setCurrentPage(1);
    onRefresh?.();
  }

  // Hitungan tab dinamis dari batchCounts (keseluruhan data batch)
  const countAll = batchCounts?.all ?? participants.length;
  const countWait = batchCounts?.wait ?? participants.filter((p) => p.regStatus === "wait").length;
  const countPending = batchCounts?.pending ?? participants.filter((p) => p.regStatus === "pending").length;
  const countNotConfirm =
    batchCounts?.notConfirm ??
    participants.filter((p) => p.regStatus === "not confirm" || p.regStatus === "not_confirm").length;
  const countCancel =
    batchCounts?.cancel ?? participants.filter((p) => p.regStatus === "cancel").length;
  const countDelete =
    batchCounts?.delete ?? participants.filter((p) => p.regStatus === "delete").length;
  const countAttention =
    batchCounts?.attention ?? participants.filter((p) => p.status === "followup").length;

  // Hitungan filter Tipe (Promoted / Stay / New) dari dataset aktif
  const tipeCounts = useMemo(() => {
    const counts = { all: participants.length, Promoted: 0, Stay: 0, New: 0 };
    participants.forEach((p) => {
      if (p.tipe === "Promoted") counts.Promoted += 1;
      else if (p.tipe === "Stay") counts.Stay += 1;
      else if (p.tipe === "New") counts.New += 1;
    });
    return counts;
  }, [participants]);

  return (
    <section className="bg-surface rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Aksi Tabel: Terpisah dari baris filter & pencarian */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-surface">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
            <span>Daftar Pendaftar Santri</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200">
              {batchLabel}
            </span>
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Daftar santri non-confirm (belum memilih kelas, belum bayar, lewat batas, mundur/batal)
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredParticipants.length === 0}
            title={`Download ${filteredParticipants.length} baris sesuai filter tabel saat ini`}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-surface hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MaterialIcon name="download" className="text-[18px] text-slate-500" />
            <span className="sm:hidden">CSV ({filteredParticipants.length})</span>
            <span className="hidden sm:inline">Download CSV ({filteredParticipants.length})</span>
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <MaterialIcon name="chat" className="text-[18px] text-brand-600" />
            <span className="sm:hidden">Template</span>
            <span className="hidden sm:inline">Pengaturan Template WA</span>
          </button>
        </div>
      </div>

      {/* 1. Header Toolbar Filter & Pencarian: 1 Baris Padat & Rapi */}
      <div className="px-3 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-surface border-b border-slate-200">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 overflow-x-auto max-w-full">
          {/* Tab Semua Non-Confirm */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "all"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span>Semua</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "all" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countAll}
            </span>
          </button>

          {/* Tab Belum Pilih Kelas */}
          <button
            type="button"
            onClick={() => setActiveTab("wait")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "wait"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span>Belum Pilih</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "wait" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countWait}
            </span>
          </button>

          {/* Tab Belum Bayar */}
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "pending"
                ? "bg-amber-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Belum Bayar</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "pending" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countPending}
            </span>
          </button>

          {/* Tab Lewat Batas */}
          <button
            type="button"
            onClick={() => setActiveTab("not_confirm")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "not_confirm"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Lewat Batas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "not_confirm" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countNotConfirm}
            </span>
          </button>

          {/* Tab Mengundurkan Diri (Cancel) */}
          <button
            type="button"
            onClick={() => setActiveTab("cancel")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "cancel"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span>Mundur</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "cancel" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countCancel}
            </span>
          </button>

          {/* Tab Dibatalkan Admin (Delete) */}
          <button
            type="button"
            onClick={() => setActiveTab("delete")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "delete"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Dibatalkan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                activeTab === "delete" ? "bg-white/20 text-white font-semibold" : "font-medium text-slate-500"
              }`}
            >
              {countDelete}
            </span>
          </button>

          {/* Tab Perlu Follow-up */}
          <button
            type="button"
            onClick={() => setActiveTab("attention")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "attention"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Follow-up</span>
            {activeTab !== "attention" ? (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                {countAttention}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-white/20 text-white font-semibold">
                {countAttention}
              </span>
            )}
          </button>
        </div>

        {/* Kanan: Filter Rekomendasi Kelas, Search Bar & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
          {/* Dropdown Rekomendasi Kelas */}
          <div className="relative shrink-0">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs max-w-[140px] sm:max-w-[170px] truncate"
            >
              {classRecommendations.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <MaterialIcon
              name="expand_more"
              className="absolute right-2 top-2 text-[16px] pointer-events-none text-slate-400"
            />
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:flex-none sm:w-44 lg:w-52">
            <MaterialIcon
              name="search"
              className="absolute left-2.5 top-2 text-[16px] pointer-events-none text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari santri/kontak/email..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={handleReset}
            title="Refresh Data"
            className="p-1.5 rounded-lg transition-all bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <MaterialIcon name="sync" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Filter Tipe: Promoted / Stay / New */}
      <div className="px-3 sm:px-5 pb-2.5 flex items-center gap-1.5 flex-nowrap overflow-x-auto border-b border-slate-200 bg-surface">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
          Tipe
        </span>
        {TIPE_OPTIONS.map((opt) => {
          const isActive = selectedTipe === opt.id;
          const count = tipeCounts[opt.id] ?? 0;
          const activeTone =
            opt.id === "Promoted"
              ? "bg-brand-600 text-white border-brand-600"
              : opt.id === "Stay"
              ? "bg-violet-600 text-white border-violet-600"
              : opt.id === "New"
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-slate-800 text-white border-slate-800";
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedTipe(opt.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                isActive
                  ? activeTone
                  : "bg-surface text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>{opt.label}</span>
              <span className={isActive ? "text-white/80" : "text-slate-400"}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* 2. Table / Empty State View */}
      {filteredParticipants.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto mb-4">
            <MaterialIcon name="task_alt" className="text-[32px]" />
          </div>
          <h3 className="font-headline-md text-headline-md font-bold text-slate-900 mb-1">
            {activeTab === "pending"
              ? "Tidak ada peserta yang belum bayar 🎉"
              : activeTab === "not_confirm"
              ? "Tidak ada peserta yang lewat batas konfirmasi 🎉"
              : activeTab === "wait"
              ? "Tidak ada peserta yang belum pilih kelas 🎉"
              : activeTab === "attention"
              ? "Tidak ada santri yang perlu follow-up mendesak 🎉"
              : "Semua peserta telah terkelola dengan baik 🎉"}
          </h3>
          <p className="font-body-md text-body-md text-slate-500 max-w-md mx-auto">
            {activeTab === "pending"
              ? `Tidak ada pendaftar ${batchLabel} yang berstatus pending pembayaran saat ini.`
              : activeTab === "not_confirm"
              ? `Seluruh pendaftar ${batchLabel} telah mengonfirmasi keikutsertaan tepat waktu.`
              : activeTab === "wait"
              ? `Tidak ada santri ${batchLabel} yang menunggu pemilihan jadwal kelas.`
              : activeTab === "attention"
              ? `Seluruh santri telah difollow-up tepat waktu.`
              : `Tidak ada peserta ${batchLabel} yang membutuhkan reminder jadwal saat ini.`}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-5 px-4 py-2 rounded-lg font-label-md text-label-md font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-all cursor-pointer shadow-sm"
          >
            Kembali ke Daftar Lengkap
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[840px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-label-sm text-label-sm uppercase tracking-wider border-b border-slate-200">
                <th className="py-space-md px-3 sm:px-space-lg font-semibold">Nama & Kontak</th>
                <th className="py-space-md px-space-md font-semibold whitespace-nowrap">Status Pendaftaran</th>
                <th className="py-space-md px-space-md font-semibold">Tipe</th>
                <th className="py-space-md px-space-md font-semibold whitespace-nowrap">Level</th>
                <th className="py-space-md px-space-md font-semibold whitespace-nowrap">Kelas Rekomendasi</th>
                <th className="py-space-md px-space-md font-semibold whitespace-nowrap">Status Reminder</th>
                <th className="py-space-md px-3 sm:px-space-lg text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 text-slate-800 font-body-md text-body-md transition-opacity duration-200 ${loading ? "opacity-40" : ""}`}>
              {pagedParticipants.map((p) => (
                <RegistrasiRow
                  key={p.id}
                  participant={p}
                  onActionClick={onActionClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Reusable TablePagination Component */}
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
        itemLabel="Santri Terdaftar"
      />
    </section>
  );
}
