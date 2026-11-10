/**
 * Ekspor CSV sisi klien (tanpa request ke server).
 * BOM UTF-8 ditambahkan agar Excel membaca karakter non-ASCII (mis. nama berharakat) dengan benar.
 */
import { activityLogService } from "./activityLogService.js";

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {Array<Object>} rows
 * @param {Array<{ header: string, value: (row: Object) => any }>} columns
 */
export function toCsv(rows, columns) {
  const lines = [columns.map((col) => escapeCell(col.header)).join(",")];
  rows.forEach((row) => {
    lines.push(columns.map((col) => escapeCell(col.value(row))).join(","));
  });
  return lines.join("\r\n");
}

export function slugifyFilePart(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Unduh baris sebagai file CSV & catat ke log aktivitas akun.
 * @param {{ fileParts: string[], rows: Object[], columns: Object[], context?: Object }} params
 */
export function downloadCsv({ fileParts = [], rows, columns, context = {} }) {
  const fileName = `${[...fileParts.map(slugifyFilePart).filter(Boolean), todayStamp()].join("_")}.csv`;
  const blob = new Blob(["\uFEFF", toCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  activityLogService.log({
    action: "export.csv",
    entityType: "csv",
    entityId: fileName,
    details: { rows: rows.length, ...context },
  });
  return fileName;
}
