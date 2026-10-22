/**
 * TablePagination
 * Komponen reusable untuk kontrol paginasi tabel (Monitoring, Registrasi, dll.)
 */
export function TablePagination({
  startIndex = 0,
  endIndex = 0,
  totalItems = 0,
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  pageNumbers = [1],
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "Santri",
  extraInfo = null,
}) {
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  return (
    <div className="px-space-lg py-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md font-label-sm text-label-sm bg-slate-50 border-t border-slate-200 text-slate-500">
      {/* Kiri: Info data & selector ukuran halaman */}
      <div className="flex flex-wrap items-center gap-space-sm">
        <span>
          Menampilkan{" "}
          <strong className="font-semibold text-slate-900">
            {totalItems === 0 ? 0 : `${startIndex} - ${endIndex}`}
          </strong>{" "}
          dari <strong className="font-semibold text-slate-900">{totalItems}</strong>{" "}
          {itemLabel}
        </span>
        {extraInfo && (
          <>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline text-slate-500">{extraInfo}</span>
          </>
        )}

        <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
          <span className="text-slate-500">Per baris:</span>
          <select
            value={pageSize}
            aria-label="Pilih jumlah baris per halaman"
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 text-xs font-semibold focus:outline-none focus:border-[#0284c7] cursor-pointer shadow-sm"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanan: Navigasi Halaman */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange?.(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className={`px-3 py-1 rounded transition-colors shadow-sm font-medium ${
            safePage <= 1
              ? "bg-white text-slate-300 border border-slate-200 cursor-not-allowed opacity-60"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          }`}
        >
          Sebelumnya
        </button>

        {pageNumbers.map((num, idx) => {
          if (num === "...") {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 select-none">
                ...
              </span>
            );
          }
          const isCurrent = num === safePage;
          return (
            <button
              key={`page-${num}`}
              type="button"
              onClick={() => onPageChange?.(num)}
              className={`min-w-[32px] px-2.5 py-1 rounded font-bold shadow-sm transition-colors text-center cursor-pointer ${
                isCurrent
                  ? "bg-[#0284c7] text-white border border-[#0284c7]"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {num}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange?.(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className={`px-3 py-1 rounded transition-colors shadow-sm font-medium ${
            safePage >= totalPages
              ? "bg-white text-slate-300 border border-slate-200 cursor-not-allowed opacity-60"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          }`}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
