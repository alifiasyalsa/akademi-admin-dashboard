/**
 * Format angka ke format mata uang Rupiah
 */
export function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/**
 * Normalisasi nomor HP untuk keperluan matching key antar data
 * Contoh: "62 813-8148-6133" -> "081381486133"
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (digits.startsWith("62")) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

/**
 * Format nomor HP ke format internasional WhatsApp (wa.me)
 * Contoh: "0812-3456-7890" -> "6281234567890"
 */
export function formatWaPhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (!digits.startsWith("62")) {
    digits = "62" + digits;
  }
  return digits;
}

/**
 * Format nomor HP untuk tampilan UI (0812-3456-7890)
 */
export function formatPhoneDisplay(rawPhone) {
  const digits = normalizePhone(rawPhone);
  if (!digits) return "-";
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 13)}`;
}

/**
 * Dapatkan inisial nama peserta (Contoh: "Ahmad Haidar" -> "AH")
 */
export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normalisasi string nama untuk fallback matching
 */
export function normalizeName(name) {
  if (!name) return "";
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Format string tanggal atau epoch ms ke format tanggal Indonesia (mis: "16 Okt 2026")
 */
export function formatDateDisplay(dateVal) {
  if (!dateVal) return "-";
  try {
    const d = typeof dateVal === "number" ? new Date(dateVal) : new Date(String(dateVal));
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateVal);
  }
}

/**
 * Format tanggal + jam Indonesia untuk histori follow-up (mis: "16 Okt 2026, 09.30")
 */
export function formatDateTimeDisplay(dateVal) {
  if (!dateVal) return "-";
  try {
    const d = typeof dateVal === "number" ? new Date(dateVal) : new Date(String(dateVal));
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateVal);
  }
}
