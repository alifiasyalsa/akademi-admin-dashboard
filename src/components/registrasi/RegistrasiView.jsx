import { useState, useEffect, useCallback, useMemo } from "react";
import { cmsApi } from "../../api/cmsEndpoints.js";
import { tokenManager } from "../../api/tokenManager.js";
import { buildRegistrasiViewModel, EMPTY_SUMMARY } from "../../services/registrasiService.js";
import { reminderTrackingService } from "../../services/reminderTrackingService.js";
import { templateService, DEFAULT_TEMPLATES } from "../../services/templateService.js";
import { buildWaMessage, openWhatsAppDirectly } from "../../services/waService.js";
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

export function RegistrasiView({
  onShowToast,
  selectedBatchLabel = "Batch 14 (Aktif)",
  selectedBatchId,
  onPendingCountChange,
}) {
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [view, setView] = useState(() => (tokenManager.hasValidAuth() ? EMPTY_VIEW : MOCK_VIEW));
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState(() =>
    DEFAULT_TEMPLATES.filter((t) => t.category === "registrasi")
  );

  const batchKey = selectedBatchId || "14";
  const batchDisplay = selectedBatchLabel || "Batch 14 (Aktif)";

  // Ambil seluruh data santri non-confirm (wait, pending, not_confirm) + cache 30 menit
  const loadRegistrasi = useCallback(
    async ({ force = false } = {}) => {
      if (!tokenManager.hasValidAuth()) {
        setView(MOCK_VIEW);
        onPendingCountChange?.(MOCK_VIEW.summary.unselected.count);
        return;
      }

      const cached = registrasiMemoryCache.get(batchKey);
      const isCacheValid = cached && Date.now() - cached.timestamp < REGISTRASI_CACHE_TTL;

      // Jika cache masih berlaku dan tidak dipaksa refresh, gunakan cache memori langsung
      if (!force && isCacheValid) {
        setView(cached.vm);
        setLastSyncTime(cached.syncTime);
        onPendingCountChange?.(cached.vm.summary.unselected.count);
        return;
      }

      try {
        setLoading(true);

        // Fetch targeted: tarik status yang belum masuk kelas & status dibatalkan/mundur
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
          // 1. Santri belum pilih kelas
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "wait", limit: 100, force })
            .catch(() => ({ data: [], total: 0 })),
          // 2. Santri belum bayar
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "pending", limit: 100, force })
            .catch(() => ({ data: [], total: 0 })),
          // 3. Santri lewat batas konfirmasi
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "not_confirm", limit: 100, force })
            .catch(() => ({ data: [], total: 0 })),
          // 4. Santri mengundurkan diri (cancel)
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "cancel", limit: 100, force })
            .catch(() => ({ data: [], total: 0 })),
          // 5. Santri dibatalkan admin (delete)
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "delete", limit: 100, force })
            .catch(() => ({ data: [], total: 0 })),
          // 6. Santri confirm (hanya ambil count pendaftar yang sudah masuk kelas)
          cmsApi
            .getClassRegisters({ batch: batchKey, status: "confirm", limit: 10, force })
            .catch(() => ({ total: 0 })),
          // 7. Total semua pendaftar (tanpa filter status)
          cmsApi
            .getClassRegisters({ batch: batchKey, limit: 1, force })
            .catch(() => ({ recordsTotal: 0, total: 0 })),
          // 8. Histori Supabase
          reminderTrackingService
            .fetchBatchReminders(batchKey, "registrasi")
            .catch(() => null),
        ]);

        // Gabungkan seluruh santri non-confirm tanpa duplikat ID
        const studentMap = new Map();
        [
          ...(resWait?.data || []),
          ...(resPending?.data || []),
          ...(resNotConfirm?.data || []),
          ...(resCancel?.data || []),
          ...(resDelete?.data || []),
        ].forEach((row) => {
          const id = String(row.id || row.member_id);
          if (!studentMap.has(id)) {
            studentMap.set(id, row);
          }
        });
        const nonConfirmList = Array.from(studentMap.values());

        // Statistik pendaftar batch asli
        const totalBatch = resTotal?.recordsTotal || resTotal?.total || 0;
        const confirmed = resConfirm?.recordsFiltered || resConfirm?.total || 0;
        const waitCount = resWait?.recordsFiltered ?? resWait?.data?.length ?? 0;
        const pendingCount = resPending?.recordsFiltered ?? resPending?.data?.length ?? 0;
        const notConfirmCount =
          resNotConfirm?.recordsFiltered ?? resNotConfirm?.data?.length ?? 0;
        const cancelCount = resCancel?.recordsFiltered ?? resCancel?.data?.length ?? 0;
        const deleteCount = resDelete?.recordsFiltered ?? resDelete?.data?.length ?? 0;

        const statusCounts = {
          totalBatch,
          confirmed,
          wait: waitCount,
          pending: pendingCount,
          notConfirm: notConfirmCount,
          cancel: cancelCount,
          delete: deleteCount,
        };

        const vm = buildRegistrasiViewModel(
          nonConfirmList,
          statusCounts,
          reminderLogsMap,
          batchKey
        );

        const syncTime = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Simpan ke memory cache
        registrasiMemoryCache.set(batchKey, {
          timestamp: Date.now(),
          vm,
          syncTime,
        });

        setView(vm);
        setLastSyncTime(syncTime);
        onPendingCountChange?.(vm.summary.unselected.count);
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
    [batchKey, onShowToast, onPendingCountChange]
  );

  useEffect(() => {
    loadRegistrasi();
  }, [loadRegistrasi]);

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
    
    // 1. Tentukan status_key santri
    let statusKey = "wait";
    if (participant.regStatus === "pending") statusKey = "pending";
    else if (participant.regStatus === "not confirm" || participant.regStatus === "not_confirm") statusKey = "not_confirm";
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
        batch: batchDisplay,
        rekomendasi_kelas: participant.kelas && participant.kelas !== "none" ? participant.kelas : "Belum ditentukan",
        tipe: participant.tipe || "Pendaftar",
        status: participant.regStatusLabel || "Belum Pilih Kelas",
      });
    } else {
      // Fallback bawaan jika template belum dimuat
      message = buildWaMessage({
        waType: "registrasi",
        student: participant,
        batchName: batchDisplay,
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
        contextId: `batch_${batchKey}`,
        memberName: participant.name,
        memberPhone: phone,
        batchId: Number(batchKey),
        classId: null,
        notes: activeTemplate?.title || "Pengingat pendaftaran",
        currentCount: participant.reminderCount || 0,
      })
      .then(() => {
        // Update cache lokal langsung agar tombol dan badge instan ter-update tanpa reload lambat
        loadRegistrasi({ force: true });
      });

    onShowToast?.({
      icon: "event_available",
      title: `WhatsApp Terkirim: ${participant.name}`,
      subtitle: `Menggunakan "${activeTemplate?.title || 'Template Resmi'}" • Tercatat di Supabase`,
    });
  }

  return (
    <div className="space-y-space-xl" id="registrasiTabView">
      {/* Status Sinkronisasi & Info Cache */}
      {lastSyncTime && (
        <div className="flex items-center justify-between text-xs text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
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
            className="text-[#0284c7] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            Segarkan Sekarang
          </button>
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
        templates={templates}
        onTemplatesChange={setTemplates}
        onShowToast={onShowToast}
      />
    </div>
  );
}

