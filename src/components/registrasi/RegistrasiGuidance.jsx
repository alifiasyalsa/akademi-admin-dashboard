import { MaterialIcon } from "../MaterialIcon.jsx";

export function RegistrasiGuidance({ batchLabel = "Batch 14" }) {
  return (
    <section className="rounded-xl p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg bg-white border border-slate-200 shadow-sm">
      <div className="flex items-start gap-space-md">
        <div className="p-2 rounded-lg mt-0.5 bg-sky-50 text-[#0284c7] border border-sky-200">
          <MaterialIcon name="security_update_good" className="text-[20px]" />
        </div>
        <div>
          <h4 className="font-headline-sm text-headline-sm font-semibold text-slate-900">
            SOP Pengingat Pemilihan Kelas {batchLabel}
          </h4>
          <p className="font-body-sm text-body-sm mt-0.5 max-w-2xl leading-relaxed text-slate-500">
            Peserta yang belum memilih kelas dalam 3 hari kalender setelah verifikasi wajib difollow-up.
            Setelah pengiriman WhatsApp, tandai konfirmasi agar reminder log tercatat resmi.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
        <span className="font-label-sm text-label-sm font-medium text-slate-500">
          QuranBest Akademi Reminder Engine v1.4
        </span>
      </div>
    </section>
  );
}
