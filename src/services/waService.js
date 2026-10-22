import { formatWaPhone } from "./formatters.js";

/**
 * Service Template Pesan WhatsApp Resmi Akademi QuranBest
 */

export function buildWaMessage({ waType, student, batchName, regUrl }) {
  // Ambil label batch yang bersih (misal: "Batch 16 (Aktif)" -> "16", atau "Telkom MDI #7" -> "Telkom MDI #7")
  const cleanBatch = String(batchName || "16")
    .replace(/^Batch\s*/i, "")
    .replace(/\s*\(.*\)$/, "")
    .trim() || "16";

  const greeting = student?.name ? `Assalamualaikum Kak ${student.name} 📖✨` : "Assalamualaikum Kak 📖✨";
  const targetRegUrl = regUrl || "https://qbest.id/Pilih-Kelas";

  // Template 1a: Pengingat Pembayaran (status pending)
  if (waType === "registrasi_pending" || (waType === "registrasi" && student?.regStatus === "pending")) {
    return `${greeting}

Mimin izin menginfokan bahwa pendaftaran Akademi QuranBest Batch ${cleanBatch} masih menunggu penyelesaian pembayaran yaa 😊
Yuk segera selesaikan pembayarannya agar kuota kursi belajar Sahabat aman dan tidak terisi oleh pendaftar lain ✨

Klik di sini untuk info tagihan & cara pembayaran 👇
👉 ${regUrl || "https://qbest.id/Pembayaran"}

> Kalau ada kendala transfer/pembayaran, hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`;
  }

  // Template 1b: Konfirmasi Kelanjutan Pendaftaran (status not confirm)
  if (waType === "registrasi_not_confirm" || (waType === "registrasi" && (student?.regStatus === "not confirm" || student?.regStatus === "not_confirm"))) {
    return `${greeting}

Mimin izin konfirmasi terkait pendaftaran Akademi QuranBest Batch ${cleanBatch} 🤲
Masa konfirmasi pemilihan kelas Sahabat tercatat telah melewati batas waktu. Apakah Sahabat masih berminat melanjutkan belajar di batch ini?

Mohon konfirmasinya yaa agar kursi belajar Sahabat dapat kami bantu amankan sebelum dialihkan ke pendaftar lain 😊✨

> Konfirmasi kelanjutan bisa langsung balas pesan ini atau hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`;
  }

  // Template 1c: Ingatkan Pilih Kelas Promoted / Registrasi (status wait / default)
  if (waType === "kelas" || waType === "registrasi") {
    return `${greeting}

Batch ${cleanBatch} sudah mau dimulai nih 🤲
Semoga Sahabat dimudahkan istiqamah belajar Qur’an 🌱

Mimin izin ingatkan untuk segera memilih kelas lanjutan di batch ini yaa 😊
Yuk pilih kelas dan tentukan jadwal yang paling cocok sebelum kuota kelas penuh! ✨

Klik di sini untuk pilih kelas 👇
👉 ${targetRegUrl}

> Kalau ada kendala, bisa hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`;
  }

  // Template 2: Pengingat Kehadiran / Presensi Pekan Aktif
  if (waType === "presensi") {
    return `${greeting}

Semoga Sahabat selalu dalam lindungan Allah Ta'ala 🌱

Mimin izin konfirmasi kehadiran di kelas Akademi QuranBest Batch ${cleanBatch}. Mimin perhatikan Kak ${student?.name || "Sahabat"} belum sempat hadir di sesi pertemuan pekan ini 🤲

Apakah ada kendala yang dihadapi? Jika membutuhkan rekaman materi atau ingin konsultasi jadwal, silakan kabari Mimin yaa 😊

> Konfirmasi kendala atau izin bisa hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`;
  }

  // Template 3: Infaq Komitmen (Default & Follow-Up)
  return `${greeting}

Batch ${cleanBatch} sudah mulai berjalan nih 🤲
Semoga Sahabat dimudahkan istiqamah belajar Qur’an 🌱

Mimin izin ingatkan untuk infaq komitmen batch ini yaa 😊
Infaqnya bersifat pekanan, namun boleh juga dibayarkan sekaligus di awal atau di akhir (jangan lupa masukan kode unik bagi yang memilih pembayaran transfer manual)✨

Klik di sini 👇
👉 https://qbest.id/AmanahInfaqTahsin

> Kalau ada kendala, bisa hubungi Admin Nasrul 🤝
> 👉 wa.me/628976408712`;
}

/**
 * Membuat tautan wa.me lengkap dengan query text yang di-encode
 */
export function buildWaUrl({ phone, message }) {
  const cleanPhone = formatWaPhone(phone);
  if (!cleanPhone) return "";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Membuka WhatsApp langsung ke wa.me di jendela/tab baru
 */
export function openWhatsAppDirectly({ phone, message }) {
  const url = buildWaUrl({ phone, message });
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
