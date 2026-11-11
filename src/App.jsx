import { useState, useEffect } from "react";
import { useWorkbenchData } from "./hooks/useWorkbenchData.js";
import { tokenManager } from "./api/tokenManager.js";
import { cmsApi } from "./api/cmsEndpoints.js";
import { AppHeader } from "./components/layout/AppHeader.jsx";
import { AppFooter } from "./components/layout/AppFooter.jsx";
import { GlobalFilterBar } from "./components/filters/GlobalFilterBar.jsx";
import { MainNavigationTabs } from "./components/navigation/MainNavigationTabs.jsx";
import { SummaryGrid } from "./components/summary/SummaryGrid.jsx";
import { WorkbenchTable } from "./components/table/WorkbenchTable.jsx";
import { AdminGuidance } from "./components/guidance/AdminGuidance.jsx";
import { RegistrasiView } from "./components/registrasi/RegistrasiView.jsx";
import { Toast } from "./components/feedback/Toast.jsx";
import { stitchMock } from "./data/stitchMock.js";
import { buildWaMessage, openWhatsAppDirectly, cleanBatchLabel } from "./services/waService.js";
import { reminderTrackingService } from "./services/reminderTrackingService.js";
import { templateService, DEFAULT_TEMPLATES } from "./services/templateService.js";
import { MessageTemplateModal } from "./components/registrasi/MessageTemplateModal.jsx";
import { ManualInfaqModal } from "./components/table/ManualInfaqModal.jsx";
import { manualInfaqService } from "./services/manualInfaqService.js";
import { formatRupiah } from "./services/formatters.js";
import { getUserDisplayName } from "./services/supabaseAuth.js";
import { ActivityLogModal } from "./components/auth/ActivityLogModal.jsx";
import { RoleManagerModal } from "./components/auth/RoleManagerModal.jsx";

function toastCopy(action) {
  if (action.waType === "infaq") {
    return { icon: "payments", subtitle: "Template Infaq Komitmen" };
  }
  if (action.waType === "presensi") {
    return { icon: "event_busy", subtitle: "Template Konfirmasi Kehadiran" };
  }
  if (action.waType === "kelas" || action.waType === "registrasi") {
    return { icon: "event_available", subtitle: "Template Konfirmasi Pilih Kelas" };
  }
  return { icon: "outgoing_mail", subtitle: "Template Pengingat WA" };
}

