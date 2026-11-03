import {
  formatRupiah,
  normalizePhone,
  formatPhoneDisplay,
  getInitials,
  normalizeName,
  formatDateTimeDisplay,
} from "./formatters.js";
import { reminderTrackingService, makeTrackingKey, formatRelativeDays } from "./reminderTrackingService.js";
import { getClassWeekSchedule, getWeekStartDates } from "./jadwalService.js";

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
  // Mode gabungan per hari: [{ cls, attendanceList, classAttendance }]
  classGroups = null,
  selectedClassId = null,
  extraClassOptions = [],
  scheduleIndex = null,
  notice = null,
}) {
  const currentWeek = Number(selectedWeekNum) || 1;
  const groups = (classGroups || [{ cls: selectedClass, attendanceList, classAttendance }]).map((group) => ({
    cls: group.cls,
    roster: Array.isArray(group.roster) ? group.roster : null,
    attendanceList: group.attendanceList || [],
    meetings: group.classAttendance?.attendance_list || group.classAttendance?.data?.attendance_list || [],
    schedule: getClassWeekSchedule(scheduleIndex, group.cls, currentWeek),
    batchNo: String(group.cls?.batch ?? selectedBatch ?? ""),
  }));
  const numMeetings = Math.max(0, ...groups.map((g) => Number(g.cls?.num_of_meetings) || 0)) || 8;
  const weekStartDates = getWeekStartDates(scheduleIndex);


  // 1. Siapkan Filter Dropdown Data
  const filterBatches = batches.map((b) => ({
    id: String(b.batch_no),
    label: `Batch ${b.title || b.batch_no}`,
  }));

  const filterClasses = [
    ...extraClassOptions,
    ...classes.map((c) => ({
      id: String(c.id),
      label: [
        c.name || "Kelas",
        scheduleIndex ? getClassWeekSchedule(scheduleIndex, c, currentWeek)?.label : null,
        c.gender || "",
        `Level ${c.class_type?.name || "-"}`,
      ]
        .filter(Boolean)
        .join(" • "),
    })),
  ];

  // Buat opsi pekan sesuai jadwal kelas / num_of_meetings
  const filterWeeks = [];
  const scheduleCount = Math.max(numMeetings, teacherSchedule.length, currentWeek);
  for (let i = scheduleCount; i >= 1; i--) {
    const matchedSched = teacherSchedule.find((s) => s.attendance_no === i);
    let schedDateLabel = "";
    const schedTime = matchedSched?.class_time || weekStartDates.get(i);
    if (schedTime) {
      const d = new Date(schedTime);
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
  // Komitmen index: by member_id -> by phone -> by normalized name, dipisah per batch
  // (santri yang ikut >1 batch punya komitmen berbeda di tiap batch)
  const byBatch = (batchNo, key) => `${batchNo}|${key}`;
  const commitmentsByMemberId = new Map();
  const commitmentsByPhone = new Map();
  const commitmentsByName = new Map();
  commitmentsList.forEach((c) => {
    const batchNo = String(c._batch ?? c.class?.batch ?? selectedBatch ?? "");
    if (c.id) commitmentsByMemberId.set(byBatch(batchNo, String(c.id)), c);
    if (c.member_id) commitmentsByMemberId.set(byBatch(batchNo, String(c.member_id)), c);

    const phoneKey = normalizePhone(c.phone);
    if (phoneKey) commitmentsByPhone.set(byBatch(batchNo, phoneKey), c);

    const nameKey = normalizeName(c.fullname || c.name);
    if (nameKey) commitmentsByName.set(byBatch(batchNo, nameKey), c);
  });

  // 3. Normalisasi Data Siswa / Peserta
  // Mencegah duplikasi santri per kelas menggunakan unique member key
  const processedMemberKeys = new Set();
  const studentRows = [];

  let countHadir = 0;
  let countTidakHadir = 0;
  let countBelumDiisi = 0;
  let countBelumBerjalan = 0;
  let totalClassTargetInfaq = 0;
  let totalClassValidInfaq = 0;
  let totalOverdueMembers = 0;

  // Baris santri berasal dari roster kelas (tetap ada walau presensi pekan belum diinput).
  // Presensi mingguan hanya ditempelkan per member_id. Tanpa roster → fallback ke daftar presensi.
  const studentItems = groups.flatMap((group) => {
    if (!group.roster) {
      return group.attendanceList.map((item) => ({ item, weekly: item, group }));
    }
    const weeklyById = new Map(group.attendanceList.map((a) => [String(a.member_id), a]));
    const rosterIds = new Set(group.roster.map((m) => String(m.id)));
    const fromRoster = group.roster.map((m) => ({
      item: { member_id: m.id, member_name: m.fullname || m.nickname, member_phone: m.phone, member_email: m.email },
      weekly: weeklyById.get(String(m.id)) || null,
      group,
    }));
    const onlyInAttendance = group.attendanceList
      .filter((a) => !rosterIds.has(String(a.member_id)))
      .map((a) => ({ item: a, weekly: a, group }));
    return [...fromRoster, ...onlyInAttendance];
  });

  const now = Date.now();
  const isPastMeeting = (meeting, fallbackDate) => {
    const d = new Date(meeting?.start_date || fallbackDate || NaN);
    return !isNaN(d.getTime()) && d.getTime() <= now;
  };

  // Deduplikasi lintas kelas: santri yang terdaftar di >1 kelas hanya muncul sekali (kelas pertama)
  for (const { item, weekly, group } of studentItems) {
    const { batchNo } = group;
    const memberId = item.member_id ? String(item.member_id) : "";
    const memberName = item.member_name || "Tanpa Nama";
    const memberPhone = item.member_phone || "";
    const phoneKey = normalizePhone(memberPhone);
    const nameKey = normalizeName(memberName);

    // Kunci unik deduplikasi (per batch)
    const uniqueKey = memberId || phoneKey || nameKey;
    const dedupKey = byBatch(batchNo, uniqueKey);
    if (!uniqueKey || processedMemberKeys.has(dedupKey)) {
      continue;
    }
    processedMemberKeys.add(dedupKey);

    // Matching Komitmen
    const commitmentData =
      (memberId ? commitmentsByMemberId.get(byBatch(batchNo, memberId)) : null) ||
      commitmentsByPhone.get(byBatch(batchNo, phoneKey)) ||
      commitmentsByName.get(byBatch(batchNo, nameKey)) ||
      null;
    const memberEmail = String(item.member_email || commitmentData?.email || "").trim();

    // Hitung Presensi Pekan Ini & Histori 8 Pekan dari data class attendance
    const attendanceMeetings = group.meetings;
    const currentMeeting = attendanceMeetings[currentWeek - 1];

    // Status presensi pekan terpilih. Belum diinput (member_list null & tidak ada di presensi mingguan)
    // ≠ tidak hadir: tidak dihitung absen dan tidak memicu WA presensi.
    let isRecorded = false;
    let isAttended = false;
    if (currentMeeting && Array.isArray(currentMeeting.member_list)) {
      isRecorded = true;
      isAttended = Boolean(memberId) && currentMeeting.member_list.some((id) => String(id) === memberId);
    } else if (weekly) {
      isRecorded = true;
      isAttended = Boolean(weekly.attend);
    }
    const isAbsent = isRecorded && !isAttended;
    const unrecordedLabel = isPastMeeting(currentMeeting, group.schedule?.date) ? "Belum Diisi" : "Belum Berjalan";

    let dots = [];
    let historyScore = "";
    let historyTitle = "";

    if (attendanceMeetings.length > 0) {
      let attendedWeeksCount = 0;
      let completedWeeksCount = 0;
      const tooltipItems = [];

      attendanceMeetings.forEach((meeting, idx) => {
        const weekIdx = idx + 1;
        // member_list null: pertemuan belum berjalan, atau sudah lewat tapi presensi belum diinput
        if (meeting.member_list === null || meeting.member_list === undefined) {
          if (isPastMeeting(meeting)) {
            dots.push("belumDiisi");
            tooltipItems.push(`Pekan ${weekIdx}: Belum Diisi`);
          } else {
            dots.push("belumBerjalan");
            tooltipItems.push(`Pekan ${weekIdx}: Belum Berjalan`);
          }
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

      historyScore = `${attendedWeeksCount}/${completedWeeksCount}`;
      historyTitle = tooltipItems.join(" • ");
    } else if (isRecorded) {
      // Fallback jika classAttendance belum dimuat
      dots = [isAttended ? "hadir" : "tidakHadir"];
      historyScore = isAttended ? "1/1" : "0/1";
      historyTitle = `Presensi Pekan ${currentWeek}: ${isAttended ? "Hadir" : "Tidak Hadir"}${weekly?.note ? ` (${weekly.note})` : ""}`;
    } else {
      dots = [unrecordedLabel === "Belum Diisi" ? "belumDiisi" : "belumBerjalan"];
      historyScore = "-";
      historyTitle = `Presensi Pekan ${currentWeek}: ${unrecordedLabel}`;
    }

    let presenceObj;
    if (!isRecorded) {
      if (unrecordedLabel === "Belum Diisi") countBelumDiisi++;
      else countBelumBerjalan++;
      presenceObj = {
        label: unrecordedLabel,
        tone: unrecordedLabel === "Belum Diisi" ? "belumDiisi" : "belumBerjalan",
      };
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
    const presensiTrackingKey = makeTrackingKey("presensi", targetMemberId, `batch_${batchNo}_pekan_${currentWeek}`);
    const presensiLog = reminderLogsMap?.get?.(presensiTrackingKey);
    const presensiState = reminderTrackingService.computeReminderState({
      isResolved: !isAbsent,
      logRecord: presensiLog,
    });

    const infaqTrackingKey = makeTrackingKey("infaq", targetMemberId, `batch_${batchNo}`);
    const infaqLog = reminderLogsMap?.get?.(infaqTrackingKey);
    const infaqState = reminderTrackingService.computeReminderState({
      isResolved: !isOverdue,
      logRecord: infaqLog,
    });

    // Kategorisasi Tab Filter Santri
    const categories = [];
    categories.push(weeklyCommitment > 0 ? "committed" : "uncommitted");
    if (isOverdue) categories.push("overdue");
    if (isOverdue || isAbsent) {
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
      (isAbsent && presensiState.status === "unreminded")
    ) {
      categories.push("unreminded");
    }
    if (
      (isOverdue && infaqState.status === "reminded") ||
      (isAbsent && presensiState.status === "reminded")
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
          contextId: `batch_${batchNo}`,
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
          contextId: `batch_${batchNo}`,
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
          contextId: `batch_${batchNo}`,
          detail: `Tertunggak ${formatRupiah(targetObligation - validInfaqAmount)}`,
          currentCount: 0,
        });
      }
    }

    // Tombol 2: Presensi Tidak Hadir (hanya jika presensi pekan ini sudah diinput)
    if (isAbsent) {
      if (presensiState.isStagnant) {
        actions.push({
          kind: "wa",
          variant: "amber",
          icon: "priority_high",
          label: "Follow-up Absen (>3 hr)",
          waType: "presensi",
          domain: "presensi",
          contextId: `batch_${batchNo}_pekan_${currentWeek}`,
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
          contextId: `batch_${batchNo}_pekan_${currentWeek}`,
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
          contextId: `batch_${batchNo}_pekan_${currentWeek}`,
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
      rowKey: dedupKey,
      batchNo,
      classId: group.cls?.id ? String(group.cls.id) : "",
      className: group.cls?.name || item.class_name || "",
      classDay: group.schedule?.label || null,
      name: memberName,
      initials: getInitials(memberName),
      phoneDisplay: formatPhoneDisplay(memberPhone),
      rawPhone: memberPhone,
      email: memberEmail,
      searchText: `${memberName.toLowerCase()} ${phoneKey} ${memberEmail.toLowerCase()}`,
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

  // Card 1: Presensi — tingkat kehadiran dihitung dari santri yang presensinya sudah diinput
  const countRecorded = countHadir + countTidakHadir;
  const percentOfTotal = (n) => (totalStudents > 0 ? ((n / totalStudents) * 100).toFixed(1) + "%" : "0%");
  const attendanceRate = countRecorded > 0 ? ((countHadir / countRecorded) * 100).toFixed(1) + "%" : "-";

  const summaryAttendance = {
    rate: attendanceRate,
    weekBadge: `Pekan ${currentWeek} / ${numMeetings}`,
    studentCount: totalStudents,
    bar: [
      { key: "hadir", width: percentOfTotal(countHadir), className: "bg-[#0284c7]", title: `Hadir: ${countHadir}` },
      { key: "tidak_hadir", width: percentOfTotal(countTidakHadir), className: "bg-amber-300", title: `Tidak Hadir: ${countTidakHadir}` },
      { key: "belum_diisi", width: percentOfTotal(countBelumDiisi), className: "bg-slate-300", title: `Belum Diisi: ${countBelumDiisi}` },
      { key: "belum_berjalan", width: percentOfTotal(countBelumBerjalan), className: "bg-slate-100", title: `Belum Berjalan: ${countBelumBerjalan}` },
    ],
    legend: [
      { label: `${countHadir} Hadir`, dotClass: "bg-[#0284c7]", textClass: "font-medium" },
      { label: `${countTidakHadir} Tidak Hadir`, dotClass: "bg-amber-400", textClass: "font-medium" },
      ...(countBelumDiisi > 0
        ? [{ label: `${countBelumDiisi} Belum Diisi`, dotClass: "bg-slate-300", textClass: "text-slate-500 font-medium" }]
        : []),
      ...(countBelumBerjalan > 0
        ? [{ label: `${countBelumBerjalan} Belum Berjalan`, dotClass: "bg-slate-200 border border-slate-300", textClass: "text-slate-500 font-medium" }]
        : []),
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
  const countCommitted = studentRows.filter((s) => s.categories.includes("committed")).length;
  const countUncommitted = studentRows.filter((s) => s.categories.includes("uncommitted")).length;
  const countStagnant = studentRows.filter((s) => s.categories.includes("stagnant")).length;
  const countUnreminded = studentRows.filter((s) => s.categories.includes("unreminded")).length;
  const countAttention = studentRows.filter((s) => s.categories.includes("attention")).length;
  const countCompleted = studentRows.filter((s) => s.categories.includes("completed")).length;

  const tabs = [
    { id: "all", label: "Semua Anggota", count: `(${countAll})`, countStyle: "plain" },
    ...(countStagnant > 0
      ? [{ id: "stagnant", label: "Stagnan > 3 Hari", count: String(countStagnant), countStyle: "badge" }]
      : []),
    { id: "committed", label: "Berkomitmen", count: `(${countCommitted})`, countStyle: "plain" },
    { id: "uncommitted", label: "Tidak Berkomitmen", count: `(${countUncommitted})`, countStyle: "plain" },
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
        classId: String(selectedClassId || selectedClass?.id || ""),
        weekId: String(currentWeek),
      },
    },
    attendance: summaryAttendance,
    infaq: summaryInfaq,
    promoted: null,
    table: {
      selectedWeek: currentWeek,
      notice,
      totalRegistered: totalStudents,
      updatedAt: `Diperbarui: ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
      tabs,
      students: studentRows,
    },
  };
}
