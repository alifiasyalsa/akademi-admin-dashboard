import { useState, useEffect, useCallback, useRef } from "react";
import { cmsApi } from "../api/cmsEndpoints.js";
import { tokenManager } from "../api/tokenManager.js";
import { buildWorkbenchViewModel } from "../services/workbenchService.js";
import { reminderTrackingService } from "../services/reminderTrackingService.js";
import { stitchMock } from "../data/stitchMock.js";

export function useWorkbenchData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authStatus, setAuthStatus] = useState(() => ({
    hasToken: tokenManager.hasValidAuth(),
    isExpired: false,
  }));

  // Master options cache
  const [batches, setBatches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);

  // Selected filters
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("1");

  // Normalized ViewModel for UI
  const [viewModel, setViewModel] = useState(() => stitchMock);

  // Ref untuk menghindari race condition
  const fetchCountRef = useRef(0);

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

      const batchList = await cmsApi.getBatches();
      setBatches(batchList);

      if (batchList.length > 0) {
        // Cari batch aktif atau batch pertama
        const activeBatch = batchList.find((b) => b.is_active) || batchList[0];
        const batchNo = String(activeBatch.batch_no);
        setSelectedBatch(batchNo);

        // Fetch kelas untuk batch tersebut
        const classResult = await cmsApi.getClasses({ batch: batchNo, limit: 100 });
        const classList = classResult.data || [];
        setClasses(classList);

        if (classList.length > 0) {
          const firstClass = classList[0];
          setSelectedClassId(String(firstClass.id));
        }
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

  // 2. Handler saat Batch berubah: fetch ulang list kelas
  // Batch, daftar kelas, dan kelas terpilih di-set bersamaan SETELAH kelas termuat,
  // agar effect detail tidak berjalan dengan kombinasi batch baru + kelas lama (double fetch).
  const handleBatchChange = useCallback(async (newBatchNo) => {
    if (!tokenManager.hasValidAuth()) {
      setSelectedBatch(newBatchNo);
      return;
    }

    try {
      setLoading(true);
      const classResult = await cmsApi.getClasses({ batch: newBatchNo, limit: 100 });
      const classList = classResult.data || [];
      setSelectedBatch(newBatchNo);
      setClasses(classList);
      setSelectedClassId(classList.length > 0 ? String(classList[0].id) : "");
    } catch (err) {
      setSelectedBatch(newBatchNo);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Detail Data Kelas & Agregasi Workbench (Presensi, Komitmen)
  // Hanya weekly attendance yang bergantung pada pekan. Komitmen (per batch), presensi 8 pekan
  // (per kelas), dan jadwal guru (per guru) dilayani dari cache cmsApi; `force` = bypass cache.
  const fetchWorkbenchDetail = useCallback(async ({ force = false } = {}) => {
    if (!tokenManager.hasValidAuth()) {
      setViewModel(stitchMock);
      return;
    }

    if (!selectedClassId) {
      return;
    }

    const activeClass = classes.find((c) => String(c.id) === String(selectedClassId));
    // Guard: kelas harus milik daftar kelas saat ini (hindari kombinasi batch/kelas tidak valid)
    if (!activeClass) {
      return;
    }

    const currentFetchId = ++fetchCountRef.current;
    setLoading(true);
    setError(null);

    try {
      const weekNum = Number(selectedWeek) || 1;

      const promises = [
        cmsApi.getWeeklyAttendance({
          batch_id: selectedBatch,
          class_id: selectedClassId,
          week_num: weekNum,
          limit: 500,
        }),
        cmsApi.getMemberCommitments({
          batch: selectedBatch,
          fetchAll: true,
          force,
        }),
        cmsApi.getClassAttendance(selectedClassId, { force }).catch(() => null),
        reminderTrackingService.fetchBatchReminders(selectedBatch).catch(() => new Map()),
      ];

      if (activeClass?.teacher?.id) {
        promises.push(
          cmsApi.getTeacherClasses(activeClass.teacher.id, { force }).catch(() => [])
        );
      }

      const [attendanceRes, commitmentsRes, classAttendanceRes, reminderLogsMap, teacherClassesRes] = await Promise.all(promises);

      // Pastikan bukan fetch kadaluwarsa dari race condition
      if (currentFetchId !== fetchCountRef.current) return;

      // Filter jadwal khusus kelas aktif jika ada
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
        selectedWeekNum: weekNum,
        batches,
        classes,
        attendanceList: attendanceRes.data || [],
        commitmentsList: commitmentsRes.data || [],
        classAttendance: classAttendanceRes,
        teacherSchedule: extractedSchedule,
        reminderLogsMap,
      });

      setViewModel(newModel);
    } catch (err) {
      if (currentFetchId === fetchCountRef.current) {
        console.warn("Gagal fetch data detail workbench:", err);
        setError(err);
      }
    } finally {
      if (currentFetchId === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, [selectedBatch, selectedClassId, selectedWeek, classes, batches]);

  useEffect(() => {
    if (selectedClassId) {
      fetchWorkbenchDetail();
    }
  }, [selectedClassId, selectedWeek, fetchWorkbenchDetail]);

  // Handler pemilihan filter dari GlobalFilterBar
  const handleSelectionChange = useCallback(
    (newSelection) => {
      if (newSelection.batchId !== selectedBatch) {
        handleBatchChange(newSelection.batchId);
      }
      if (newSelection.classId !== selectedClassId) {
        setSelectedClassId(newSelection.classId);
      }
      if (newSelection.weekId !== selectedWeek) {
        setSelectedWeek(newSelection.weekId);
      }
    },
    [selectedBatch, selectedClassId, selectedWeek, handleBatchChange]
  );

  return {
    data: viewModel,
    loading,
    error,
    authStatus,
    refreshData: () => fetchWorkbenchDetail({ force: true }),
    onSelectionChange: handleSelectionChange,
    selectedFilters: {
      batchId: selectedBatch,
      classId: selectedClassId,
      weekId: selectedWeek,
    },
  };
}