export default function App({ currentUser = null, currentRole = "admin", onSignOut }) {
  const isSuperAdmin = currentRole === "super_admin";
  const {
    data,
    loading,
    loadingLabel,
    error,
    authStatus,
    refreshData,
    reloadData,
    onSelectionChange,
    selectedFilters,
    filtersReady,
    batchesPending,
    dayFilter,
  } = useWorkbenchData();

  // Primary tab: 'monitoring' | 'registrasi'
  const [mainTab, setMainTab] = useState("monitoring");

  // Monitoring sub-filters
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [pendingRegistrasiCount, setPendingRegistrasiCount] = useState(null);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);

  const adminProfile = tokenManager.getAdminProfile();

  // Fallback headers & footers
  const headerData = {
    ...(stitchMock.header || {}),
    adminName: currentUser
      ? getUserDisplayName(currentUser)
      : adminProfile?.fullname || stitchMock.header?.adminName || "Admin QuranBest",
    adminRole: currentUser?.email || adminProfile?.email || stitchMock.header?.adminRole || "Akademi Admin",
    roleBadge: currentUser ? (isSuperAdmin ? "Super Admin" : "Admin") : null,
    syncLabel: loading
      ? loadingLabel || "Memuat Data..."
      : authStatus.isExpired
      ? "Sesi Berakhir (401)"
      : authStatus.hasToken
      ? "Live CMS Terhubung"
      : "Mode Prototipe",
    isLive: authStatus.hasToken && !authStatus.isExpired,
  };

  const footerData = stitchMock.footer;

  function handleRefresh() {
    setToast({
      icon: "sync",
      title: "Menyinkronkan Data...",
      subtitle: "Mengambil data presensi & komitmen terbaru dari CMS",
    });
    refreshData?.().then(() => {
      setToast({
        icon: "check_circle",
        title: "Sinkronisasi Berhasil",
        subtitle: "Data workbench telah diperbarui",
      });
      window.setTimeout(() => setToast(null), 2500);
    });
  }

  // Monitoring templates state (Category: 'monitoring')
  const [isMonTemplateModalOpen, setIsMonTemplateModalOpen] = useState(false);
  const [monTemplates, setMonTemplates] = useState(() =>
    DEFAULT_TEMPLATES.filter((t) => t.category === "monitoring")
  );

  // Fetch monitoring templates dari Supabase
  useEffect(() => {
    templateService.fetchTemplatesByCategory("monitoring").then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setMonTemplates(res);
      }
    });
  }, []);

  async function handleSendWa(student, action) {
    // Batch diambil dari baris santri (bisa berbeda-beda saat beberapa batch dipilih)
    const targetBatch = student.batchNo || selectedFilters.batchId || data.filters.selected?.batchId;
    const activeBatchObj = data.filters?.batches?.find((b) => String(b.id) === String(targetBatch));
    const batchName = activeBatchObj?.label || targetBatch || "16";
    const phone = student.rawPhone || student.phoneDisplay;
    // Di mode gabungan hari, kelas diambil dari baris santri (bukan dari dropdown Kelas)
    const targetClass = student.classId || selectedFilters.classId || data.filters.selected?.classId;
    const targetWeek = selectedFilters.weekId || data.filters.selected?.weekId || 1;

    // Cari template default aktif dari tabel message_templates Supabase
    const statusKey = action.waType === "infaq" ? "infaq" : "presensi";
    const activeTemplate =
      monTemplates.find((t) => t.status_key === statusKey && t.is_default) ||
      monTemplates.find((t) => t.status_key === statusKey);

    let message = "";
    if (activeTemplate && activeTemplate.content) {
      message = templateService.interpolate(activeTemplate.content, {
        nama: student.name || "Sahabat",
        batch: cleanBatchLabel(batchName),
        pekan: String(targetWeek),
        kehadiran_pekan_ini: student.presence?.label || "Tidak Hadir",
        skor_kehadiran: student.history?.score || "-",
        status_infaq: student.validNote || "Belum Komitmen",
        nominal_infaq: student.validAmount || "-",
      });
    } else {
      message = buildWaMessage({
        waType: action.waType,
        student,
        batchName,
        regUrl: student.regUrl,
      });
    }

    const opened = openWhatsAppDirectly({ phone, message });

    if (!opened) {
      setToast({
        icon: "error",
        title: `Nomor WA Tidak Valid untuk ${student.name}`,
        subtitle: "Anggota tidak memiliki nomor WhatsApp yang terdaftar",
      });
      window.setTimeout(() => setToast(null), 3000);
      return;
    }

    // Catat ke Cloud Database Supabase secara asynchronous
    reminderTrackingService.recordReminder({
      domain: action.domain || action.waType,
      memberId: student.id,
      contextId: action.contextId || (action.waType === "presensi" ? `batch_${targetBatch}_pekan_${targetWeek}` : `batch_${targetBatch}`),
      memberName: student.name,
      memberPhone: phone,
      batchId: targetBatch ? Number(targetBatch) : null,
      classId: targetClass ? Number(targetClass) : null,
      notes: activeTemplate?.title || action.detail || "",
      currentCount: action.currentCount || 0,
    }).then(() => {
      // Re-fetch workbench agar tombol berubah status ke "Diingatkan (Hari ini)"
      refreshData?.();
    });

    setToast({
      icon: action.waType === "infaq" ? "payments" : "event_busy",
      title: `WhatsApp Terkirim: ${student.name}`,
      subtitle: `Menggunakan "${activeTemplate?.title || 'Template Resmi'}" • Tercatat di Supabase`,
    });
    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  // Input manual infaq: modal dibaca dari data terbaru (rowKey) agar rincian ikut ter-update setelah simpan
  const [manualInfaqRowKey, setManualInfaqRowKey] = useState(null);
  const manualInfaqStudent = manualInfaqRowKey
    ? (data.table?.students || []).find((s) => s.rowKey === manualInfaqRowKey) || null
    : null;
  const manualInfaqBatchLabel = manualInfaqStudent
    ? data.filters?.batches?.find((b) => String(b.id) === String(manualInfaqStudent.batchNo))?.label ||
      `Batch ${manualInfaqStudent.batchNo}`
    : "";

  function showTimedToast(nextToast, ms = 2800) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), ms);
  }

  async function handleSubmitManualInfaq({ amount, transactionDate, notes }) {
    const student = manualInfaqStudent;
    if (!student?.memberId || !student.batchNo) {
      throw new Error("Data member atau batch tidak lengkap.");
    }
    await manualInfaqService.create({
      memberId: student.memberId,
      memberName: student.name,
      batchId: student.batchNo,
      classId: student.classId,
      amount,
      transactionDate,
      notes,
    });
    await reloadData?.();
    showTimedToast({
      icon: "payments",
      title: `Infaq Manual Tersimpan: ${student.name}`,
      subtitle: `${formatRupiah(amount)} ditambahkan ke Valid Masuk`,
    });
  }

  async function handleDeleteManualInfaq(entry) {
    await manualInfaqService.remove(entry);
    await reloadData?.();
    showTimedToast({
      icon: "delete",
      title: "Infaq Manual Dihapus",
      subtitle: `${formatRupiah(entry.amount)} dikurangi dari Valid Masuk`,
    });
  }

  // Batch name string for subcomponents
  const activeBatchObj = data.filters?.batches?.find(
    (b) => String(b.id) === String(selectedFilters.batchId || data.filters.selected?.batchId)
  );
  const currentBatchLabel = activeBatchObj?.label || "Batch 14 (Aktif)";

  // Nama file CSV Monitoring: batch terpilih + kelas terpilih (tanpa detail hari/jam/level)
  const selectedBatchLabels = (selectedFilters.batchIds || [])
    .map((id) => data.filters?.batches?.find((b) => String(b.id) === String(id))?.label || `Batch ${id}`)
    .join(" ");
  const selectedClassLabel =
    data.filters?.classes?.find((c) => String(c.id) === String(selectedFilters.classId))?.label?.split(" • ")[0] || "";
  const monitoringExportParts = [selectedBatchLabels, selectedClassLabel];
  const currentBatchId = selectedFilters.batchId || data.filters.selected?.batchId;

  // Sinkronisasi data real pendaftar (status wait) untuk badge tab registrasi & info bar
  useEffect(() => {
    if (!tokenManager.hasValidAuth()) {
      setPendingRegistrasiCount(25); // mode mock/offline
      return;
    }

    if (!currentBatchId) return;

    let isMounted = true;
    cmsApi
      .getClassRegisters({ batch: currentBatchId, status: "wait", limit: 10 })
      .then((res) => {
        if (!isMounted) return;
        const waitCount = res?.total || (Array.isArray(res?.data) ? res.data.length : 0);
        setPendingRegistrasiCount(waitCount);
      })
      .catch((err) => {
        console.warn("Gagal sinkronisasi pending registrasi count:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentBatchId]);

  return (
    <>
      <AppHeader
        header={headerData}
        onOpenActivity={currentUser ? () => setIsActivityLogOpen(true) : undefined}
        onOpenRoles={isSuperAdmin ? () => setIsRoleManagerOpen(true) : undefined}
        onSignOut={onSignOut}
      />
      <main className="w-full pt-16 bg-brand-bg min-h-[calc(100vh-64px)] flex-1">
        <div className="flex flex-col w-full">
          <Toast toast={toast} />
          <div className="w-full max-w-[1600px] mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl space-y-space-xl">
            {/* Global Control Plane Bar */}
            <GlobalFilterBar
              filters={data.filters}
              selection={filtersReady ? selectedFilters : data.filters.selected}
              batchesPending={batchesPending}
              onSelectionChange={onSelectionChange}
              activeMainTab={mainTab}
              dayFilter={dayFilter}
            />

            {/* Main Tabs Navigation: Monitoring vs Registrasi */}
            <MainNavigationTabs
              activeTab={mainTab}
              onTabChange={setMainTab}
              pendingCount={pendingRegistrasiCount ?? 0}
            />

            {/* Tab View 1: Monitoring Kelas & Infaq */}
            {mainTab === "monitoring" && (
              <>
                <SummaryGrid
                  attendance={data.attendance}
                  infaq={data.infaq}
                  promoted={data.promoted}
                />
                <WorkbenchTable
                  table={data.table}
                  selectedWeek={selectedFilters.weekId || data.filters.selected?.weekId}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  onTabChange={setActiveTab}
                  onSearchChange={setSearchQuery}
                  onSendWa={handleSendWa}
                  onManualInfaq={currentUser ? (student) => setManualInfaqRowKey(student.rowKey) : undefined}
                  onRefresh={handleRefresh}
                  onOpenTemplates={() => setIsMonTemplateModalOpen(true)}
                  exportFileParts={monitoringExportParts}
                />
                <AdminGuidance />
              </>
            )}

            {/* Tab View 2: Registrasi */}
            {mainTab === "registrasi" && (
              <RegistrasiView
                onShowToast={setToast}
                selectedBatchLabel={currentBatchLabel}
                selectedBatchId={selectedFilters.batchId || data.filters.selected?.batchId}
                onPendingCountChange={setPendingRegistrasiCount}
              />
            )}
          </div>
        </div>

        {/* Modal Pengaturan Template Pesan Monitoring */}
        <MessageTemplateModal
          category="monitoring"
          previewData={{
            pekan: selectedFilters.weekId || data.filters.selected?.weekId,
            batch: activeBatchObj ? cleanBatchLabel(activeBatchObj.label) : null,
          }}
          isOpen={isMonTemplateModalOpen}
          onClose={() => setIsMonTemplateModalOpen(false)}
          templates={monTemplates}
          onTemplatesChange={setMonTemplates}
          onShowToast={setToast}
        />

        <ManualInfaqModal
          isOpen={Boolean(manualInfaqStudent)}
          student={manualInfaqStudent}
          batchLabel={manualInfaqBatchLabel}
          onClose={() => setManualInfaqRowKey(null)}
          onSubmit={handleSubmitManualInfaq}
          onDelete={handleDeleteManualInfaq}
          canDeleteEntry={(entry) => isSuperAdmin || entry.created_by_id === currentUser?.id}
        />

        <ActivityLogModal
          isOpen={isActivityLogOpen}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setIsActivityLogOpen(false)}
        />

        {isSuperAdmin && (
          <RoleManagerModal
            isOpen={isRoleManagerOpen}
            currentUser={currentUser}
            onClose={() => setIsRoleManagerOpen(false)}
            onShowToast={(nextToast) => {
              setToast(nextToast);
              window.setTimeout(() => setToast(null), 2800);
            }}
          />
        )}
      </main>
      <AppFooter footer={footerData} />
    </>
  );
}
