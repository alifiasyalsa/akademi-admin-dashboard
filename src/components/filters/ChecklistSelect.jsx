import { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";

/**
 * Dropdown multi-pilih dengan checklist (dipakai untuk filter Hari & Batch).
 * `value` berisi semua opsi = "semua"; `value` kosong = belum ada yang dipilih.
 */
export function ChecklistSelect({
  options = [],
  value = [],
  onChange,
  allLabel = "Semua",
  placeholder = "Pilih...",
  title = "Pilih",
  unitLabel = "Item",
  icon = "checklist",
  disabled = false,
  disabledTitle = "",
  align = "right",
  minWidth = "min-w-[150px]",
  busy = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const allIds = options.map((opt) => String(opt.id));
  const selectedIds = value.map(String);
  const isNoneSelected = selectedIds.length === 0;
  const isAllSelected = !isNoneSelected && allIds.every((id) => selectedIds.includes(id));

  function toggleOption(id) {
    const next = selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id];
    // Jaga urutan pilihan mengikuti urutan opsi
    onChange(allIds.filter((optId) => next.includes(optId)));
  }

  const selectedLabels = options.filter((opt) => selectedIds.includes(String(opt.id))).map((opt) => opt.label);
  const triggerLabel = isNoneSelected
    ? placeholder
    : isAllSelected
    ? allLabel
    : selectedLabels.length <= 2
    ? selectedLabels.join(", ")
    : `${selectedLabels.length} ${unitLabel} Dipilih`;

  return (
    <div
      className={`relative ${minWidth} ${isOpen ? "z-30" : "z-auto"}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all shadow-sm border text-left bg-white hover:bg-slate-50 text-slate-800 border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
        title={disabled ? disabledTitle : isNoneSelected || isAllSelected ? triggerLabel : selectedLabels.join(", ")}
      >
        <span className="flex items-center gap-1.5 truncate">
          <MaterialIcon
            name={busy ? "sync" : icon}
            className={`text-[16px] ${busy ? "text-brand-600 animate-spin" : "text-slate-500"}`}
          />
          <span className="truncate max-w-[240px]">{triggerLabel}</span>
        </span>
        <MaterialIcon
          name={disabled ? "lock" : isOpen ? "expand_less" : "expand_more"}
          className="text-[18px] text-slate-500"
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-72 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(allIds)}
                disabled={isAllSelected}
                className="text-[11px] font-semibold text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline cursor-pointer disabled:cursor-default"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={isNoneSelected}
                className="text-[11px] font-semibold text-rose-600 hover:underline disabled:text-slate-300 disabled:no-underline cursor-pointer disabled:cursor-default"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          <div className="p-1 max-h-72 overflow-y-auto">
            {options.map((opt) => {
              const id = String(opt.id);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm cursor-pointer select-none transition-colors ${
                    checked ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(id)}
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
