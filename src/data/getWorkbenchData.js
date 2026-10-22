import { stitchMock } from "./stitchMock.js";

/**
 * Titik masuk data untuk UI.
 * Saat ini hanya mengembalikan dummy Stitch.
 * Nanti pemanggilan API CMS, normalisasi, dan penggabungan
 * dapat dimasukkan di sini tanpa mengubah komponen tampilan.
 */
export function getWorkbenchData() {
  return stitchMock;
}
