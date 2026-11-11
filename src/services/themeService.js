/**
 * Tema tampilan terang / gelap.
 * Pilihan disimpan per browser; class `dark` di <html> mengaktifkan variabel warna gelap
 * (src/theme-colors.css). Skrip awal di index.html memakai kunci yang sama agar tidak berkedip.
 */
export const THEME_STORAGE_KEY = "qb_akademi_theme";

const listeners = new Set();

export function getTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // browser storage disabled
  }
  listeners.forEach((listener) => listener(next));
  return next;
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
