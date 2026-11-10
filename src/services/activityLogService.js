/**
 * Service Log Aktivitas Akun (Supabase Backend)
 * QuranBest Akademi Admin Dashboard
 *
 * Tabel: activity_logs (lihat supabase/auth_activity_logs.sql)
 * Setiap aksi admin (login, kirim pengingat WA, input infaq manual, ubah template) dicatat
 * bersama akun pelakunya. Log hanya bisa ditambah, tidak bisa diubah/dihapus dari dashboard.
 */
import { SUPABASE_URL, supabaseAuth, supabaseHeaders, getUserDisplayName } from "./supabaseAuth.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/activity_logs`;

export const ACTIVITY_LABELS = {
  "auth.login": { label: "Login", icon: "login" },
  "auth.logout": { label: "Logout", icon: "logout" },
  "reminder.sent": { label: "Kirim Pengingat WA", icon: "send" },
  "manual_infaq.create": { label: "Input Infaq Manual", icon: "add_card" },
  "manual_infaq.delete": { label: "Hapus Infaq Manual", icon: "delete" },
  "template.create": { label: "Buat Template WA", icon: "post_add" },
  "template.update": { label: "Ubah Template WA", icon: "edit_note" },
  "template.delete": { label: "Hapus Template WA", icon: "delete" },
  "template.set_default": { label: "Set Template Default", icon: "star" },
  "export.csv": { label: "Download CSV", icon: "download" },
  "role.update": { label: "Ubah Peran Akun", icon: "admin_panel_settings" },
  "role.delete": { label: "Hapus Peran Akun", icon: "person_remove" },
};

function toNullableNumber(value) {
  const num = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(num) ? num : null;
}

export const activityLogService = {
  /**
   * Catat aktivitas akun yang sedang login. Tidak pernah melempar error:
   * kegagalan pencatatan tidak boleh menggagalkan aksi utama.
   */
  async log({ action, entityType = null, entityId = null, memberId = null, memberName = null, batchId = null, classId = null, details = {} }) {
    const user = supabaseAuth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      user_email: user.email || null,
      user_name: getUserDisplayName(user),
      action,
      entity_type: entityType,
      entity_id: entityId !== null && entityId !== undefined ? String(entityId) : null,
      member_id: memberId !== null && memberId !== undefined && memberId !== "" ? String(memberId) : null,
      member_name: memberName || null,
      batch_id: toNullableNumber(batchId),
      class_id: toNullableNumber(classId),
      details: details || {},
    };

    try {
      const res = await fetch(TABLE_URL, {
        method: "POST",
        headers: supabaseHeaders("return=minimal"),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn("[activityLog] Gagal mencatat aktivitas:", res.status, await res.text());
      }
    } catch (err) {
      console.warn("[activityLog] Error koneksi saat mencatat aktivitas:", err);
    }
  },

  /**
   * Aktivitas terbaru, opsional difilter per akun.
   * @returns {Promise<Array<Object>>}
   */
  async fetchRecent({ userId = null, limit = 100 } = {}) {
    const url = new URL(TABLE_URL);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", String(limit));
    if (userId) url.searchParams.set("user_id", `eq.${userId}`);

    const res = await fetch(url.toString(), { method: "GET", headers: supabaseHeaders() });
    if (!res.ok) {
      throw new Error(`Gagal memuat log aktivitas (HTTP ${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  },
};
