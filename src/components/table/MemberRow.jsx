import { MaterialIcon } from "../MaterialIcon.jsx";
import { formatRupiah } from "../../services/formatters.js";

const PRESENCE_DOT = {
  hadir: "bg-brand-600",
  tidakHadir: "bg-amber-400",
  belumBerjalan: "bg-slate-200 border border-slate-300",
  belumDiisi: "bg-white border border-dashed border-slate-400",
  absen: "bg-amber-400",
  sakit: "bg-amber-400",
  izin: "bg-brand-400",
};

const PRESENCE_BADGE = {
  hadir: {
    wrap: "bg-brand-50 text-brand-700 border-brand-200",
    dot: "bg-brand-600",
  },
  izin: {
    wrap: "bg-brand-50 text-brand-700 border-brand-200",
    dot: "bg-brand-400",
  },
  sakit: {
    wrap: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-400",
  },
  tidakHadir: {
    wrap: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-400",
  },
  belumBerjalan: {
    wrap: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  belumDiisi: {
    wrap: "bg-white text-slate-500 border-dashed border-slate-300",
    dot: "bg-slate-300",
  },
};

const VALID_NOTE = {
  overdue: "font-semibold text-rose-600 text-[11px] leading-[14px]",
  paid: "font-semibold text-teal-600 text-[11px] leading-[14px]",
  none: "font-semibold text-rose-600 text-[11px] leading-[14px]",
  advance: "font-semibold text-brand-600 text-[11px] leading-[14px]",
};

const VALID_AMOUNT = {
  overdue: "block font-bold text-slate-900",
  paid: "block font-bold text-slate-900",
  none: "block font-bold text-rose-600",
  advance: "block font-bold text-slate-900",
};

function ContactCountPill({ label, followup }) {
  const total = followup?.totalCount || 0;
  const tone =
    total === 0
      ? "bg-slate-50 text-slate-400 border-slate-200"
      : total >= 3
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-brand-50 text-brand-700 border-brand-200";
  const title = [`${label} dihubungi total ${total}x`, ...(followup?.breakdown || [])].join("\n");
  return (
    <span
      className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-full border text-[11px] font-semibold tabular-nums leading-none ${tone}`}
      title={title}
    >
      {total}x
    </span>
  );
}

function LastFollowupLine({ label, followup, countScopeLabel }) {
  const hasDate = Boolean(followup?.at);
  return (
    <div className="flex items-baseline gap-2 min-w-[13rem]">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-slate-400 w-14 shrink-0">
        {label}
      </span>
      {hasDate ? (
        <span className="min-w-0">
          <span className="block font-body-sm text-body-sm font-semibold tabular-nums text-slate-800 leading-tight">
            {followup.dateLabel}
          </span>
          <span className="block font-label-sm text-label-sm text-slate-500 leading-tight">
            {followup.relativeLabel}
            {countScopeLabel && followup.count > 0 ? ` · ${countScopeLabel} ${followup.count}x` : ""}
          </span>
        </span>
      ) : (
        <span className="font-body-sm text-body-sm text-slate-400 italic">Belum</span>
      )}
      <ContactCountPill label={label} followup={followup} />
    </div>
  );
}

function PresenceBadge({ presence }) {
  const tone = PRESENCE_BADGE[presence.tone] || PRESENCE_BADGE.hadir;
  return (
    <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full border ${tone.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} /> {presence.label}
    </span>
  );
}



function ActionCell({ student, onSendWa }) {
  const hasPair = student.actions.length > 1 && student.actions.every((action) => action.kind === "wa");

  if (hasPair) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        {student.actions.map((action) => {
          let btnClass = "px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200";
          if (action.variant === "amber") {
            btnClass = "px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all active:scale-95 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200";
          } else if (action.variant === "secondary") {
            btnClass = "px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300";
          }
          return (
            <button
              key={`${action.waType}-${action.label}`}
              type="button"
              title={action.detail || action.label}
              className={btnClass}
              onClick={() => onSendWa(student, action)}
            >
              {action.icon && <MaterialIcon name={action.icon} className="text-[14px] mr-1" />}
              {action.label}
            </button>
          );
        })}
      </div>
    );
  }

  const action = student.actions[0];
  if (!action) {
    return null;
  }

  if (action.kind === "done") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg font-label-md text-label-md cursor-default bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
        <MaterialIcon name="check_circle" className="text-[16px] text-emerald-600" /> {action.label}
      </span>
    );
  }

  const className = {
    primary:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200",
    indigo:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100",
    secondary:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-medium shadow-sm transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
    amber:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
  }[action.variant] || "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold bg-brand-600 text-white";

  return (
    <button
      type="button"
      className={className}
      title={action.detail || `Buka chat WhatsApp (wa.me) untuk ${student.name}`}
      onClick={() => onSendWa(student, action)}
    >
      <MaterialIcon
        name={action.icon || "send"}
        className={`text-[16px]${action.variant === "secondary" ? " text-slate-500" : ""}`}
      />{" "}
      {action.label}
    </button>
  );
}

function validBreakdownTitle(breakdown) {
  if (!breakdown) return undefined;
  return [
    `Komitmen (CMS): ${formatRupiah(breakdown.commitment)}`,
    `Class Banner: ${formatRupiah(breakdown.classBanner)}`,
    `Input Manual: ${formatRupiah(breakdown.manual)}`,
  ].join("\n");
}

export function MemberRow({ student, onSendWa, onManualInfaq }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors duration-150 group border-b border-slate-100">
      <td className="py-space-md px-space-lg">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full font-label-md text-label-md font-bold flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200">
            {student.initials}
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm font-semibold leading-tight text-slate-900">{student.name}</p>
            <p className="font-body-sm text-body-sm font-mono text-slate-500">{student.phoneDisplay}</p>
            {student.email && (
              <p className="font-label-sm text-label-sm text-slate-400 truncate max-w-[14rem]" title={student.email}>
                {student.email}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-space-md px-space-md">
        <PresenceBadge presence={student.presence} />
      </td>
      <td className="py-space-md px-space-md">
        <p className="font-body-sm text-body-sm font-semibold text-slate-800 whitespace-nowrap">
          {student.classDay || "-"}
        </p>
        {student.className && (
          <p className="font-label-sm text-label-sm text-slate-400 truncate max-w-[10rem]" title={student.className}>
            {student.className}
          </p>
        )}
      </td>
      <td className="py-space-md px-space-md">
        <div className="flex items-center gap-1.5" title={student.history?.title}>
          <div className="flex items-center gap-1">
            {student.history?.dots?.map((dot, index) => (
              <span
                key={`${student.id}-dot-${index}`}
                className={`w-2.5 h-2.5 rounded-full inline-block transition-transform hover:scale-125 ${
                  PRESENCE_DOT[dot] || "bg-slate-200"
                }`}
                title={`Pekan ${index + 1}: ${
                  dot === "hadir"
                    ? "Hadir"
                    : dot === "belumBerjalan"
                    ? "Belum Berjalan"
                    : dot === "belumDiisi"
                    ? "Belum Diisi"
                    : "Tidak Hadir"
                }`}
              />
            ))}
          </div>
          <span className="font-label-sm text-label-sm ml-1 tabular-nums text-slate-600 font-semibold">
            {student.history?.score}
          </span>
        </div>
      </td>
      <td className="py-space-md px-space-md text-right font-medium tabular-nums text-slate-700">
        {student.obligationAmount}
        <span className="block font-label-sm text-label-sm text-slate-400">{student.obligationNote}</span>
      </td>
      <td className="py-space-md px-space-md text-right tabular-nums" title={validBreakdownTitle(student.validBreakdown)}>
        <span className={VALID_AMOUNT[student.validTone]}>{student.validAmount}</span>
        <span className={VALID_NOTE[student.validTone]}>{student.validNote}</span>
        {onManualInfaq && student.memberId && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => onManualInfaq(student)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors cursor-pointer"
              title="Input manual transaksi infaq"
            >
              <MaterialIcon name="add" className="text-[14px]" />
              Manual
              {student.validBreakdown?.manualEntries?.length > 0 && (
                <span className="text-slate-500 font-medium">({student.validBreakdown.manualEntries.length})</span>
              )}
            </button>
          </div>
        )}
      </td>
      <td className="py-space-md px-space-md">
        <div className="flex flex-col gap-1.5">
          <LastFollowupLine label="Presensi" followup={student.lastPresensiRemind} countScopeLabel="pekan ini" />
          <LastFollowupLine label="Infaq" followup={student.lastInfaqRemind} />
        </div>
      </td>
      <td className="py-space-md px-space-lg text-right">
        <ActionCell student={student} onSendWa={onSendWa} />
      </td>
    </tr>
  );
}
