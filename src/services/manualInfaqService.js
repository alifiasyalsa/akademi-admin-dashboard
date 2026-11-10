/**
 * Service Transaksi Infaq Manual (Supabase Backend)
 * QuranBest Akademi Admin Dashboard
 *
 * Tabel: manual_infaq_transactions (lihat supabase/manual_infaq_transactions.sql)
 * Kolom: id, member_id, member_name, batch_id, class_id, amount, transaction_date, notes,
 *        created_by, created_by_id, created_at
 */
import { SUPABASE_URL, supabaseAuth, supabaseHeaders as getHeaders } from "./supabaseAuth.js";
import { activityLogService } from "./activityLogService.js";

const TABLE_URL = `${SUPABASE_URL}/rest/v1/manual_infaq_transactions`;

export const manualInfaqService = {
  /**
   * Seluruh transaksi manual pada satu batch, terbaru di atas.
   * @returns {Promise<Array<Object>>}
   */
  async fetchByBatch(batchId) {
    const url = new URL(TABLE_URL);
    url.searchParams.set("select", "*");
    url.searchParams.set("batch_id", `eq.${batchId}`);
    url.searchParams.set("order", "transaction_date.desc,created_at.desc");

    const res = await fetch(url.toString(), { method: "GET", headers: getHeaders() });
    if (!res.ok) {
      throw new Error(`Gagal mengambil infaq manual (HTTP ${res.status})`);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  },

  async create({ memberId, memberName, batchId, classId, amount, transactionDate, notes }) {
    const user = supabaseAuth.getUser();
    const payload = {
      member_id: Number(memberId),
      member_name: memberName || null,
      batch_id: Number(batchId),
      class_id: classId ? Number(classId) : null,
      amount: Number(amount),
      transaction_date: transactionDate,
      notes: notes || null,
      created_by: user?.email || null,
      created_by_id: user?.id || null,
    };

    const res = await fetch(TABLE_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gagal menyimpan infaq manual (HTTP ${res.status}): ${errorText}`);
    }
    const created = await res.json();
    const row = Array.isArray(created) ? created[0] : created;
    activityLogService.log({
      action: "manual_infaq.create",
      entityType: "manual_infaq_transactions",
      entityId: row?.id,
      memberId,
      memberName,
      batchId,
      classId,
      details: { amount: payload.amount, transaction_date: transactionDate, notes: payload.notes },
    });
    return row;
  },

  /** @param {Object} entry - baris manual_infaq_transactions yang akan dihapus */
  async remove(entry) {
    const res = await fetch(`${TABLE_URL}?id=eq.${encodeURIComponent(entry.id)}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Gagal menghapus infaq manual (HTTP ${res.status})`);
    }
    // RLS menolak DELETE secara diam-diam (0 baris), bukan dengan error HTTP
    const deleted = await res.json().catch(() => []);
    if (!Array.isArray(deleted) || deleted.length === 0) {
      throw new Error("Tidak punya izin menghapus transaksi ini (hanya pembuatnya atau super admin).");
    }
    activityLogService.log({
      action: "manual_infaq.delete",
      entityType: "manual_infaq_transactions",
      entityId: entry.id,
      memberId: entry.member_id,
      memberName: entry.member_name,
      batchId: entry.batch_id,
      classId: entry.class_id,
      details: { amount: Number(entry.amount) || 0, transaction_date: entry.transaction_date, notes: entry.notes || null },
    });
    return true;
  },
};
