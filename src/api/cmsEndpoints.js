import { apiClient } from "./client.js";

/**
 * Endpoint Fetchers CMS Akademi QuranBest
 * Mengacu persis pada dokumentasi API CMS tanpa menambahkan endpoint baru.
 */

// ---------------------------------------------------------------------------
// Cache in-memory sederhana (hilang saat reload halaman).
// - Menyatukan request identik yang sedang berjalan (dedupe in-flight).
// - TTL agar data tidak basi terlalu lama; `force: true` untuk bypass (tombol Refresh).
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();

function cached(key, loader, { force = false } = {}) {
  const hit = responseCache.get(key);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.promise;
  }
  const promise = loader().catch((err) => {
    // Jangan simpan kegagalan di cache
    if (responseCache.get(key)?.promise === promise) responseCache.delete(key);
    throw err;
  });
  responseCache.set(key, { promise, at: Date.now() });
  return promise;
}

/**
 * Ambil semua halaman datatable. Halaman pertama menentukan `recordsTotal`,
 * sisa halaman diambil paralel (bukan berurutan).
 * Langkah offset memakai jumlah baris aktual halaman pertama, sehingga tetap benar
 * walaupun server membatasi `limit` lebih kecil dari yang diminta.
 */
async function fetchAllPages(fetchPage, { offset = 0, pageSize, fetchAll = true }) {
  const firstRes = await fetchPage(offset, pageSize);
  const firstData = firstRes?.data || [];
  // Jika ada recordsFiltered (hasil filter server seperti status=wait), gunakan sebagai batas data terfilter
  const total = firstRes?.recordsFiltered ?? firstRes?.recordsTotal ?? firstData.length ?? 0;
  const recordsTotal = firstRes?.recordsTotal ?? total;

  if (fetchAll === false || firstData.length === 0 || offset + firstData.length >= total) {
    return { total: total || firstData.length, recordsTotal, data: firstData };
  }

  const step = firstData.length;
  const offsets = [];
  for (let o = offset + step; o < total; o += step) offsets.push(o);

  const pages = await Promise.all(offsets.map((o) => fetchPage(o, pageSize)));
  const data = firstData.concat(...pages.map((p) => p?.data || []));
  return { total: total || data.length, recordsTotal, data };
}

