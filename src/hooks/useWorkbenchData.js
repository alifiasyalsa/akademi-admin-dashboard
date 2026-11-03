import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cmsApi } from "../api/cmsEndpoints.js";
import { tokenManager } from "../api/tokenManager.js";
import { buildWorkbenchViewModel } from "../services/workbenchService.js";
import { reminderTrackingService } from "../services/reminderTrackingService.js";
import {
  ALL_DAY_IDS,
  buildWeekScheduleIndex,
  formatDaySelection,
  getClassWeekSchedule,
  getScheduleRange,
} from "../services/jadwalService.js";
import { stitchMock } from "../data/stitchMock.js";

// Opsi khusus di dropdown Kelas: gabungan semua kelas pada hari yang dipilih
export const ALL_DAY_CLASSES_ID = "__semua_kelas_hari__";

const MAX_PARALLEL_CLASS_FETCH = 6;

// Hanya batch berjudul "16" dan batch yang lebih baru (batch_no lebih besar) yang ditampilkan.
// Catatan: batch_no ≠ judul batch (mis. batch_no 16 = "Quran Camp #1").
const MIN_VISIBLE_BATCH_TITLE = "16";

function filterVisibleBatches(batchList) {
  const minBatch = batchList.find((b) => String(b.title).trim() === MIN_VISIBLE_BATCH_TITLE);
  if (!minBatch) return batchList;
  return batchList.filter((b) => Number(b.batch_no) >= Number(minBatch.batch_no));
}

async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Ambil kelas dari satu/lebih batch + indeks jadwal per pekan sekaligus.
 * Jadwal gagal dimuat tidak menggagalkan kelas: hari jatuh ke start_date kelas.
 */
async function loadBatchClasses(batchNos) {
  const classResults = await Promise.all(
    batchNos.map((batchNo) => cmsApi.getClasses({ batch: batchNo, limit: 100 }))
  );
  const classList = classResults.flatMap((res) => res.data || []);
  let scheduleIndex = null;
  const range = getScheduleRange(classList);
  if (range) {
    try {
      const items = await cmsApi.getClassesSchedule(range);
      scheduleIndex = buildWeekScheduleIndex(items, classList);
    } catch (err) {
      console.warn("Gagal memuat jadwal kelas, hari memakai start_date:", err);
    }
  }
  return { classList, scheduleIndex };
}

