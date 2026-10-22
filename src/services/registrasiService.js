import { getInitials, formatPhoneDisplay } from "./formatters.js";

/**
 * Registrasi Service — fungsi murni (tanpa React/API) untuk tab Registrasi.
 *
 * Alur:  registers (CMS)  ->  filter status "wait"  ->  map ke baris tabel  ->  ringkasan
 *        buildRegistrasiViewModel() menjalankan seluruh alur di atas.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOWUP_AFTER_DAYS = 3;

export const EMPTY_SUMMARY = {
  unselected: { count: 0, totalBatchStudents: 0, percentage: 0, selectedCount: 0 },
  followup: {
    urgentCount: 0,
    pendingPercentage: 0,
    label: "Mendesak",
    criteria: `santri melewati batas waktu follow-up (>${FOLLOWUP_AFTER_DAYS} hari)`,
  },
};

const WAITING_STATUS = "wait";

/**
 * Peserta yang perlu ditindaklanjuti = register dengan status "wait".
 * (selected_class_name kosong tidak dipakai karena bisa berarti registrasi sudah dibatalkan.)
 */
export function isWaiting(register) {
  return String(register?.status || "").trim().toLowerCase() === WAITING_STATUS;
}

function toTipe(registrationType) {
  const t = String(registrationType || "promoted").toLowerCase();
  if (t === "stay") return "Stay";
  if (t === "new") return "New";
  return "Promoted";
}

/** Satu record register CMS + tracking Supabase -> satu baris tabel Registrasi. */
export function toParticipant(register, reminderLogsMap = null, batchId = null, now = Date.now()) {
  const memberId = String(register.member_id || register.id || "");
  const trackingKey = `registrasi:${memberId}:batch_${batchId || ""}`;
  const logRecord = reminderLogsMap?.get?.(trackingKey);

  const name = register.name || register.member_name || "Tanpa Nama";
  const phone = register.phone || register.member_phone || "";

  // 1. Status Pendaftaran Resmi dari CMS
  const regStatus = String(register.status || "wait").trim().toLowerCase();
  let regStatusLabel = "Belum Pilih Kelas";
  let regStatusTone = "sky";
  let defaultActionLabel = "Kirim WA";

  if (regStatus === "pending") {
    regStatusLabel = "Belum Bayar";
    regStatusTone = "amber";
  } else if (regStatus === "not confirm" || regStatus === "not_confirm") {
    regStatusLabel = "Lewat Batas Konfirmasi";
    regStatusTone = "rose";
  } else if (regStatus === "confirm") {
    regStatusLabel = "Sudah Masuk Kelas";
    regStatusTone = "teal";
  } else if (regStatus === "cancel") {
    regStatusLabel = "Mengundurkan Diri";
    regStatusTone = "slate";
  } else if (regStatus === "delete") {
    regStatusLabel = "Dibatalkan Admin";
    regStatusTone = "slate";
  }

  // 2. Status Reminder WhatsApp (dari Supabase)
  let status = "unreminded";
  let statusLabel = "Belum diingatkan";
  let statusDetail = "Menunggu pengingat pemilihan kelas";
  let actionType = "unreminded";
  let actionLabel = defaultActionLabel;
  let reminderCount = 0;

  if (logRecord?.last_reminded_at) {
    reminderCount = logRecord.reminder_count || 1;
    const diffMs = now - new Date(logRecord.last_reminded_at).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);
    const relativeTime = diffDays === 0 ? "hari ini" : `${diffDays} hr lalu`;

    if (diffHours >= 72) {
      status = "followup";
      statusLabel = "Perlu follow-up (>3 hr)";
      statusDetail = `Diingatkan ${relativeTime} • ${reminderCount}x kirim`;
      actionType = "followup";
      actionLabel = "Follow-up Mendesak";
    } else {
      status = "reminded";
      statusLabel = `Diingatkan (${relativeTime})`;
      statusDetail = `Terakhir dikirim ${relativeTime} • ${reminderCount}x kirim`;
      actionType = "reminded";
      actionLabel = "Kirim Ulang WA";
    }
  }

  return {
    id: String(register.id || register.member_id || ""),
    memberId,
    name,
    initials: getInitials(name),
    phone: formatPhoneDisplay(phone),
    rawPhone: phone,
    tipe: toTipe(register.registration_type),
    kelas: register.suggested_class_name || register.selected_class_name || "none",
    regStatus,
    regStatusLabel,
    regStatusTone,
    status,
    statusLabel,
    statusDetail,
    actionType,
    actionLabel,
    reminderCount,
    lastRemindedAt: logRecord?.last_reminded_at || null,
  };
}

