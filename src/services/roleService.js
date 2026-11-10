/**
 * Service Peran Akun Admin (Supabase Backend)
 * QuranBest Akademi Admin Dashboard
 *
 * Tabel: admin_roles (lihat supabase/admin_roles.sql) — peran disimpan per email.
 * Email tanpa baris di tabel dianggap 'admin'. Perubahan peran hanya diizinkan RLS untuk super_admin.
 */
import { SUPABASE_URL, supabaseAuth, supabaseHeaders } from "./supabaseAuth.js";
import { activityLogService } from "./activityLogService.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/admin_roles`;

export const ROLES = {
  admin: { label: "Admin" },
  super_admin: { label: "Super Admin" },
};

async function readError(res, fallback) {
  const payload = await res.json().catch(() => null);
  return new Error(payload?.message || `${fallback} (HTTP ${res.status})`);
}

export const roleService = {
  /** Peran akun yang sedang login. Gagal dimuat → 'admin' (hak paling rendah). */
  async fetchMyRole() {
    const email = supabaseAuth.getUser()?.email?.toLowerCase();
    if (!email) return "admin";
    try {
      const url = new URL(TABLE_URL);
      url.searchParams.set("select", "role");
      url.searchParams.set("email", `eq.${email}`);
      const res = await fetch(url.toString(), { headers: supabaseHeaders() });
      if (!res.ok) return "admin";
      const rows = await res.json();
      return rows?.[0]?.role === "super_admin" ? "super_admin" : "admin";
    } catch {
      return "admin";
    }
  },

  async listRoles() {
    const url = new URL(TABLE_URL);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", "role.desc,email.asc");
    const res = await fetch(url.toString(), { headers: supabaseHeaders() });
    if (!res.ok) throw await readError(res, "Gagal memuat daftar peran");
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  },

  async setRole(email, role) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const payload = {
      email: cleanEmail,
      role,
      updated_by: supabaseAuth.getUser()?.email || null,
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${TABLE_URL}?on_conflict=email`, {
      method: "POST",
      headers: supabaseHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await readError(res, "Gagal menyimpan peran");
    activityLogService.log({
      action: "role.update",
      entityType: "admin_roles",
      entityId: cleanEmail,
      details: { email: cleanEmail, role },
    });
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  },

  async removeRole(email) {
    const res = await fetch(`${TABLE_URL}?email=eq.${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    if (!res.ok) throw await readError(res, "Gagal menghapus peran");
    const deleted = await res.json().catch(() => []);
    if (!Array.isArray(deleted) || deleted.length === 0) {
      throw new Error("Peran tidak terhapus (tidak punya izin atau data tidak ditemukan).");
    }
    activityLogService.log({
      action: "role.delete",
      entityType: "admin_roles",
      entityId: email,
      details: { email },
    });
    return true;
  },
};
