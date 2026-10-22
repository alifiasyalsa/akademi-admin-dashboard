import { useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";

/**
 * RegistrasiStatusDistributionChart
 * Visualisasi distribusi status pendaftaran:
 * - Interactive SVG Donut Chart dengan hover tooltip
 * - Horizontal Segmented Progress Bar (proporsi jelas)
 * - Legend interaktif dengan persentase dan jumlah pendaftar
 */
export function RegistrasiStatusDistributionChart({
  waitCount = 0,
  pendingCount = 0,
  notConfirmCount = 0,
  cancelCount = 0,
  deleteCount = 0,
  confirmedCount = 0,
  totalBatch = 0,
  batchLabel = "Batch",
}) {
  const [hoveredKey, setHoveredKey] = useState(null);

  // Pastikan total valid
  const calculatedTotal =
    totalBatch > 0
      ? totalBatch
      : waitCount + pendingCount + notConfirmCount + cancelCount + deleteCount + confirmedCount;
  const safeTotal = Math.max(1, calculatedTotal);

  const segments = [
    {
      key: "confirm",
      label: "Sudah Masuk Kelas",
      sublabel: "Status Confirm",
      count: confirmedCount,
      color: "#0d9488", // teal-600
      lightBg: "bg-teal-50",
      textColor: "text-teal-700",
      borderColor: "border-teal-200",
      icon: "check_circle",
    },
    {
      key: "wait",
      label: "Belum Pilih Kelas",
      sublabel: "Status Wait",
      count: waitCount,
      color: "#0284c7", // sky-600
      lightBg: "bg-sky-50",
      textColor: "text-[#0284c7]",
      borderColor: "border-sky-200",
      icon: "schedule",
    },
    {
      key: "pending",
      label: "Belum Bayar",
      sublabel: "Status Pending",
      count: pendingCount,
      color: "#f59e0b", // amber-500
      lightBg: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
      icon: "payments",
    },
    {
      key: "not_confirm",
      label: "Lewat Batas",
      sublabel: "Status Not Confirm",
      count: notConfirmCount,
      color: "#f43f5e", // rose-500
      lightBg: "bg-rose-50",
      textColor: "text-rose-700",
      borderColor: "border-rose-200",
      icon: "timer_off",
    },
    {
      key: "cancel",
      label: "Mengundurkan Diri",
      sublabel: "Status Cancel",
      count: cancelCount,
      color: "#8b5cf6", // violet-500
      lightBg: "bg-violet-50",
      textColor: "text-violet-700",
      borderColor: "border-violet-200",
      icon: "person_off",
    },
    {
      key: "delete",
      label: "Dibatalkan Admin",
      sublabel: "Status Delete",
      count: deleteCount,
      color: "#64748b", // slate-500
      lightBg: "bg-slate-100",
      textColor: "text-slate-700",
      borderColor: "border-slate-300",
      icon: "delete_outline",
    },
  ];

  // Hitung persentase untuk masing-masing segmen
  const segmentsWithPct = segments.map((seg) => {
    const pct = calculatedTotal > 0 ? (seg.count / safeTotal) * 100 : 0;
    return {
      ...seg,
      percentage: Number(pct.toFixed(1)),
      rawPct: pct,
    };
  });

  // Hitung stroke-dasharray SVG Donut
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  let accumulatedOffset = 0;

  const donutSegments = segmentsWithPct.map((seg) => {
    const strokeDash = (seg.rawPct / 100) * circumference;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeDash;
    return {
      ...seg,
      strokeDash,
      strokeDashoffset,
    };
  });

  const activeSegment = hoveredKey
    ? segmentsWithPct.find((s) => s.key === hoveredKey)
    : null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      {/* Header Visualisasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <MaterialIcon name="pie_chart" className="text-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Distribusi Status Pendaftaran {batchLabel}
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan komposisi peserta yang telah masuk kelas vs yang membutuhkan penanganan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
          <span className="text-xs text-slate-500 font-medium">Total Pendaftar:</span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {calculatedTotal.toLocaleString("id-ID")}
          </span>
          <span className="text-xs text-slate-400">Santri</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
        {/* Kolom 1: Donut Chart Interaktif (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-slate-100"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Data Segments */}
              {donutSegments.map((seg) => {
                const isHovered = hoveredKey === seg.key;
                return (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={isHovered ? "15" : "12"}
                    strokeDasharray={`${seg.strokeDash} ${circumference}`}
                    strokeDashoffset={seg.strokeDashoffset}
                    fill="transparent"
                    strokeLinecap="butt"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(seg.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </svg>

            {/* Konten Tengah Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeSegment ? (
                <>
                  <span
                    className="text-2xl font-black tabular-nums transition-all"
                    style={{ color: activeSegment.color }}
                  >
                    {activeSegment.percentage}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[110px] leading-tight">
                    {activeSegment.count.toLocaleString("id-ID")} Santri
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                    {activeSegment.label}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-800 tabular-nums">
                    {calculatedTotal.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Santri
                  </span>
                  <span className="text-[10px] text-teal-600 font-medium">
                    {segmentsWithPct[0]?.percentage}% Masuk Kelas
                  </span>
                </>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Arahkan kursor ke segmen untuk rincian
          </p>
        </div>

        {/* Kolom 2: Progress Stacked Bar & Legend Rincian (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-4">
          {/* Segmented Horizontal Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5 font-medium text-slate-600">
              <span>Proporsi Keseluruhan Pendaftaran</span>
              <span className="text-slate-400">100% dari {calculatedTotal} Pendaftar</span>
            </div>
            <div className="w-full h-3 rounded-full flex overflow-hidden bg-slate-100 shadow-inner">
              {segmentsWithPct.map((seg) => {
                if (seg.count <= 0) return null;
                const isHovered = hoveredKey === seg.key;
                return (
                  <div
                    key={seg.key}
                    style={{
                      width: `${seg.rawPct}%`,
                      backgroundColor: seg.color,
                      opacity: hoveredKey && !isHovered ? 0.35 : 1,
                    }}
                    className="h-full transition-all duration-300 cursor-pointer relative"
                    title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
                    onMouseEnter={() => setHoveredKey(seg.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </div>
          </div>

          {/* Grid Legend & Metrik Mini (6 status: confirm, wait, pending, not_confirm, cancel, delete) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {segmentsWithPct.map((seg) => {
              const isHovered = hoveredKey === seg.key;
              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isHovered
                      ? `${seg.lightBg} ${seg.borderColor} shadow-xs scale-[1.01]`
                      : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-md flex-shrink-0 transition-transform"
                      style={{ backgroundColor: seg.color }}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                        {seg.label}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {seg.sublabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-xs font-bold text-slate-900 tabular-nums block leading-tight">
                      {seg.count.toLocaleString("id-ID")}
                    </span>
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: seg.color }}
                    >
                      {seg.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
