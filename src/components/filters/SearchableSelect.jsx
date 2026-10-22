import { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Ketik untuk mencari...",
  icon = "search",
  variant = "default", // "default" | "primary"
  align = "left", // "left" | "right"
  minWidth = "min-w-[200px]",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Filter options berdasarkan input teks pengguna
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Focus search input saat dropdown terbuka
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

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

  // Keyboard navigation (Escape to close)
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const isPrimary = variant === "primary";

  return (
    <div className={`relative ${minWidth}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-all shadow-sm border text-left ${
          isPrimary
            ? "bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#0284c7]"
            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20"
        }`}
        title={selectedOption ? selectedOption.label : placeholder}
      >
        <span className="truncate max-w-[240px] xl:max-w-[320px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <MaterialIcon
          name={isOpen ? "expand_less" : "expand_more"}
          className={`text-[18px] transition-transform ${isPrimary ? "text-white" : "text-slate-500"}`}
        />
      </button>

      {/* Popover Dropdown dengan Search Bar */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-full sm:min-w-[280px] md:min-w-[340px] max-w-[calc(100vw-32px)] sm:max-w-[420px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Input Pencarian */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <MaterialIcon
                name={icon}
                className="absolute left-2.5 text-[18px] text-slate-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-body-sm font-body-sm text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title="Hapus pencarian"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                </button>
              )}
            </div>
            {filteredOptions.length > 0 && (
              <div className="flex items-center justify-between px-1 pt-1.5 text-[11px] text-slate-400">
                <span>Ditemukan: {filteredOptions.length} opsi</span>
                {search && <span className="text-[#0284c7] font-medium">Kata kunci: &quot;{search}&quot;</span>}
              </div>
            )}
          </div>

          {/* Daftar Opsi */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-slate-500 text-body-sm">
                <MaterialIcon name="search_off" className="text-[28px] text-slate-300 mx-auto mb-1 block" />
                Tidak ditemukan hasil untuk <strong className="text-slate-700">&quot;{search}&quot;</strong>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-body-sm transition-colors ${
                      isSelected
                        ? "bg-sky-50 text-[#0284c7] font-semibold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <MaterialIcon name="check" className="text-[16px] text-[#0284c7] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
