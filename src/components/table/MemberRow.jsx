import { MaterialIcon } from "../MaterialIcon.jsx";

const PRESENCE_DOT = {
  hadir: "bg-[#0284c7]",
  tidakHadir: "bg-amber-400",
  belumBerjalan: "bg-slate-200 border border-slate-300",
  absen: "bg-amber-400",
  sakit: "bg-amber-400",
  izin: "bg-sky-400",
};

const PRESENCE_BADGE = {
  hadir: {
    wrap: "bg-sky-50 text-[#0369a1] border-sky-200",
    dot: "bg-[#0284c7]",
  },
  izin: {
    wrap: "bg-sky-50 text-[#0369a1] border-sky-200",
    dot: "bg-sky-400",
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
};

const VALID_NOTE = {
  overdue: "font-semibold text-rose-600 text-[11px] leading-[14px]",
  paid: "font-semibold text-teal-600 text-[11px] leading-[14px]",
  none: "font-semibold text-rose-600 text-[11px] leading-[14px]",
  advance: "font-semibold text-[#0284c7] text-[11px] leading-[14px]",
};

const VALID_AMOUNT = {
  overdue: "block font-bold text-slate-900",
  paid: "block font-bold text-slate-900",
  none: "block font-bold text-rose-600",
  advance: "block font-bold text-slate-900",
};

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
          let btnClass = "px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-200";
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
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-200",
    indigo:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100",
    secondary:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-medium shadow-sm transition-all active:scale-95 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
    amber:
      "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold shadow-sm transition-all active:scale-95 bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200",
  }[action.variant] || "inline-flex items-center gap-1 px-space-md py-1.5 rounded-lg font-label-md text-label-md font-semibold bg-[#0284c7] text-white";

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

export function MemberRow({ student, onSendWa }) {
  console.log(student)
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
          </div>
        </div>
      </td>
      <td className="py-space-md px-space-md">
        <PresenceBadge presence={student.presence} />
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
      <td className="py-space-md px-space-md text-right tabular-nums">
        <span className={VALID_AMOUNT[student.validTone]}>{student.validAmount}</span>
        <span className={VALID_NOTE[student.validTone]}>{student.validNote}</span>
      </td>
      <td className="py-space-md px-space-lg text-right">
        <ActionCell student={student} onSendWa={onSendWa} />
      </td>
    </tr>
  );
}