function buildSummary({
  totalBatch = 0,
  confirmedCount = 0,
  waitCount = 0,
  pendingCount = 0,
  notConfirmCount = 0,
  cancelCount = 0,
  deleteCount = 0,
  urgentCount = 0,
}) {
  const total = totalBatch;
  const selectedCount = confirmedCount;
  // Santri yang berstatus "wait" (belum memilih kelas)
  const unselectedCount = waitCount;

  return {
    unselected: {
      count: unselectedCount,
      totalBatchStudents: total,
      percentage: total > 0 ? Number(((unselectedCount / total) * 100).toFixed(1)) : 0,
      selectedCount,
      waitCount,
      pendingCount,
      notConfirmCount,
      cancelCount,
      deleteCount,
    },
    followup: {
      urgentCount,
      pendingPercentage: unselectedCount > 0 ? Math.round((urgentCount / unselectedCount) * 100) : 0,
      label: "Mendesak",
      criteria: "santri melewati batas waktu follow-up (>3 hari)",
    },
  };
}

function buildClassOptions(participants) {
  const classes = [...new Set(participants.map((p) => p.kelas).filter((k) => k && k !== "none"))];
  return [
    { id: "all", label: "Semua Rekomendasi" },
    ...classes.map((k) => ({ id: k, label: k })),
    { id: "none", label: "Belum Ada Rekomendasi" },
  ];
}

/**
 * Membangun ViewModel Registrasi dari data non-confirm dan metrik status
 *
 * @param {Array} nonConfirmRegisters record registers CMS (wait, pending, not confirm, cancel, delete)
 * @param {Object} statusCounts { totalBatch, confirmed, wait, pending, notConfirm, cancel, delete }
 * @param {Map|null} reminderLogsMap Map log pengingat Supabase
 * @param {string|number|null} batchId
 */
export function buildRegistrasiViewModel(
  nonConfirmRegisters = [],
  statusCounts = {},
  reminderLogsMap = null,
  batchId = null,
  now = Date.now()
) {
  // 1. Transformasi seluruh santri non-confirm ke baris tabel
  const participants = nonConfirmRegisters.map((r) =>
    toParticipant(r, reminderLogsMap, batchId, now)
  );

  // 2. Hitung statistik pengingat Supabase
  let urgentCount = 0;
  let remindedCount = 0;
  for (const p of participants) {
    if (p.status === "followup") {
      urgentCount++;
    } else if (p.status === "reminded") {
      remindedCount++;
    }
  }

  const unremindedCount = Math.max(0, participants.length - urgentCount - remindedCount);

  const totalBatch = statusCounts.totalBatch || participants.length;
  const confirmedCount = statusCounts.confirmed || 0;
  const waitCount = statusCounts.wait || participants.filter((p) => p.regStatus === "wait").length;
  const pendingCount = statusCounts.pending || participants.filter((p) => p.regStatus === "pending").length;
  const notConfirmCount =
    statusCounts.notConfirm ||
    participants.filter((p) => p.regStatus === "not confirm" || p.regStatus === "not_confirm").length;
  const cancelCount =
    statusCounts.cancel || participants.filter((p) => p.regStatus === "cancel").length;
  const deleteCount =
    statusCounts.delete || participants.filter((p) => p.regStatus === "delete").length;

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
    summary: buildSummary({
      totalBatch,
      confirmedCount,
      waitCount,
      pendingCount,
      notConfirmCount,
      cancelCount,
      deleteCount,
      urgentCount,
    }),
    classOptions: buildClassOptions(participants),
  };
}

