import { useState, useEffect, useCallback, useMemo } from "react";
import { cmsApi } from "../../api/cmsEndpoints.js";
import { tokenManager } from "../../api/tokenManager.js";
import { buildRegistrasiViewModel, EMPTY_SUMMARY } from "../../services/registrasiService.js";
import { reminderTrackingService } from "../../services/reminderTrackingService.js";
import { templateService, DEFAULT_TEMPLATES } from "../../services/templateService.js";
import { buildWaMessage, openWhatsAppDirectly, cleanBatchLabel } from "../../services/waService.js";
import { registrationMockData } from "../../data/registrationMock.js";
import { RegistrasiSummaryGrid } from "./RegistrasiSummaryGrid.jsx";
import { RegistrasiTable } from "./RegistrasiTable.jsx";
import { RegistrasiGuidance } from "./RegistrasiGuidance.jsx";
import { MessageTemplateModal } from "./MessageTemplateModal.jsx";

// Cache in-memory registrasi per batch (TTL: 30 menit)
const REGISTRASI_CACHE_TTL = 30 * 60 * 1000;
const registrasiMemoryCache = new Map();

// Mode prototipe (tanpa token) memakai mock; mode live mulai dari kosong.
const MOCK_VIEW = {
  participants: registrationMockData.participants,
  summary: registrationMockData.summary,
  classOptions: registrationMockData.classRecommendations,
  batchCounts: {
    all: registrationMockData.participants.length,
    wait: 25,
    pending: 0,
    notConfirm: 0,
    attention: 8,
    unreminded: 17,
    confirmed: 95,
    totalBatch: 120,
  },
};
const EMPTY_VIEW = {
  participants: [],
  summary: EMPTY_SUMMARY,
  classOptions: [],
  batchCounts: {},
};

