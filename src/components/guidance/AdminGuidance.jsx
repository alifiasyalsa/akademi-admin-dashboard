import { MaterialIcon } from "../MaterialIcon.jsx";

export function AdminGuidance() {
  return (
    <section className="rounded-xl p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg bg-white border border-slate-200 shadow-sm">
      <div className="flex items-start gap-space-md">
        <div className="p-2 rounded-lg mt-0.5 bg-sky-50 text-[#0284c7] border border-sky-200">
          <MaterialIcon name="info" className="text-[20px]" />
        </div>
        <div>
          <h4 className="font-headline-sm text-headline-sm font-semibold text-slate-900">
            Prosedur Pengiriman Pesan H+1 Review
          </h4>
          <p className="font-body-sm text-body-sm mt-0.5 max-w-2xl leading-relaxed text-slate-500">
            WhatsApp infaq otomatis memuat tagihan akumulatif resmi santri bersangkutan. Tombol WhatsApp dijalankan secara
            individual untuk memastikan verifikasi human-touch admin sebelum pengiriman.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
        <span className="font-label-sm text-label-sm font-medium text-slate-500">SOP Admin QuranBest 2024/2025</span>
      </div>
    </section>
  );
}