export const cmsApi = {
  /**
   * 1. BATCH
   * GET /v1/batches
   */
  async getBatches() {
    const res = await apiClient("/batches");
    return res?.data || [];
  },

  /**
   * 2. TIPE KELAS
   * GET /v1/master/class_types
   */
  async getClassTypes() {
    const res = await apiClient("/master/class_types");
    return res?.data || [];
  },

  /**
   * 3. DATA KELAS (DATATABLE)
   * GET /v1/classes/datatable?batch=&class_type_id=&draw=1&gender=&limit=100&offset=0&query=&teacher_id=
   */
  async getClasses(params = {}) {
    const query = new URLSearchParams({
      draw: "1",
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
      batch: params.batch ? String(params.batch) : "",
      class_type_id: params.class_type_id ? String(params.class_type_id) : "",
      gender: params.gender || "",
      query: params.query || "",
      teacher_id: params.teacher_id ? String(params.teacher_id) : "",
    });

    const res = await apiClient(`/classes/datatable?${query.toString()}`);
    return {
      total: res?.recordsTotal || 0,
      filtered: res?.recordsFiltered || 0,
      data: res?.data || [],
    };
  },

  /**
   * 4. JADWAL KELAS KESELURUHAN
   * GET /v1/classes/schedule?batch=&class_type_id=&draw=1&gender=&limit=100&offset=0&query=&teacher_id=
   */
  async getClassesSchedule(params = {}) {
    const query = new URLSearchParams({
      draw: "1",
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
      batch: params.batch ? String(params.batch) : "",
      class_type_id: params.class_type_id ? String(params.class_type_id) : "",
      gender: params.gender || "",
      query: params.query || "",
      teacher_id: params.teacher_id ? String(params.teacher_id) : "",
    });

    const res = await apiClient(`/classes/schedule?${query.toString()}`);
    return res?.data || [];
  },

  /**
   * 5. JADWAL KELAS DARI GURU
   * GET /v1/teachers/{teacher_id}/classes
   */
  async getTeacherClasses(teacherId, { force = false } = {}) {
    if (!teacherId) return [];
    return cached(
      `teacherClasses:${teacherId}`,
      async () => {
        const res = await apiClient(`/teachers/${teacherId}/classes`);
        return res?.data || [];
      },
      { force }
    );
  },

  /**
   * 6. PESERTA / MEMBERS
   * GET /v1/members/datatable?draw=1&limit=100&offset=0&query=
   */
  async getMembers(params = {}) {
    const query = new URLSearchParams({
      draw: "1",
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
      query: params.query || "",
    });

    const res = await apiClient(`/members/datatable?${query.toString()}`);
    return {
      total: res?.recordsTotal || 0,
      data: res?.data || [],
    };
  },

  /**
   * 7. KOMITMEN / COMMITTED MEMBERS
   * GET /v1/members/commitments?batch=&draw=1&limit=1000&offset=0&query=
   * Mendukung auto-pagination jika total data melebihi batas default halaman.
   */
  async getMemberCommitments(params = {}) {
    const key = `commitments:${params.batch || ""}:${params.class_id || ""}:${params.query || ""}:${params.offset || 0}:${params.limit || ""}:${params.fetchAll !== false}`;
    return cached(key, () => this._fetchMemberCommitments(params), { force: params.force });
  },

  async _fetchMemberCommitments(params = {}) {
    const fetchPage = async (offset, limit) => {
      const query = new URLSearchParams({
        draw: "1",
        limit: String(limit),
        offset: String(offset),
        batch: params.batch ? String(params.batch) : "",
        query: params.query || "",
      });
      if (params.class_id) {
        query.set("class_id", String(params.class_id));
      }
      return await apiClient(`/members/commitments?${query.toString()}`);
    };

    return fetchAllPages(fetchPage, {
      offset: params.offset || 0,
      pageSize: Number(params.limit) || 1000,
      fetchAll: params.fetchAll,
    });
  },

  /**
   * 8. KEHADIRAN MINGGUAN
   * GET /v1/classes/attendance/weekly?batch_id=&class_id=&week_num=&limit=500&offset=0&data_type=admin
   */
  async getWeeklyAttendance(params = {}) {
    const query = new URLSearchParams({
      batch_id: params.batch_id ? String(params.batch_id) : "",
      class_id: params.class_id ? String(params.class_id) : "",
      week_num: String(params.week_num ?? 1),
      data_type: params.data_type || "admin",
      limit: String(params.limit || 500),
      offset: String(params.offset || 0),
      query: params.query || "",
    });

    if (params.class_type_id) {
      query.set("class_type_id", String(params.class_type_id));
    }
    if (params.gender) {
      query.set("gender", String(params.gender));
    }

    const res = await apiClient(`/classes/attendance/weekly?${query.toString()}`);
    return {
      total: res?.recordsTotal || res?.data?.length || 0,
      filtered: res?.recordsFiltered || res?.data?.length || 0,
      data: res?.data || [],
    };
  },

  /**
   * 9. REGISTRASI KELAS (PROMOTED STATUS)
   * GET /v1/classes/registers/datatable?batch=&class_id=&class_type_id=&gender=&form_type_id=&limit=10&offset=0&query=&status=wait
   * Mendukung pagination server-side atau fetchAll.
   */
  async getClassRegisters(params = {}) {
    const status = params.status !== undefined ? params.status : '';
    const limit = Number(params.limit) || 10;
    const offset = Number(params.offset) || 0;
    const queryStr = params.query || "";
    const batch = params.batch ? String(params.batch) : "";
    const classId = params.class_id ? String(params.class_id) : "";
    const classTypeId = params.class_type_id ? String(params.class_type_id) : "";
    const gender = params.gender || "";
    const formTypeId = params.form_type_id ? String(params.form_type_id) : "";

    const key = `registers:${batch}:${classId}:${classTypeId}:${formTypeId}:${gender}:${status}:${queryStr}:${offset}:${limit}:${Boolean(params.fetchAll)}`;
    return cached(
      key,
      () => this._fetchClassRegisters({ ...params, status, limit, offset, query: queryStr }),
      { force: params.force }
    );
  },

  async _fetchClassRegisters(params = {}) {
    const fetchPage = async (offset, limit) => {
      const query = new URLSearchParams({
        draw: String(params.draw || 1),
        limit: String(limit),
        offset: String(offset),
      });
      if (params.batch) query.set("batch", String(params.batch));
      if (params.class_id) query.set("class_id", String(params.class_id));
      if (params.class_type_id) query.set("class_type_id", String(params.class_type_id));
      if (params.gender) query.set("gender", String(params.gender));
      if (params.form_type_id) query.set("form_type_id", String(params.form_type_id));
      if (params.query) query.set("query", String(params.query));
      if (params.status) query.set("status", String(params.status));

      return await apiClient(`/classes/registers/datatable?${query.toString()}`);
    };

    if (params.fetchAll) {
      return fetchAllPages(fetchPage, {
        offset: params.offset || 0,
        pageSize: Number(params.limit) || 1500,
        fetchAll: true,
      });
    }

    // Default datatable server-side pagination: fetch 1 halaman sesuai limit & offset
    const res = await fetchPage(params.offset || 0, Math.max(10, Number(params.limit) || 10));
    const rawData = res?.data?.data || res?.data || [];
    const data = Array.isArray(rawData) ? rawData : [];
    const total =
      res?.data?.recordsFiltered ??
      res?.recordsFiltered ??
      res?.data?.recordsTotal ??
      res?.recordsTotal ??
      data.length ??
      0;
    const recordsTotal = res?.data?.recordsTotal ?? res?.recordsTotal ?? total;

    return {
      total,
      recordsFiltered: total,
      recordsTotal,
      data,
    };
  },

  /**
   * 10. DAFTAR HADIR KELAS LENGKAP (8 PEKAN)
   * GET /v1/classes/{class_id}/attendance
   */
  async getClassAttendance(classId, { force = false } = {}) {
    if (!classId) return null;
    return cached(
      `classAttendance:${classId}`,
      async () => {
        const res = await apiClient(`/classes/${classId}/attendance`);
        return res?.data || res || null;
      },
      { force }
    );
  },
};