async function fetchOneBatchRaw(batchKey, { force = false } = {}) {
  const [
    resWait,
    resPending,
    resNotConfirm,
    resCancel,
    resDelete,
    resConfirm,
    resTotal,
    reminderLogsMap,
  ] = await Promise.all([
    // fetchAll: jangan potong di 100 baris pertama — santri di halaman berikutnya ikut tampil
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "wait", limit: 100, fetchAll: true, force })
      .catch(() => ({ data: [], total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "pending", limit: 100, fetchAll: true, force })
      .catch(() => ({ data: [], total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "not_confirm", limit: 100, fetchAll: true, force })
      .catch(() => ({ data: [], total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "cancel", limit: 100, fetchAll: true, force })
      .catch(() => ({ data: [], total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "delete", limit: 100, fetchAll: true, force })
      .catch(() => ({ data: [], total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, status: "confirm", limit: 10, force })
      .catch(() => ({ total: 0 })),
    cmsApi
      .getClassRegisters({ batch: batchKey, limit: 1, force })
      .catch(() => ({ recordsTotal: 0, total: 0 })),
    reminderTrackingService.fetchBatchReminders(batchKey, "registrasi").catch(() => null),
  ]);

  const studentMap = new Map();
  [
    ...(resWait?.data || []),
    ...(resPending?.data || []),
    ...(resNotConfirm?.data || []),
    ...(resCancel?.data || []),
    ...(resDelete?.data || []),
  ].forEach((row) => {
    const id = String(row.id || row.member_id);
    if (!studentMap.has(id)) studentMap.set(id, row);
  });

  const statusCounts = {
    totalBatch: resTotal?.recordsTotal || resTotal?.total || 0,
    confirmed: resConfirm?.recordsFiltered || resConfirm?.total || 0,
    wait: resWait?.recordsFiltered ?? resWait?.data?.length ?? 0,
    pending: resPending?.recordsFiltered ?? resPending?.data?.length ?? 0,
    notConfirm: resNotConfirm?.recordsFiltered ?? resNotConfirm?.data?.length ?? 0,
    cancel: resCancel?.recordsFiltered ?? resCancel?.data?.length ?? 0,
    delete: resDelete?.recordsFiltered ?? resDelete?.data?.length ?? 0,
  };

  return {
    batchKey: String(batchKey),
    nonConfirmList: Array.from(studentMap.values()),
    statusCounts,
    reminderLogsMap,
  };
}

function mergeBatchVms(batchResults) {
  if (batchResults.length === 0) return EMPTY_VIEW;

  const vms = batchResults.map((one) =>
    buildRegistrasiViewModel(one.nonConfirmList, one.statusCounts, one.reminderLogsMap, one.batchKey)
  );
  if (vms.length === 1) return vms[0];

  const participants = vms.flatMap((vm) => vm.participants);
  const sumKey = (key) => vms.reduce((acc, vm) => acc + (Number(vm.batchCounts?.[key]) || 0), 0);

  const waitCount = sumKey("wait");
  const pendingCount = sumKey("pending");
  const notConfirmCount = sumKey("notConfirm");
  const cancelCount = sumKey("cancel");
  const deleteCount = sumKey("delete");
  const confirmedCount = sumKey("confirmed");
  const totalBatch = sumKey("totalBatch");
  const urgentCount = sumKey("attention");
  const unremindedCount = sumKey("unreminded");

  const classes = [...new Set(participants.map((p) => p.kelas).filter((k) => k && k !== "none"))];

  return {
    participants,
    totalItems: participants.length,
    batchCounts: {
      all: participants.length,
      wait: waitCount,
      pending: pendingCount,
      notConfirm: notConfirmCount,
      cancel: cancelCount,
      delete: deleteCount,
      attention: urgentCount,
      unreminded: unremindedCount,
      confirmed: confirmedCount,
      totalBatch,
    },
    summary: {
      unselected: {
        count: waitCount,
        totalBatchStudents: totalBatch,
        percentage: totalBatch > 0 ? Number(((waitCount / totalBatch) * 100).toFixed(1)) : 0,
        selectedCount: confirmedCount,
        waitCount,
        pendingCount,
        notConfirmCount,
        cancelCount,
        deleteCount,
      },
      followup: {
        urgentCount,
        pendingPercentage: waitCount > 0 ? Math.round((urgentCount / waitCount) * 100) : 0,
        label: "Mendesak",
        criteria: "santri melewati batas waktu follow-up (>3 hari)",
      },
    },
    classOptions: [
      { id: "all", label: "Semua Rekomendasi" },
      ...classes.map((k) => ({ id: k, label: k })),
      { id: "none", label: "Belum Ada Rekomendasi" },
    ],
  };
}

export function RegistrasiView({
  onShowToast,
  selectedBatchLabel = "Batch 14 (Aktif)",
  selectedBatchId,
  selectedBatchIds,
  batchOptions = [],
  onPendingCountChange,
}) {
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [view, setView] = useState(() => (tokenManager.hasValidAuth() ? EMPTY_VIEW : MOCK_VIEW));
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState(() =>
    DEFAULT_TEMPLATES.filter((t) => t.category === "registrasi")
  );

  const batchIds = useMemo(() => {
    if (Array.isArray(selectedBatchIds) && selectedBatchIds.length > 0) {
      return selectedBatchIds.map(String);
    }
    if (selectedBatchId) return [String(selectedBatchId)];
    return [];
  }, [selectedBatchIds, selectedBatchId]);

  const batchLabelById = useMemo(() => {
    const map = new Map();
    (batchOptions || []).forEach((b) => map.set(String(b.id), b.label || `Batch ${b.id}`));
    return map;
  }, [batchOptions]);

  const batchDisplay = useMemo(() => {
    if (batchIds.length === 0) return "Belum ada batch";
    if (batchIds.length === 1) {
      return batchLabelById.get(batchIds[0]) || selectedBatchLabel || `Batch ${batchIds[0]}`;
    }
    return `${batchIds.length} Batch Dipilih`;
  }, [batchIds, batchLabelById, selectedBatchLabel]);

  const batchCacheKey = batchIds.join(",") || "__none__";

  // Ambil data santri non-confirm untuk semua batch terpilih + cache 30 menit per batch
  const loadRegistrasi = useCallback(
    async ({ force = false } = {}) => {
      if (!tokenManager.hasValidAuth()) {
        setView(MOCK_VIEW);
        onPendingCountChange?.(MOCK_VIEW.summary.unselected.count);
        return;
      }

      if (batchIds.length === 0) {
        setView(EMPTY_VIEW);
        setLastSyncTime("");
        onPendingCountChange?.(0);
        return;
      }

      try {
        setLoading(true);

        const batchResults = [];
        for (const batchKey of batchIds) {
          const cached = registrasiMemoryCache.get(batchKey);
          const isCacheValid = Boolean(cached && Date.now() - cached.timestamp < REGISTRASI_CACHE_TTL && cached.raw);
          if (!force && isCacheValid) {
            batchResults.push(cached.raw);
            continue;
          }

          const raw = await fetchOneBatchRaw(batchKey, { force });
          const vm = buildRegistrasiViewModel(
            raw.nonConfirmList,
            raw.statusCounts,
            raw.reminderLogsMap,
            raw.batchKey
          );
          const syncTime = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
          registrasiMemoryCache.set(batchKey, {
            timestamp: Date.now(),
            vm,
            raw,
            syncTime,
          });
          batchResults.push(raw);
        }

        const merged = mergeBatchVms(batchResults);
        const syncTime = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        setView(merged);
        setLastSyncTime(syncTime);
        onPendingCountChange?.(merged.summary.unselected.count);
      } catch (err) {
        console.warn("Gagal sinkronisasi data registrasi:", err);
        setView(MOCK_VIEW);
        onPendingCountChange?.(MOCK_VIEW.summary.unselected.count);
        onShowToast?.({
          icon: "error",
          title: "Sesi CMS Terkendala",
          subtitle: err?.message || "Menampilkan data lokal",
        });
      } finally {
        setLoading(false);
      }
    },
    [batchIds, onShowToast, onPendingCountChange]
  );

  useEffect(() => {
    loadRegistrasi();
  }, [loadRegistrasi, batchCacheKey]);

  function handleRefresh() {
    onShowToast?.({
      icon: "sync",
      title: "Menyinkronkan Data Registrasi...",
      subtitle: "Mengambil data pendaftar non-confirm terbaru dari CMS",
    });
    loadRegistrasi({ force: true }).then(() => {
      onShowToast?.({
        icon: "check_circle",
        title: "Sinkronisasi Berhasil",
        subtitle: "Seluruh data santri & status pendaftaran telah diperbarui",
      });
    });
  }

  // Fetch template pesan WhatsApp kategori registrasi dari Supabase
  useEffect(() => {
    templateService.fetchTemplatesByCategory("registrasi").then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setTemplates(res);
      }
    });
  }, []);

  async function handleSendWaRegistrasi(participant) {
    if (!participant) return;

    const phone = participant.rawPhone || participant.phone;
    const targetBatch = participant.batchId || batchIds[0] || "";
    const targetBatchLabel =
      batchLabelById.get(String(targetBatch)) || selectedBatchLabel || `Batch ${targetBatch}`;

    // 1. Tentukan status_key santri
    let statusKey = "wait";
    if (participant.regStatus === "pending") statusKey = "pending";
    else if (participant.regStatus === "not confirm" || participant.regStatus === "not_confirm")
      statusKey = "not_confirm";
    else if (participant.regStatus === "cancel") statusKey = "cancel";

    // 2. Cari template default yang aktif di Supabase/state
    const activeTemplate =
      templates.find((t) => t.status_key === statusKey && t.is_default) ||
      templates.find((t) => t.status_key === statusKey);

    // 3. Interpolasi variabel nyata santri
    let message = "";
    if (activeTemplate && activeTemplate.content) {
      message = templateService.interpolate(activeTemplate.content, {
        nama: participant.name || "Sahabat",
        batch: cleanBatchLabel(targetBatchLabel),
        rekomendasi_kelas:
          participant.kelas && participant.kelas !== "none" ? participant.kelas : "Belum ditentukan",
        tipe: participant.tipe || "Pendaftar",
        status: participant.regStatusLabel || "Belum Pilih Kelas",
      });
    } else {
      message = buildWaMessage({
        waType: "registrasi",
        student: participant,
        batchName: targetBatchLabel,
      });
    }

    const opened = openWhatsAppDirectly({
      phone,
      message,
    });

    if (!opened) {
      onShowToast?.({
        icon: "error",
        title: `Nomor WA Tidak Valid untuk ${participant.name}`,
        subtitle: "Santri tidak memiliki nomor WhatsApp yang terdaftar",
      });
      return;
    }

    // 4. Simpan aktivitas reminder ke Cloud Database Supabase
    reminderTrackingService
      .recordReminder({
        domain: "registrasi",
        memberId: participant.memberId || participant.id,
        contextId: `batch_${targetBatch}`,
        memberName: participant.name,
        memberPhone: phone,
        batchId: targetBatch ? Number(targetBatch) : null,
        classId: null,
        notes: activeTemplate?.title || "Pengingat pendaftaran",
        currentCount: participant.reminderCount || 0,
      })
      .then(() => {
        loadRegistrasi({ force: true });
      });

    onShowToast?.({
      icon: "event_available",
      title: `WhatsApp Terkirim: ${participant.name}`,
      subtitle: `Menggunakan "${activeTemplate?.title || "Template Resmi"}" • Tercatat di Supabase`,
    });
  }

  return (
    <div className="space-y-space-xl" id="registrasiTabView">
      {/* Status Sinkronisasi & Info Cache */}
      {lastSyncTime && (
        <div className="flex items-center justify-between text-xs text-slate-500 bg-surface px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>
              Terakhir disinkronkan: <strong>{lastSyncTime} WIB</strong> • Cache data lokal aktif
              (filter &amp; search instan)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-brand-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            Segarkan Sekarang
          </button>
        </div>
      )}

      {batchIds.length === 0 && tokenManager.hasValidAuth() && (
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Belum ada batch yang dipilih. Centang minimal satu batch di filter atas (bisa Pilih Semua /
          Hapus Semua).
        </div>
      )}

      {/* 1. Grid Ringkasan & Breakdown Status */}
      <RegistrasiSummaryGrid summary={view.summary} batchLabel={batchDisplay} />

      {/* 2. Tabel Registrasi Seluruh Santri Non-Confirm */}
      <RegistrasiTable
        participants={view.participants}
        batchCounts={view.batchCounts}
        batchLabel={batchDisplay}
        loading={loading}
        classRecommendations={view.classOptions}
        onActionClick={handleSendWaRegistrasi}
        onRefresh={handleRefresh}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
      />

      <RegistrasiGuidance batchLabel={batchDisplay} />

      {/* Modal Pengelola Template Pesan WhatsApp (Sesuai Desain UI Stitch) */}
      <MessageTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        category="registrasi"
        previewData={{ batch: cleanBatchLabel(batchDisplay) }}
        templates={templates}
        onTemplatesChange={setTemplates}
        onShowToast={onShowToast}
      />
    </div>
  );
}
