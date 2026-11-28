import { useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { ThemeToggle } from "../layout/ThemeToggle.jsx";

const MIN_PASSWORD_LENGTH = 6;

export function LoginScreen({ onSignIn, onSignUp, initialError = null }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || "");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    setErrorMessage(initialError || "");
  }, [initialError]);

  function switchMode(next) {
    setMode(next);
    setErrorMessage("");
    setInfoMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    if (mode === "register") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setErrorMessage(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Konfirmasi password tidak sama.");
        return;
      }
      if (!onSignUp) {
        setErrorMessage("Pendaftaran belum tersedia.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      if (mode === "register") {
        const result = await onSignUp(trimmedEmail, password, { fullName: trimmedName || undefined });
        if (result?.needsConfirmation) {
          setInfoMessage("Akun berhasil dibuat. Konfirmasi email dulu (cek kotak masuk), lalu masuk di sini.");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setSubmitting(false);
          return;
        }
        // Sesi langsung aktif → AuthGate akan pindah ke dashboard
        return;
      }
      await onSignIn(trimmedEmail, password);
    } catch (err) {
      setErrorMessage(err?.message || (mode === "register" ? "Pendaftaran gagal. Coba lagi." : "Login gagal. Coba lagi."));
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <main className="relative min-h-screen bg-page flex items-center justify-center p-4">
      <ThemeToggle showLabel={false} className="absolute top-4 right-4" />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-space-md mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-[0_2px_8px_rgba(148,82,118,0.28)]">
            <MaterialIcon name="menu_book" className="text-[22px]" />
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-slate-900 font-bold tracking-tight">QuranBest</span>
              <span className="font-label-sm text-label-sm text-brand-600 uppercase bg-brand-50 px-space-xs py-0.5 rounded border border-brand-200 font-semibold">
                Akademi
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-slate-500 font-medium">Monitoring Kelas Terpadu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-slate-900">
              {isRegister ? "Daftar Akun Admin" : "Masuk ke Dashboard"}
            </h1>
            <p className="font-body-sm text-body-sm text-slate-500 mt-0.5">
              {isRegister
                ? "Buat akun baru dengan email dan password. Peran default: Admin (input infaq manual hanya Super Admin)."
                : "Gunakan email dan password akun admin agar setiap aktivitas tercatat atas nama Anda."}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 w-full">
            {[
              { id: "login", label: "Masuk" },
              { id: "register", label: "Daftar" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => switchMode(opt.id)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === opt.id ? "bg-brand-200 text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isRegister && (
            <label className="block">
              <span className="font-label-sm text-label-sm font-semibold text-slate-600">Nama (opsional)</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nama tampilan di dashboard"
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </label>
          )}

          <label className="block">
            <span className="font-label-sm text-label-sm font-semibold text-slate-600">Email</span>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@quranbest.id"
              className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>

          <label className="block">
            <span className="font-label-sm text-label-sm font-semibold text-slate-600">Password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? `Minimal ${MIN_PASSWORD_LENGTH} karakter` : undefined}
                className="w-full text-sm pl-3 pr-9 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} className="text-[18px]" />
              </button>
            </div>
          </label>

          {isRegister && (
            <label className="block">
              <span className="font-label-sm text-label-sm font-semibold text-slate-600">Konfirmasi Password</span>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </label>
          )}

          {errorMessage && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <MaterialIcon name="error" className="text-[16px]" />
              {errorMessage}
            </p>
          )}

          {infoMessage && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5">
              <MaterialIcon name="check_circle" className="text-[16px]" />
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg font-label-md text-label-md font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <MaterialIcon
              name={submitting ? "hourglass_top" : isRegister ? "person_add" : "login"}
              className="text-[18px]"
            />
            <span>
              {submitting ? "Memproses..." : isRegister ? "Buat Akun" : "Masuk"}
            </span>
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            {isRegister
              ? "Sudah punya akun? Pilih tab Masuk di atas."
              : "Belum punya akun? Pilih tab Daftar, atau hubungi admin utama jika lupa password."}
          </p>
        </form>
      </div>
    </main>
  );
}
