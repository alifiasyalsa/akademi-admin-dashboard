/**
 * Service Pencatatan & Tracking Pengingat Santri (Supabase Realtime Database)
 * QuranBest Akademi Admin Dashboard
 *
 * Mengelola status siklus pengingat untuk:
 * 1. Presensi (Kehadiran pekan berjalan)
 * 2. Infaq Komitmen (Tunggakan komitmen pekanan)
 * 3. Registrasi (Santri wait belum memilih kelas)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ihbsysccstltadfaztgz.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-r4Af6aaQrcjbu6wI_wRvw_7bvJN-eC";

function getHeaders(prefer = "return=representation") {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

/**
 * Format selisih waktu ke teks relatif yang mudah dibaca
 */
export function formatRelativeDays(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return "Hari ini";
  if (diffDays === 1) return "1 hr lalu";
  return `${diffDays} hr lalu`;
}

/**
 * Buat kunci unik pelacakan per santri, domain, dan konteks
 * Contoh: 'registrasi:14947:batch_38' atau 'infaq:14947:batch_38'
 */
export function makeTrackingKey(domain, memberId, contextId = "") {
  const cleanContext = contextId ? `:${contextId}` : "";
  return `${domain}:${memberId}${cleanContext}`;
}

export const reminderTrackingService = {
  /**
   * Mengambil seluruh log pengingat pada batch tertentu
   * @param {number|string} batchId
   * @param {string} [domain] - Opsional: 'presensi' | 'infaq' | 'registrasi'
   * @returns {Promise<Map<string, Object>>} Map indeks dengan key tracking_key
   */
  async fetchBatchReminders(batchId, domain = null) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn("[reminderTracking] Supabase credentials belum dikonfigurasi.");
      return new Map();
    }

    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/reminder_logs`);
      url.searchParams.set("select", "*");
      if (batchId) {
        url.searchParams.set("batch_id", `eq.${batchId}`);
      }
      if (domain) {
        url.searchParams.set("domain", `eq.${domain}`);
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: getHeaders(),
      });

      if (!res.ok) {
        console.error("[reminderTracking] Gagal mengambil log pengingat:", res.statusText);
        return new Map();
      }

      const data = await res.json();
      const map = new Map();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.tracking_key) {
            map.set(item.tracking_key, item);
          }
        }
      }
      return map;
    } catch (err) {
      console.error("[reminderTracking] Error koneksi Supabase:", err);
      return new Map();
    }
  },

  /**
   * Mencatat / memperbarui histori pengiriman pengingat santri (Upsert)
   */
  async recordReminder({
    domain,
    memberId,
    contextId = "",
    memberName = "",
    memberPhone = "",
    batchId = null,
    classId = null,
    notes = "",
    currentCount = 0,
  }) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn("[reminderTracking] Supabase belum aktif.");
      return null;
    }

    const trackingKey = makeTrackingKey(domain, memberId, contextId);
    const newCount = (currentCount || 0) + 1;
    const nowIso = new Date().toISOString();

    const payload = {
      tracking_key: trackingKey,
      member_id: Number(memberId),
      member_name: memberName || null,
      member_phone: memberPhone || null,
      domain: domain,
      batch_id: batchId ? Number(batchId) : null,
      class_id: classId ? Number(classId) : null,
      status: "reminded",
      reminder_count: newCount,
      last_reminded_at: nowIso,
      notes: notes || null,
      updated_at: nowIso,
    };

    try {
      const url = `${SUPABASE_URL}/rest/v1/reminder_logs`;
      const res = await fetch(url, {
        method: "POST",
        headers: getHeaders("resolution=merge-duplicates,return=representation"),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[reminderTracking] Gagal menyimpan log reminder:", errorText);
        return null;
      }

      const result = await res.json();
      return Array.isArray(result) ? result[0] : result;
    } catch (err) {
      console.error("[reminderTracking] Error saat upsert reminder:", err);
      return null;
    }
  },

  /**
   * Menghitung status siklus pengingat secara dinamis
   * @param {Object} params
   * @param {boolean} params.isResolved - Apakah kondisi santri sudah tuntas di CMS
   * @param {Object|null} params.logRecord - Record dari Supabase jika pernah diingatkan
   * @returns {{
   *   status: 'resolved' | 'unreminded' | 'reminded' | 'followup_needed',
   *   label: string,
   *   relativeTime: string,
   *   count: number,
   *   isStagnant: boolean,
   *   badgeColor: string
   * }}
   */
  computeReminderState({ isResolved, logRecord }) {
    // 1. Jika kondisi di CMS sudah tuntas (sudah hadir, infaq lunas, atau sudah pilih kelas)
    if (isResolved) {
      return {
        status: "resolved",
        label: "Tuntas",
        relativeTime: "",
        count: logRecord?.reminder_count || 0,
        isStagnant: false,
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    // 2. Jika belum pernah ada log pengingat
    if (!logRecord || !logRecord.last_reminded_at) {
      return {
        status: "unreminded",
        label: "Belum Diingatkan",
        relativeTime: "",
        count: 0,
        isStagnant: false,
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }

    // 3. Jika sudah pernah diingatkan: hitung apakah sudah > 3 hari (72 jam)
    const lastDate = new Date(logRecord.last_reminded_at);
    const diffMs = Date.now() - lastDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const relativeTime = formatRelativeDays(logRecord.last_reminded_at);
    const count = logRecord.reminder_count || 1;

    // Ambang batas stagnan: 72 jam (3 hari)
    if (diffHours >= 72) {
      return {
        status: "followup_needed",
        label: `Follow-up Mendesak (>3 hr)`,
        relativeTime,
        count,
        isStagnant: true,
        badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
      };
    }

    return {
      status: "reminded",
      label: `Diingatkan (${relativeTime})`,
      relativeTime,
      count,
      isStagnant: false,
      badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
    };
  },
};
