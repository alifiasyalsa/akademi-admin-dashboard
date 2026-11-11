import { useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { getTheme, setTheme, subscribeTheme } from "../../services/themeService.js";

export function ThemeToggle({ showLabel = true, className = "" }) {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => subscribeTheme(setThemeState), []);

  const isDark = theme === "dark";
  const label = isDark ? "Mode Terang" : "Mode Gelap";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`Ganti ke ${label.toLowerCase()}`}
      aria-label={`Ganti ke ${label.toLowerCase()}`}
      aria-pressed={isDark}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer ${className}`}
    >
      <MaterialIcon name={isDark ? "light_mode" : "dark_mode"} className="text-[16px]" />
      {showLabel && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}
