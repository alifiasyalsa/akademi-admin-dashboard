import { MaterialIcon } from "../MaterialIcon.jsx";

export function RegistrasiRow({ participant, onActionClick }) {
  const {
    id,
    name,
    initials,
    phone,
    tipe,
    kelas,
    regStatus,
    regStatusLabel,
    regStatusTone,
    status,
    statusLabel,
    statusDetail,
    actionType,
    actionLabel,
  } = participant;

  // Badge Tipe Registrasi styling
  let tipeBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
  if (tipe === "Promoted") {
    tipeBadgeClass = "bg-sky-50 text-[#0284c7] border-sky-200";
  } else if (tipe === "New") {
    tipeBadgeClass = "bg-teal-50 text-teal-700 border-teal-200";
  }

  // Styling badge status registrasi CMS
  let regBadgeStyle = "bg-sky-50 text-sky-800 border-sky-200";
  let regDotStyle = "bg-sky-500";
  if (regStatusTone === "amber") {
    regBadgeStyle = "bg-amber-50 text-amber-800 border-amber-300";
    regDotStyle = "bg-amber-500";
  } else if (regStatusTone === "rose") {
    regBadgeStyle = "bg-rose-50 text-rose-800 border-rose-300";
    regDotStyle = "bg-rose-500";
  } else if (regStatusTone === "teal") {
    regBadgeStyle = "bg-teal-50 text-teal-800 border-teal-300";
    regDotStyle = "bg-teal-500";
  } else if (regStatusTone === "slate") {
    regBadgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
    regDotStyle = "bg-slate-400";
  }

  const isFollowup = status === "followup" || actionType === "followup";

  return (
    <tr className="hover:bg-slate-50 transition-colors duration-150 group border-b border-slate-100">
      {/* 1. Nama & Kontak */}
      <td className="py-space-md px-space-lg">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full font-label-md text-label-md font-bold flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200">
            {initials || name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm font-semibold leading-tight text-slate-900">
              {name}
            </p>
            <p className="font-body-sm text-body-sm font-mono text-slate-500">
              {phone}
            </p>
          </div>
        </div>
      </td>

      {/* 2. Status Pendaftaran CMS */}
      <td className="py-space-md px-space-md">
        <span
          className={`inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full border ${regBadgeStyle}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${regDotStyle}`} />
          {regStatusLabel || "Belum Pilih Kelas"}
        </span>
      </td>

      {/* 3. Tipe Registrasi */}
      <td className="py-space-md px-space-md">
        <span
          className={`inline-flex items-center font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full border ${tipeBadgeClass}`}
        >
          {tipe}
        </span>
      </td>

      {/* 4. Kelas Rekomendasi */}
      <td className="py-space-md px-space-md">
        {kelas && kelas !== "none" ? (
          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            <MaterialIcon name="school" className="text-[14px] text-[#0284c7]" />
            {kelas}
          </span>
        ) : (
          <span className="font-body-sm text-body-sm text-slate-400 italic">
            Belum ada rekomendasi
          </span>
        )}
      </td>

      {/* 5. Status Reminder Supabase */}
      <td className="py-space-md px-space-md">
        <div>
          {status === "followup" ? (
            <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {statusLabel || "Perlu follow-up (>3 hr)"}
            </span>
          ) : status === "reminded" ? (
            <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
              {statusLabel || "Sudah diingatkan"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {statusLabel || "Belum diingatkan"}
            </span>
          )}

          {statusDetail && (
            <p className="font-body-sm text-body-sm text-slate-500 mt-1">
              {statusDetail}
            </p>
          )}
        </div>
      </td>

      {/* 6. Aksi */}
      <td className="py-space-md px-space-lg text-right">
        {status === "followup" ? (
          <button
            type="button"
            onClick={() => onActionClick(participant)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all active:scale-95 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200 cursor-pointer"
          >
            <MaterialIcon name="priority_high" className="text-[16px]" />
            <span>Follow-up Mendesak</span>
          </button>
        ) : status === "reminded" ? (
          <button
            type="button"
            onClick={() => onActionClick(participant)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-all active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-sm cursor-pointer"
          >
            <MaterialIcon name="history" className="text-[16px] text-slate-500" />
            <span>Kirim Ulang WA</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onActionClick(participant)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-200 cursor-pointer"
          >
            <MaterialIcon name="chat" className="text-[16px]" />
            <span>Kirim WA</span>
          </button>
        )}
      </td>
    </tr>
  );
}
