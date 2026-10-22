/**
 * Service Pengelolaan Template Pesan WhatsApp (Supabase Backend)
 * QuranBest Akademi Admin Dashboard
 *
 * Tabel: message_templates
 * Kolom: id, category, status_key, title, content, is_default, created_at, updated_at
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

// Template bawaan (fallback jika tabel kosong / offline)
export const DEFAULT_TEMPLATES = [
  // 1. Registrasi
  {
    id: "default-reg-wait",
    category: "registrasi",
    status_key: "wait",
    title: "Pengingat Formal",
    content: `Assalamualaikum Kak {nama} 📖✨

Batch {batch} sudah mau dimulai nih 🤲
Semoga Sahabat dimudahkan istiqamah belajar Qur’an 🌱

Mimin izin ingatkan untuk segera memilih kelas lanjutan di batch ini yaa 😊
Rekomendasi kelas Sahabat: *{rekomendasi_kelas}*

Klik di sini untuk pilih jadwal kelas:
👉 https://qbest.id/Pilih-Kelas

> Kalau ada kendala, hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`,
    is_default: true,
  },
  {
    id: "default-reg-wait-slot",
    category: "registrasi",
    status_key: "wait",
    title: "Follow-up Slot Terbatas",
    content: `Kak {nama}, sisa kuota halaqah tersisa 2 kursi lagi nih untuk kelas *{rekomendasi_kelas}* di Batch {batch} 🏃‍♂️💨

Yuk segera amankan jadwal pilihanmu sebelum terisi pendaftar lain yaa!
Pilih di sini: 👉 https://qbest.id/Pilih-Kelas`,
    is_default: false,
  },
  {
    id: "default-reg-pending",
    category: "registrasi",
    status_key: "pending",
    title: "Pengingat Pembayaran Tagihan",
    content: `Assalamualaikum Kak {nama} 📖✨

Mimin izin menginfokan bahwa pendaftaran Akademi QuranBest Batch {batch} masih menunggu penyelesaian pembayaran yaa 😊
Yuk segera selesaikan pembayarannya agar kuota kursi belajar Sahabat aman dan tidak terisi oleh pendaftar lain ✨

Klik di sini untuk info tagihan & cara pembayaran 👇
👉 https://qbest.id/Pembayaran

> Kalau ada kendala transfer/pembayaran, hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`,
    is_default: true,
  },
  {
    id: "default-reg-not-confirm",
    category: "registrasi",
    status_key: "not_confirm",
    title: "Konfirmasi Kelanjutan Belajar",
    content: `Assalamualaikum Kak {nama} 📖✨

Mimin izin konfirmasi terkait pendaftaran Akademi QuranBest Batch {batch} 🤲
Masa konfirmasi pemilihan kelas Sahabat tercatat telah melewati batas waktu. Apakah Sahabat masih berminat melanjutkan belajar di batch ini?

Mohon konfirmasinya yaa agar kursi belajar Sahabat dapat kami bantu amankan sebelum dialihkan ke pendaftar lain 😊✨

> Konfirmasi kelanjutan bisa langsung balas pesan ini atau hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`,
    is_default: true,
  },
  {
    id: "default-reg-cancel",
    category: "registrasi",
    status_key: "cancel",
    title: "Konfirmasi Mundur / Batal",
    content: `Assalamualaikum Kak {nama} 📖✨

Mimin mendapati status pendaftaran Sahabat di Batch {batch} saat ini tercatat mengundurkan diri/batal.
Apakah ada kendala teknis atau jadwal yang bisa Mimin bantu carikan solusinya?

Jika berkenan melanjutkan, Mimin siap bantu proses kembali yaa 😊🤲`,
    is_default: true,
  },

  // 2. Monitoring
  {
    id: "default-mon-presensi",
    category: "monitoring",
    status_key: "presensi",
    title: "Konfirmasi Kehadiran Pekan Ini",
    content: `Assalamualaikum Kak {nama} 📖✨

Semoga Sahabat selalu dalam lindungan Allah Ta'ala 🌱

Mimin izin konfirmasi kehadiran di kelas Akademi QuranBest Batch {batch}. Mimin perhatikan Kak {nama} tercatat *{kehadiran_pekan_ini}* di sesi pertemuan pekan ke-{pekan} 🤲

Apakah ada kendala yang dihadapi? Jika membutuhkan rekaman materi atau konsultasi jadwal, silakan kabari Mimin yaa 😊

> Konfirmasi kendala atau izin bisa hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`,
    is_default: true,
  },
  {
    id: "default-mon-infaq",
    category: "monitoring",
    status_key: "infaq",
    title: "Pengingat Komitmen Infaq",
    content: `Assalamualaikum Kak {nama} 📖✨

Batch {batch} sudah mulai berjalan nih 🤲
Semoga Sahabat dimudahkan istiqamah belajar Qur’an 🌱

Mimin izin ingatkan untuk infaq komitmen pekanan sebesar *{nominal_infaq}* ({status_infaq}) yaa 😊
Infaq boleh dicicil per pekan atau dibayarkan sekaligus di awal/akhir.

Klik di sini untuk info rekening & konfirmasi 👇
👉 https://qbest.id/AmanahInfaqTahsin

> Kalau ada kendala, hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`,
    is_default: true,
  },
];

export const templateService = {
  /**
   * Mengambil seluruh template berdasarkan category ('registrasi' atau 'monitoring')
   */
  async fetchTemplatesByCategory(category) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return DEFAULT_TEMPLATES.filter((t) => t.category === category);
    }

    try {
      const url = `${SUPABASE_URL}/rest/v1/message_templates?category=eq.${category}&order=created_at.asc`;
      const response = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!response.ok) {
        console.warn(`[templateService] HTTP ${response.status} saat fetch message_templates`);
        return DEFAULT_TEMPLATES.filter((t) => t.category === category);
      }

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return DEFAULT_TEMPLATES.filter((t) => t.category === category);
      }

      return rows;
    } catch (err) {
      console.warn("[templateService] Gagal fetch message_templates dari Supabase:", err);
      return DEFAULT_TEMPLATES.filter((t) => t.category === category);
    }
  },

  /**
   * Menyimpan template baru ke Supabase
   */
  async createTemplate({ category, status_key, title, content, is_default = false }) {
    const payload = {
      category,
      status_key,
      title,
      content,
      is_default,
      updated_at: new Date().toISOString(),
    };

    try {
      const url = `${SUPABASE_URL}/rest/v1/message_templates`;
      const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gagal menyimpan template (HTTP ${response.status})`);
      }

      const created = await response.json();
      return Array.isArray(created) ? created[0] : created;
    } catch (err) {
      console.error("[templateService] Error createTemplate:", err);
      throw err;
    }
  },

  /**
   * Memperbarui template yang ada
   */
  async updateTemplate(id, updates) {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      const url = `${SUPABASE_URL}/rest/v1/message_templates?id=eq.${id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gagal update template (HTTP ${response.status})`);
      }

      return true;
    } catch (err) {
      console.error("[templateService] Error updateTemplate:", err);
      throw err;
    }
  },

  /**
   * Menetapkan satu template sebagai default aktif untuk status_key tertentu
   */
  async setDefaultTemplate(category, status_key, targetId) {
    try {
      // 1. Matikan is_default untuk status_key dan category tersebut
      const urlReset = `${SUPABASE_URL}/rest/v1/message_templates?category=eq.${category}&status_key=eq.${status_key}`;
      await fetch(urlReset, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_default: false, updated_at: new Date().toISOString() }),
      });

      // 2. Aktifkan targetId
      const urlSet = `${SUPABASE_URL}/rest/v1/message_templates?id=eq.${targetId}`;
      const response = await fetch(urlSet, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_default: true, updated_at: new Date().toISOString() }),
      });

      return response.ok;
    } catch (err) {
      console.error("[templateService] Error setDefaultTemplate:", err);
      return false;
    }
  },

  /**
   * Menghapus template
   */
  async deleteTemplate(id) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/message_templates?id=eq.${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return response.ok;
    } catch (err) {
      console.error("[templateService] Error deleteTemplate:", err);
      return false;
    }
  },

  /**
   * Mengganti variabel {nama}, {batch}, dll dengan nilai data nyata
   */
  interpolate(templateText, data = {}) {
    if (!templateText) return "";
    return templateText.replace(/\{(\w+)\}/g, (_, key) => {
      return data[key] !== undefined && data[key] !== null ? String(data[key]) : `{${key}}`;
    });
  },
};