export function useWorkbenchData() {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [error, setError] = useState(null);
  const [authStatus, setAuthStatus] = useState(() => ({
    hasToken: tokenManager.hasValidAuth(),
    isExpired: false,
  }));

  // Master options cache
  const [batches, setBatches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [scheduleIndex, setScheduleIndex] = useState(null);
  const [teacherSchedule, setTeacherSchedule] = useState([]);

  // Selected filters: Batch (multi) → Pekan → Hari → Kelas
  const [selectedBatches, setSelectedBatches] = useState([]);
  const selectedBatch = selectedBatches[0] || "";
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [selectedDays, setSelectedDays] = useState(ALL_DAY_IDS);
  const [selectedClassId, setSelectedClassId] = useState("");

  // Normalized ViewModel for UI
  const [viewModel, setViewModel] = useState(() => stitchMock);

  // Ref untuk menghindari race condition
  const fetchCountRef = useRef(0);

  const weekNum = Number(selectedWeek) || 1;
  const isDayFiltered = classes.length > 0 && selectedDays.length < ALL_DAY_IDS.length;

  // Kelas yang terjadwal di hari terpilih pada pekan terpilih
  const dayClasses = useMemo(() => {
    if (!isDayFiltered) return classes;
    return classes.filter((c) =>
      selectedDays.includes(getClassWeekSchedule(scheduleIndex, c, weekNum)?.dayId)
    );
  }, [classes, isDayFiltered, selectedDays, scheduleIndex, weekNum]);

  // Monitor status autentikasi token
  useEffect(() => {
    const unsubscribe = tokenManager.subscribe((event) => {
      if (event.type === "SESSION_EXPIRED") {
        setAuthStatus({ hasToken: false, isExpired: true });
        setError(new Error("Sesi token telah berakhir. Silakan masukkan access token CMS yang baru."));
      } else if (event.type === "TOKEN_UPDATED") {
        setAuthStatus({ hasToken: true, isExpired: false });
        setError(null);
      }
    });
    return unsubscribe;
  }, []);

  // 1. Inisialisasi: Load Master Batches & Initial Data
  const initMasterData = useCallback(async () => {
    // Jika tidak ada token (misal sebelum dimasukkan token), tetap fallback aman ke mock
    if (!tokenManager.hasValidAuth()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const batchList = filterVisibleBatches(await cmsApi.getBatches());
      setBatches(batchList);

      if (batchList.length > 0) {
        // Cari batch aktif atau batch pertama
        const activeBatch = batchList.find((b) => b.is_active) || batchList[0];
        const batchNo = String(activeBatch.batch_no);

        const { classList, scheduleIndex: index } = await loadBatchClasses([batchNo]);
        setSelectedBatches([batchNo]);
        setClasses(classList);
        setScheduleIndex(index);
        setSelectedClassId(classList.length > 0 ? String(classList[0].id) : "");
      }
    } catch (err) {
      console.warn("Gagal inisialisasi master data dari API:", err);
      setError(err);
      // Fallback ke stitchMock jika offline/endpoint error
      setViewModel(stitchMock);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initMasterData();
  }, [initMasterData]);

  // 2. Handler saat pilihan Batch berubah: fetch ulang kelas + jadwal, reset filter hari
  // Batch, daftar kelas, dan kelas terpilih di-set bersamaan SETELAH kelas termuat,
  // agar effect detail tidak berjalan dengan kombinasi batch baru + kelas lama (double fetch).
  // >1 batch dipilih → default ke "Semua Kelas" (gabungan); 1 batch → kelas pertama;
  // 0 batch ("Hapus Semua") → tabel dikosongkan tanpa request ke CMS.
  const handleBatchesChange = useCallback(
    async (ids) => {
      if (!tokenManager.hasValidAuth()) {
        setSelectedBatches(ids);
        return;
      }

      if (ids.length === 0) {
        fetchCountRef.current++; // batalkan hasil fetch yang masih berjalan
        setSelectedBatches([]);
        setSelectedDays(ALL_DAY_IDS);
        setClasses([]);
        setScheduleIndex(null);
        setSelectedClassId("");
        setLoading(false);
        setLoadingProgress(null);
        setViewModel(
          buildWorkbenchViewModel({
            batches,
            selectedWeekNum: weekNum,
            classGroups: [],
            notice: "Belum ada batch yang dipilih. Centang minimal satu batch.",
          })
        );
        return;
      }

      try {
        setLoading(true);
        const { classList, scheduleIndex: index } = await loadBatchClasses(ids);
        setSelectedBatches(ids);
        setSelectedDays(ALL_DAY_IDS);
        setClasses(classList);
        setScheduleIndex(index);
        setSelectedClassId(
          ids.length > 1 && classList.length > 0
            ? ALL_DAY_CLASSES_ID
            : classList.length > 0
            ? String(classList[0].id)
            : ""
        );
      } catch (err) {
        setSelectedBatches(ids);
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [batches, weekNum]
  );

  // Jika pekan berganti dan kelas spesifik tidak lagi terjadwal di hari terpilih, kembali ke mode gabungan
  useEffect(() => {
    if (
      isDayFiltered &&
      selectedClassId !== ALL_DAY_CLASSES_ID &&
      !dayClasses.some((c) => String(c.id) === String(selectedClassId))
    ) {
      setSelectedClassId(ALL_DAY_CLASSES_ID);
    }
  }, [isDayFiltered, dayClasses, selectedClassId]);

  // 3. Fetch Detail Data Kelas & Agregasi Workbench (Presensi, Komitmen)
  // Mode tunggal: 1 kelas. Mode gabungan: semua kelas di hari terpilih, di-fetch paralel
  // (maks MAX_PARALLEL_CLASS_FETCH sekaligus). Semua endpoint dilayani cache cmsApi; `force` = bypass cache.
  const fetchWorkbenchDetail = useCallback(async ({ force = false } = {}) => {
    if (!tokenManager.hasValidAuth()) {
      setViewModel(stitchMock);
      return;
    }

    if (!selectedClassId) {
      return;
    }

    const isAggregate = selectedClassId === ALL_DAY_CLASSES_ID;
    const activeClass = isAggregate
      ? null
      : classes.find((c) => String(c.id) === String(selectedClassId));
    // Guard: kelas harus milik daftar kelas (dan hari) saat ini, hindari kombinasi filter tidak valid
    if (!isAggregate && (!activeClass || !dayClasses.includes(activeClass))) {
      return;
    }
    const targetClasses = isAggregate ? dayClasses : [activeClass];
    const extraClassOptions = [
      {
        id: ALL_DAY_CLASSES_ID,
        label: `Semua Kelas • ${formatDaySelection(selectedDays)} (${dayClasses.length} kelas)`,
      },
    ];

    // Tidak ada kelas (belum ada hari dicentang / tidak ada jadwal): kosongkan tabel tanpa request ke CMS
    if (isAggregate && targetClasses.length === 0) {
      fetchCountRef.current++;
      setLoading(false);
      setLoadingProgress(null);
      setViewModel(
        buildWorkbenchViewModel({
          selectedBatch,
          selectedClassId,
          selectedWeekNum: weekNum,
          batches,
          classes: dayClasses,
          classGroups: [],
          scheduleIndex,
          extraClassOptions,
          notice:
            selectedDays.length === 0
              ? "Belum ada hari yang dipilih. Centang minimal satu hari."
              : `Tidak ada kelas terjadwal hari ${formatDaySelection(selectedDays)} di pekan ${weekNum}.`,
        })
      );
      return;
    }

    const currentFetchId = ++fetchCountRef.current;
    const isCurrent = () => currentFetchId === fetchCountRef.current;
    setLoading(true);
    setError(null);
    setLoadingProgress(isAggregate ? { done: 0, total: targetClasses.length } : null);

    try {
      // Daftar santri dari roster kelas (tidak bergantung presensi); presensi pekan hanya ditempelkan.
      const fetchClassGroup = async (cls) => {
        try {
          const [roster, attendanceRes, classAttendanceRes] = await Promise.all([
            cmsApi.getClassMembers(cls.id, { force }).catch(() => null),
            cmsApi
              .getWeeklyAttendance({
                batch_id: cls.batch ?? selectedBatch,
                class_id: cls.id,
                week_num: weekNum,
                limit: 500,
                force,
              })
              .catch(() => null),
            cmsApi.getClassAttendance(cls.id, { force }).catch(() => null),
          ]);
          if (roster === null && attendanceRes === null) {
            throw new Error(`Data kelas ${cls.name} gagal dimuat.`);
          }
          return {
            cls,
            roster,
            attendanceList: attendanceRes?.data || [],
            attendanceFailed: attendanceRes === null,
            classAttendance: classAttendanceRes,
          };
        } catch (err) {
          // Mode tunggal: error diteruskan. Mode gabungan: kelas gagal dicatat, kelas lain tetap tampil.
          if (!isAggregate) throw err;
          console.warn(`Gagal memuat presensi kelas ${cls.name}:`, err);
          return { cls, failed: true };
        } finally {
          if (isAggregate && isCurrent()) {
            setLoadingProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
          }
        }
      };

      // Komitmen & log pengingat diambil per batch terpilih lalu digabung.
      // Komitmen ditandai `_batch` agar pencocokan santri tidak tertukar antar batch.
      const loadCommitments = () =>
        Promise.all(
          selectedBatches.map(async (batchNo) => {
            const res = await cmsApi.getMemberCommitments({ batch: batchNo, fetchAll: true, force });
            return (res.data || []).map((c) => ({ ...c, _batch: batchNo }));
          })
        ).then((lists) => lists.flat());
      const loadReminderLogs = () =>
        Promise.all(
          selectedBatches.map((batchNo) =>
            reminderTrackingService.fetchBatchReminders(batchNo).catch(() => new Map())
          )
        ).then((maps) => new Map(maps.flatMap((m) => [...m])));

      const [groupResults, commitmentsList, reminderLogsMap, teacherClassesRes] = await Promise.all([
        mapWithLimit(targetClasses, MAX_PARALLEL_CLASS_FETCH, fetchClassGroup),
        loadCommitments(),
        loadReminderLogs(),
        activeClass?.teacher?.id
          ? cmsApi.getTeacherClasses(activeClass.teacher.id, { force }).catch(() => [])
          : Promise.resolve(null),
      ]);

      // Pastikan bukan fetch kadaluwarsa dari race condition
      if (!isCurrent()) return;

      const failedGroups = groupResults.filter((g) => g.failed);
      if (isAggregate && failedGroups.length === targetClasses.length) {
        throw new Error("Gagal memuat data semua kelas di hari terpilih.");
      }

      const attendanceFailedGroups = groupResults.filter((g) => !g.failed && g.attendanceFailed);
      const noticeParts = [];
      if (failedGroups.length > 0) {
        noticeParts.push(
          `${failedGroups.length} dari ${targetClasses.length} kelas gagal dimuat: ${failedGroups
            .map((g) => g.cls.name)
            .join(", ")}`
        );
      }
      if (attendanceFailedGroups.length > 0) {
        noticeParts.push(
          `Presensi gagal dimuat (ditampilkan "Belum Diisi"): ${attendanceFailedGroups
            .map((g) => g.cls.name)
            .join(", ")}`
        );
      }
      const notice = noticeParts.length > 0 ? noticeParts.join(" • ") : null;

      // Filter jadwal khusus kelas aktif jika ada (label tanggal di dropdown Pekan)
      let extractedSchedule = [];
      if (Array.isArray(teacherClassesRes)) {
        const foundClassSchedule = teacherClassesRes.find((tc) => String(tc.id) === String(selectedClassId));
        if (foundClassSchedule?.schedule) {
          extractedSchedule = foundClassSchedule.schedule;
          setTeacherSchedule(extractedSchedule);
        }
      }

      // Bangun model data lengkap untuk UI dengan presensi, komitmen, & reminder logs
      const newModel = buildWorkbenchViewModel({
        selectedBatch,
        selectedClass: activeClass,
        selectedClassId,
        selectedWeekNum: weekNum,
        batches,
        classes: dayClasses,
        classGroups: groupResults.filter((g) => !g.failed),
        commitmentsList,
        teacherSchedule: extractedSchedule,
        reminderLogsMap,
        scheduleIndex,
        notice,
        extraClassOptions,
      });

      setViewModel(newModel);
    } catch (err) {
      if (isCurrent()) {
        console.warn("Gagal fetch data detail workbench:", err);
        setError(err);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setLoadingProgress(null);
      }
    }
  }, [selectedBatch, selectedBatches, selectedClassId, weekNum, classes, batches, dayClasses, isDayFiltered, selectedDays, scheduleIndex]);

  useEffect(() => {
    if (selectedClassId) {
      fetchWorkbenchDetail();
    }
  }, [selectedClassId, fetchWorkbenchDetail]);

  // Handler pemilihan filter dari GlobalFilterBar
  const handleSelectionChange = useCallback(
    (newSelection) => {
      const newBatchIds = newSelection.batchIds || (newSelection.batchId ? [newSelection.batchId] : []);
      if (newBatchIds.join(",") !== selectedBatches.join(",")) {
        handleBatchesChange(newBatchIds);
        return;
      }
      if (newSelection.classId !== selectedClassId) {
        setSelectedClassId(newSelection.classId);
      }
      if (newSelection.weekId !== selectedWeek) {
        setSelectedWeek(newSelection.weekId);
      }
    },
    [selectedBatches, selectedClassId, selectedWeek, handleBatchesChange]
  );

  // Handler filter Hari: sebagian hari → mode gabungan; semua hari → kembali ke 1 kelas
  // (kecuali >1 batch dipilih: tetap gabungan)
  const handleDaysChange = useCallback(
    (days) => {
      setSelectedDays(days);
      if (days.length < ALL_DAY_IDS.length) {
        setSelectedClassId(ALL_DAY_CLASSES_ID);
      } else if (selectedClassId === ALL_DAY_CLASSES_ID && selectedBatches.length <= 1) {
        setSelectedClassId(classes.length > 0 ? String(classes[0].id) : "");
      }
    },
    [classes, selectedClassId, selectedBatches]
  );

  return {
    data: viewModel,
    loading,
    loadingLabel: loadingProgress
      ? `Memuat ${loadingProgress.done}/${loadingProgress.total} kelas...`
      : null,
    error,
    authStatus,
    refreshData: () => fetchWorkbenchDetail({ force: true }),
    onSelectionChange: handleSelectionChange,
    selectedFilters: {
      batchId: selectedBatch,
      batchIds: selectedBatches,
      classId: selectedClassId,
      weekId: selectedWeek,
    },
    dayFilter: {
      enabled: classes.length > 0,
      selectedDays,
      onChange: handleDaysChange,
    },
  };
}
