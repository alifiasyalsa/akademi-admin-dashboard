import { MaterialIcon } from "../MaterialIcon.jsx";

export function ReminderConfirmModal({
  isOpen,
  participant,
  batchLabel = "Batch 14",
  onClose,
  onConfirm,
}) {
  if (!isOpen || !participant) return null;

  const previewMessage = `Assalamu'alaikum Kak ${participant.name}, selamat telah lulus evaluasi! Silakan tentukan jadwal kelas ${batchLabel} pilihanmu di link quranbest.id/pilih-kelas sebelum kuota habis.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] border border-sky-200 flex items-center justify-center">
              <MaterialIcon name="mark_chat_read" className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-slate-900">
                Verifikasi Pengiriman WhatsApp
              </h3>
              <p className="font-body-sm text-body-sm text-slate-500">
                Konfirmasi pencatatan aktivitas reminder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3">
          <p className="font-body-md text-body-md text-slate-700 leading-relaxed">
            Apakah pesan reminder pemilihan kelas untuk{" "}
            <strong className="text-slate-900 font-semibold">
              {participant.name}
            </strong>{" "}
            sudah dikirim melalui WhatsApp resmi?
          </p>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-600 font-body-sm text-body-sm space-y-1.5">
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-[#0284c7]">
              <MaterialIcon name="drafts" className="text-[16px]" />
              <span>Pratinjau Pesan Terkirim:</span>
            </div>
            <p className="italic leading-relaxed text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
              {previewMessage}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <MaterialIcon name="verified" className="text-[16px] text-teal-600" />
            <span>
              Status reminder akan langsung diperbarui dan timer follow-up direset.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-label-md text-label-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Belum, kembali
          </button>
          <button
            type="button"
            onClick={() => onConfirm(participant)}
            className="px-4 py-2 rounded-lg font-label-md text-label-md font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MaterialIcon name="check_circle" className="text-[18px]" />
            <span>Ya, tandai sudah dikirim</span>
          </button>
        </div>
      </div>
    </div>
  );
}
