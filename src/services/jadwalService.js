/**
 * Jadwal Service
 * Mengubah jadwal pertemuan dari GET /v1/classes/schedule menjadi indeks hari per pekan.
 *
 * Catatan perilaku API (diverifikasi terhadap CMS):
 * - Wajib `start` & `end` berformat YYYY-MM-DD; parameter `batch` diabaikan server,
 *   jadi item harus disaring manual berdasarkan kelas di batch aktif.
 * - Tiap item = 1 pertemuan: `id` (id kelas), `meeting_num` (pekan ke-), `class_time` (ISO, WIB).
 */

export const DAYS = [
  { id: "senin", label: "Senin" },
  { id: "selasa", label: "Selasa" },
  { id: "rabu", label: "Rabu" },
  { id: "kamis", label: "Kamis" },
  { id: "jumat", label: "Jumat" },
  { id: "sabtu", label: "Sabtu" },
  { id: "ahad", label: "Ahad" },
];

export const ALL_DAY_IDS = DAYS.map((d) => d.id);

const TIME_ZONE = "Asia/Jakarta";
const DAY_LABEL = new Map(DAYS.map((d) => [d.id, d.label]));
const EN_WEEKDAY_TO_ID = {
  Monday: "senin",
  Tuesday: "selasa",
  Wednesday: "rabu",
  Thursday: "kamis",
  Friday: "jumat",
  Saturday: "sabtu",
  Sunday: "ahad",
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Hari & jam (WIB) dari sebuah waktu ISO. */
export function getDayAndTime(raw) {
  const d = parseDate(raw);
  if (!d) return null;
  const dayId = EN_WEEKDAY_TO_ID[weekdayFormatter.format(d)] || null;
  const time = timeFormatter.format(d);
  const dayLabel = dayId ? DAY_LABEL.get(dayId) : null;
  return { dayId, dayLabel, time, label: dayLabel ? `${dayLabel} ${time}` : null, date: d };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rentang tanggal untuk query jadwal sebuah batch, dihitung dari start_date kelas.
 * Diberi kelonggaran 4 pekan setelah pertemuan terakhir untuk jadwal pengganti.
 */
export function getScheduleRange(classes = []) {
  const starts = classes.map((c) => parseDate(c.start_date)).filter(Boolean);
  if (starts.length === 0) return null;
  const maxMeetings = Math.max(8, ...classes.map((c) => Number(c.num_of_meetings) || 0));
  const first = Math.min(...starts.map((d) => d.getTime()));
  const last = Math.max(...starts.map((d) => d.getTime()));
  return {
    start: isoDateFormatter.format(new Date(first - DAY_MS)),
    end: isoDateFormatter.format(new Date(last + (maxMeetings + 4) * 7 * DAY_MS)),
  };
}

/**
 * Indeks jadwal: Map<pekan, Map<classId, { dayId, dayLabel, time, label, date }>>.
 * Hanya kelas dalam `classes` (batch aktif) yang diindeks.
 */
export function buildWeekScheduleIndex(scheduleItems = [], classes = []) {
  const classIds = new Set(classes.map((c) => String(c.id)));
  const index = new Map();
  scheduleItems.forEach((item) => {
    const classId = String(item.class_id ?? item.id ?? "");
    const week = Number(item.meeting_num ?? item.attendance_no);
    if (!classIds.has(classId) || !week) return;
    const info = getDayAndTime(item.actual_class_time || item.class_time);
    if (!info?.dayId) return;
    if (!index.has(week)) index.set(week, new Map());
    const weekMap = index.get(week);
    // Jika ada >1 pertemuan untuk pekan yang sama, pakai yang paling awal
    const existing = weekMap.get(classId);
    if (!existing || info.date < existing.date) weekMap.set(classId, info);
  });
  return index;
}

/**
 * Jadwal kelas untuk pekan tertentu. Fallback ke hari dari `start_date`
 * (kelas weekly) jika jadwal pekan tersebut tidak tersedia.
 */
export function getClassWeekSchedule(scheduleIndex, cls, week) {
  if (!cls) return null;
  const fromSchedule = scheduleIndex?.get(Number(week))?.get(String(cls.id));
  return fromSchedule || getDayAndTime(cls.start_date);
}

/** Tanggal pertemuan paling awal per pekan di batch (untuk label dropdown Pekan). */
export function getWeekStartDates(scheduleIndex) {
  const result = new Map();
  scheduleIndex?.forEach((weekMap, week) => {
    let earliest = null;
    weekMap.forEach((info) => {
      if (!earliest || info.date < earliest) earliest = info.date;
    });
    if (earliest) result.set(week, earliest);
  });
  return result;
}

export function formatDaySelection(dayIds = []) {
  if (dayIds.length === 0) return "Belum ada hari";
  if (dayIds.length === DAYS.length) return "Semua Hari";
  return DAYS.filter((d) => dayIds.includes(d.id))
    .map((d) => d.label)
    .join(", ");
}
