import { useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";

/**
 * Banner status koneksi Plus CMS: tampil saat token CMS terputus atau data CMS gagal dimuat.
 * Akun dashboard tetap login — yang terputus hanya token CMS.
 */
export function CmsConnectionBanner({ expired, error, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  if (!expired && !error) return null;

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
    >
      <MaterialIcon name={expired ? "link_off" : "cloud_off"} className="text-[22px] text-rose-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-800">
          {expired ? "Koneksi Plus CMS terputus" : "Gagal memuat data dari Plus CMS"}
        </p>
        <p className="text-xs text-rose-700 mt-0.5">
          {expired
            ? "Token CMS kedaluwarsa dan gagal diperbarui, hubungi tim IT."
            : error?.message || "Terjadi kesalahan saat mengambil data."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
      >
        <MaterialIcon name={retrying ? "hourglass_top" : "refresh"} className="text-[16px]" />
        {retrying ? "Menghubungkan..." : "Coba Hubungkan Ulang"}
      </button>
    </div>
  );
}
