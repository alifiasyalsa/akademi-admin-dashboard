import {
  formatRupiah,
  normalizePhone,
  formatPhoneDisplay,
  getInitials,
  normalizeName,
  formatDateTimeDisplay,
} from "./formatters.js";
import { reminderTrackingService, makeTrackingKey, formatRelativeDays } from "./reminderTrackingService.js";

function buildLastFollowup(logRecord) {
  const at = logRecord?.last_reminded_at || null;
  if (!at) {
    return {
      at: null,
      dateLabel: "Belum",
      relativeLabel: "",
      count: 0,
    };
  }

  return {
    at,
    dateLabel: formatDateTimeDisplay(at),
    relativeLabel: formatRelativeDays(at),
    count: logRecord?.reminder_count || 0,
  };
}

/**
 * Workbench Normalizer & Aggregator Service
 * Menggabungkan data presensi mingguan, komitmen infaq, dan registrasi santri
 * menjadi struktur model data UI persis seperti stitchMock.
 */
export function buildWorkbenchViewModel({
  selectedBatch,
  selectedClass,
  selectedWeekNum,
  batches = [],
  classes = [],
  attendanceList = [],
  commitmentsList = [],
  classAttendance = null,
  teacherSchedule = [],
  reminderLogsMap = null,
}) {
  const currentWeek = Number(selectedWeekNum) || 1;
  const numMeetings = selectedClass?.num_of_meetings || 8;


  // 1. Siapkan Filter Dropdown Data
  const filterBatches = batches.map((b) => ({
    id: String(b.batch_no),
    label: `Batch ${b.title || b.batch_no}`,
  }));

  const filterClasses = classes.map((c) => ({
    id: String(c.id),
    label: `${c.name || "Kelas"} • ${c.gender || ""} • Level ${c.class_type?.name || "-"}`,
  }));

  // Buat opsi pekan sesuai jadwal kelas / num_of_meetings
  const filterWeeks = [];
  const scheduleCount = Math.max(numMeetings, teacherSchedule.length, currentWeek);
  for (let i = scheduleCount; i >= 1; i--) {
    const matchedSched = teacherSchedule.find((s) => s.attendance_no === i);
    let schedDateLabel = "";
    if (matchedSched?.class_time) {
      const d = new Date(matchedSched.class_time);
      if (!isNaN(d.getTime())) {
        schedDateLabel = ` (${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })})`;
      }
    }
    filterWeeks.push({
      id: String(i),
      label: `Pekan ${i}${schedDateLabel}`,
    });
  }

  // 2. Buat Hash Index untuk Pencocokan Cepat & Mencegah Duplikasi
  // Komitmen index: by member_id -> by phone -> by normalized name
  const commitmentsByMemberId = new Map();
  const commitmentsByPhone = new Map();
  const commitmentsByName = new Map();
  commitmentsList.forEach((c) => {
    if (c.id) commitmentsByMemberId.set(String(c.id), c);
    if (c.member_id) commitmentsByMemberId.set(String(c.member_id), c);

    const phoneKey = normalizePhone(c.phone);
    if (phoneKey) commitmentsByPhone.set(phoneKey, c);

    const nameKey = normalizeName(c.fullname || c.name);
    if (nameKey) commitmentsByName.set(nameKey, c);
  });

  // 3. Normalisasi Data Siswa / Peserta
  // Mencegah duplikasi santri per kelas menggunakan unique member key
  const processedMemberKeys = new Set();
  const studentRows = [];

  let countHadir = 0;
  let countTidakHadir = 0;
  let totalClassTargetInfaq = 0;
  let totalClassValidInfaq = 0;
  let totalOverdueMembers = 0;

  for (const item of attendanceList) {
    const memberId = item.member_id ? String(item.member_id) : "";
    const memberName = item.member_name || "Tanpa Nama";
    const memberPhone = item.member_phone || "";
    const phoneKey = normalizePhone(memberPhone);
    const nameKey = normalizeName(memberName);

    // Kunci unik deduplikasi
    const uniqueKey = memberId || phoneKey || nameKey;
    if (!uniqueKey || processedMemberKeys.has(uniqueKey)) {
      continue;
    }
    processedMemberKeys.add(uniqueKey);

    // Matching Komitmen
    const commitmentData =
      (memberId ? commitmentsByMemberId.get(memberId) : null) ||
      commitmentsByPhone.get(phoneKey) ||
      commitmentsByName.get(nameKey) ||
      null;

    // Hitung Presensi Pekan Ini & Histori 8 Pekan dari data class attendance
    const attendanceMeetings =
      classAttendance?.attendance_list ||
      classAttendance?.data?.attendance_list ||
      [];

    let isAttended = Boolean(item.attend);
    let dots = [];
    let historyScore = "";
    let historyTitle = "";

    if (attendanceMeetings.length > 0) {
      let attendedWeeksCount = 0;
      let completedWeeksCount = 0;
      const tooltipItems = [];

      attendanceMeetings.forEach((meeting, idx) => {
        const weekIdx = idx + 1;
        // Kalau member_list null berarti belum berjalan pekannya
        if (meeting.member_list === null || meeting.member_list === undefined) {
          dots.push("belumBerjalan");
          tooltipItems.push(`Pekan ${weekIdx}: Belum Berjalan`);
        } else if (Array.isArray(meeting.member_list)) {
          completedWeeksCount++;
          // Cek apakah member_id ada di member_list
          const isMemberPresent = memberId && meeting.member_list.some((id) => String(id) === memberId);
          if (isMemberPresent) {
            attendedWeeksCount++;
            dots.push("hadir");
            tooltipItems.push(`Pekan ${weekIdx}: Hadir`);
          } else {
            dots.push("tidakHadir");
            tooltipItems.push(`Pekan ${weekIdx}: Tidak Hadir`);
          }
        } else {
          dots.push("belumBerjalan");
          tooltipItems.push(`Pekan ${weekIdx}: Belum Berjalan`);
        }
      });

      // Sinkronisasi status kehadiran pekan aktif jika pertemuan pekan ini sudah tercatat
      const currentMeeting = attendanceMeetings[currentWeek - 1];
      if (currentMeeting && Array.isArray(currentMeeting.member_list) && memberId) {
        isAttended = currentMeeting.member_list.some((id) => String(id) === memberId);
      }

      historyScore = `${attendedWeeksCount}/${completedWeeksCount || attendanceMeetings.length}`;
      historyTitle = tooltipItems.join(" • ");
    } else {
      // Fallback jika classAttendance belum dimuat
      dots = [isAttended ? "hadir" : "tidakHadir"];
      historyScore = isAttended ? "1/1" : "0/1";
      historyTitle = `Presensi Pekan ${currentWeek}: ${isAttended ? "Hadir" : "Tidak Hadir"}${item.note ? ` (${item.note})` : ""}`;
    }

    const currentMeeting = attendanceMeetings[currentWeek - 1];
    let presenceObj;
    if (currentMeeting && currentMeeting.member_list === null) {
      presenceObj = { label: "Belum Berjalan", tone: "belumBerjalan" };
    } else if (isAttended) {
      countHadir++;
      presenceObj = { label: "Hadir", tone: "hadir" };
    } else {
      countTidakHadir++;
      presenceObj = { label: "Tidak Hadir", tone: "sakit" };
    }

    const historyObj = {
      title: historyTitle,
      score: historyScore,
      dots,
    };

    // Hitung Finansial Infaq
    // commitment = nominal per pekan. infaq_amount = total valid masuk (dihitung backend)
    const weeklyCommitment = Number(commitmentData?.commitment) || 0;
    const targetObligation = weeklyCommitment * currentWeek;
    const validInfaqAmount = Number(commitmentData?.infaq_amount) || 0;

    totalClassTargetInfaq += targetObligation;
    totalClassValidInfaq += validInfaqAmount;

    let validTone = "paid";
    let validNote = "Lunas";
    let isOverdue = false;

    if (weeklyCommitment === 0 && validInfaqAmount === 0) {
      validTone = "paid";
      validNote = "Bebas Biaya";
    } else if (validInfaqAmount >= targetObligation && targetObligation > 0) {
      if (validInfaqAmount > targetObligation) {
        const extraWeeks = Math.floor((validInfaqAmount - targetObligation) / (weeklyCommitment || 1));
        validTone = "advance";
        validNote = extraWeeks > 0 ? `Advance +${extraWeeks} Pk` : "Lunas (Lebih)";
      } else {
        validTone = "paid";
        validNote = "Lunas";
      }
    } else {
      isOverdue = true;
      totalOverdueMembers++;
      const shortfall = targetObligation - validInfaqAmount;
      const missedWeeks = weeklyCommitment > 0 ? Math.ceil(shortfall / weeklyCommitment) : 1;
      validTone = validInfaqAmount === 0 ? "none" : "overdue";
      validNote = validInfaqAmount === 0 ? "Belum Setor" : `Kurang ${formatRupiah(shortfall)} (${missedWeeks} Pk)`;
    }

    // 1. Evaluasi Status Pengingat Presensi & Infaq via Supabase Realtime Log
    const targetMemberId = memberId || uniqueKey;
    const presensiTrackingKey = makeTrackingKey("presensi", targetMemberId, `batch_${selectedBatch}_pekan_${currentWeek}`);
    const presensiLog = reminderLogsMap?.get?.(presensiTrackingKey);
    const presensiState = reminderTrackingService.computeReminderState({
      isResolved: isAttended,
      logRecord: presensiLog,
    });

    const infaqTrackingKey = makeTrackingKey("infaq", targetMemberId, `batch_${selectedBatch}`);
    const infaqLog = reminderLogsMap?.get?.(infaqTrackingKey);
    const infaqState = reminderTrackingService.computeReminderState({
      isResolved: !isOverdue,
      logRecord: infaqLog,
    });

    // Kategorisasi Tab Filter Santri
    const categories = [];
    if (isOverdue) categories.push("overdue");
    if (isOverdue || !isAttended) {
      categories.push("attention");
    }
    if (!isOverdue && isAttended) {
      categories.push("completed");
    }

    // Flagging siklus pengingat
    if (infaqState.isStagnant || presensiState.isStagnant) {
      categories.push("stagnant");
    }
    if (
      (isOverdue && infaqState.status === "unreminded") ||
      (!isAttended && presensiState.status === "unreminded")
    ) {
      categories.push("unreminded");
    }
    if (
      (isOverdue && infaqState.status === "reminded") ||
      (!isAttended && presensiState.status === "reminded")
    ) {
      categories.push("reminded");
    }

    // Action Generator Dinamis (Infaq & Presensi)
    const actions = [];

    // Tombol 1: Infaq Tertunggak
    if (isOverdue) {
      if (infaqState.isStagnant) {
        actions.push({
          kind: "wa",
          variant: "amber",
          icon: "priority_high",
          label: "Follow-up Infaq (>3 hr)",
          waType: "infaq",
          domain: "infaq",
          contextId: `batch_${selectedBatch}`,
          isFollowup: true,
          detail: `Tertunggak ${formatRupiah(targetObligation - validInfaqAmount)} • ${infaqState.relativeTime}`,
          currentCount: infaqState.count,
        });
      } else if (infaqState.status === "reminded") {
        actions.push({
          kind: "wa",
          variant: "secondary",
          icon: "history",
          label: `Diingatkan (${infaqState.relativeTime})`,
          waType: "infaq",
          domain: "infaq",
          contextId: `batch_${selectedBatch}`,
          detail: `Tertunggak ${formatRupiah(targetObligation - validInfaqAmount)} • ${infaqState.count}x kirim`,
          currentCount: infaqState.count,
        });
      } else {
        actions.push({
          kind: "wa",
          variant: "primary",
          icon: "send",
          label: "Kirim WA Infaq",
          waType: "infaq",
          domain: "infaq",
          contextId: `batch_${selectedBatch}`,
          detail: `Tertunggak ${formatRupiah(targetObligation - validInfaqAmount)}`,
          currentCount: 0,
        });
      }
    }

    // Tombol 2: Presensi Tidak Hadir
    if (!isAttended) {
      if (presensiState.isStagnant) {
        actions.push({
          kind: "wa",
          variant: "amber",
          icon: "priority_high",
          label: "Follow-up Absen (>3 hr)",
          waType: "presensi",
          domain: "presensi",
          contextId: `batch_${selectedBatch}_pekan_${currentWeek}`,
          isFollowup: true,
          detail: `Belum hadir pertemuan pekan ${currentWeek} • ${presensiState.relativeTime}`,
          currentCount: presensiState.count,
        });
      } else if (presensiState.status === "reminded") {
        actions.push({
          kind: "wa",
          variant: "secondary",
          icon: "history",
          label: `Diingatkan Absen (${presensiState.relativeTime})`,
          waType: "presensi",
          domain: "presensi",
          contextId: `batch_${selectedBatch}_pekan_${currentWeek}`,
          detail: `Belum hadir pertemuan pekan ${currentWeek} • ${presensiState.count}x kirim`,
          currentCount: presensiState.count,
        });
      } else {
        actions.push({
          kind: "wa",
          variant: isOverdue ? "secondary" : "primary",
          icon: "chat",
          label: "Kirim WA Presensi",
          waType: "presensi",
          domain: "presensi",
          contextId: `batch_${selectedBatch}_pekan_${currentWeek}`,
          detail: `Belum hadir pertemuan pekan ${currentWeek}`,
          currentCount: 0,
        });
      }
    }

    if (actions.length === 0) {
      actions.push({ kind: "done", label: "Tuntas" });
    }

    studentRows.push({
      id: targetMemberId,
      name: memberName,
      initials: getInitials(memberName),
      phoneDisplay: formatPhoneDisplay(memberPhone),
      rawPhone: memberPhone,
      searchText: `${memberName.toLowerCase()} ${phoneKey}`,
      categories,
      presence: presenceObj,
      history: historyObj,
      obligationAmount: formatRupiah(targetObligation),
      obligationNote: weeklyCommitment > 0 ? `@${formatRupiah(weeklyCommitment)}/pk` : "Reguler",
      validAmount: formatRupiah(validInfaqAmount),
      validNote,
      validTone,
      lastPresensiRemind: buildLastFollowup(presensiLog),
      lastInfaqRemind: buildLastFollowup(infaqLog),
      actions,
    });
  }

  // 4. Hitung Agregasi Summary Card
  const totalStudents = studentRows.length;

  // Card 1: Presensi
  const attendanceRate = totalStudents > 0 ? ((countHadir / totalStudents) * 100).toFixed(1) + "%" : "0%";
  const hadirPercent = totalStudents > 0 ? ((countHadir / totalStudents) * 100).toFixed(1) + "%" : "0%";
  const tidakHadirPercent = totalStudents > 0 ? ((countTidakHadir / totalStudents) * 100).toFixed(1) + "%" : "0%";

  const summaryAttendance = {
    rate: attendanceRate,
    weekBadge: `Pekan ${currentWeek} / ${numMeetings}`,
    studentCount: totalStudents,
    bar: [
      { key: "hadir", width: hadirPercent, className: "bg-[#0284c7]", title: `Hadir: ${countHadir}` },
      { key: "tidak_hadir", width: tidakHadirPercent, className: "bg-amber-300", title: `Tidak Hadir: ${countTidakHadir}` },
    ],
    legend: [
      { label: `${countHadir} Hadir`, dotClass: "bg-[#0284c7]", textClass: "font-medium" },
      { label: `${countTidakHadir} Tidak Hadir`, dotClass: "bg-amber-400", textClass: "font-medium" },
    ],
  };

  // Card 2: Infaq
  const infaqRateVal = totalClassTargetInfaq > 0 ? (totalClassValidInfaq / totalClassTargetInfaq) * 100 : 100;
  const infaqRateDisplay = Math.min(infaqRateVal, 100).toFixed(1) + "%";
  const gapAmountVal = Math.max(0, totalClassTargetInfaq - totalClassValidInfaq);

  const summaryInfaq = {
    rate: infaqRateDisplay,
    overdueBadge: `${totalOverdueMembers} Menunggak`,
    targetLabel: `Target S/D Pekan ${currentWeek}`,
    targetAmount: formatRupiah(totalClassTargetInfaq),
    validAmount: `Valid: ${formatRupiah(totalClassValidInfaq)}`,
    gapAmount: `Gap: ${formatRupiah(gapAmountVal)}`,
    barWidth: Math.min(infaqRateVal, 100).toFixed(1) + "%",
  };

  // 5. Hitung Tab Counts (Semua, Stagnan > 3 Hari, Perlu Diingatkan, Perlu Perhatian, Lunas & Hadir)
  const countAll = studentRows.length;
  const countStagnant = studentRows.filter((s) => s.categories.includes("stagnant")).length;
  const countUnreminded = studentRows.filter((s) => s.categories.includes("unreminded")).length;
  const countAttention = studentRows.filter((s) => s.categories.includes("attention")).length;
  const countCompleted = studentRows.filter((s) => s.categories.includes("completed")).length;

  const tabs = [
    { id: "all", label: "Semua Anggota", count: `(${countAll})`, countStyle: "plain" },
    ...(countStagnant > 0
      ? [{ id: "stagnant", label: "Stagnan > 3 Hari", count: String(countStagnant), countStyle: "badge" }]
      : []),
    { id: "unreminded", label: "Perlu Diingatkan", count: `(${countUnreminded})`, countStyle: "plain" },
    { id: "attention", label: "Perlu Perhatian", count: `(${countAttention})`, countStyle: "plain" },
    { id: "completed", label: "Lunas & Hadir", count: `(${countCompleted})`, countStyle: "plain" },
  ];

  return {
    filters: {
      batches: filterBatches,
      classes: filterClasses,
      weeks: filterWeeks,
      selected: {
        batchId: String(selectedBatch || ""),
        classId: String(selectedClass?.id || ""),
        weekId: String(currentWeek),
      },
    },
    attendance: summaryAttendance,
    infaq: summaryInfaq,
    promoted: null,
    table: {
      selectedWeek: currentWeek,
      totalRegistered: totalStudents,
      updatedAt: `Diperbarui: ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
      tabs,
      students: studentRows,
    },
  };
}
