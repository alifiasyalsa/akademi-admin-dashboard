import { useState } from "react";
import { MaterialIcon } from "../MaterialIcon.jsx";
import { ThemeToggle } from "../layout/ThemeToggle.jsx";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-[18px] h-[18px]" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen({ onSignIn, onSignInWithGoogle, initialError = null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || "");

  async function handleGoogle() {
    setRedirecting(true);
    setErrorMessage("");
    try {
      await onSignInWithGoogle();
    } catch (err) {
      setErrorMessage(err?.message || "Gagal membuka login Google.");
      setRedirecting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    try {
      await onSignIn(email.trim(), password);
    } catch (err) {
      setErrorMessage(err?.message || "Login gagal. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-page flex items-center justify-center p-4">
      <ThemeToggle showLabel={false} className="absolute top-4 right-4" />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-space-md mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-[0_2px_8px_rgba(178,58,112,0.3)]">
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
            <h1 className="font-headline-sm text-headline-sm font-bold text-slate-900">Masuk ke Dashboard</h1>
            <p className="font-body-sm text-body-sm text-slate-500 mt-0.5">
              Gunakan akun admin masing-masing agar setiap aktivitas tercatat atas nama Anda.
            </p>
          </div>

          {onSignInWithGoogle && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={redirecting || submitting}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-surface hover:bg-slate-50 border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <GoogleLogo />
                <span>{redirecting ? "Membuka Google..." : "Masuk dengan Google"}</span>
              </button>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                <span className="h-px flex-1 bg-slate-200" />
                atau dengan email
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          <label className="block">
            <span className="font-label-sm text-label-sm font-semibold text-slate-600">Email</span>
            <input
              type="email"
              autoComplete="username"
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

          {errorMessage && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <MaterialIcon name="error" className="text-[16px]" />
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || redirecting}
            className="w-full px-4 py-2.5 rounded-lg font-label-md text-label-md font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <MaterialIcon name={submitting ? "hourglass_top" : "login"} className="text-[18px]" />
            <span>{submitting ? "Memproses..." : "Masuk"}</span>
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Belum punya akun atau lupa password? Hubungi admin utama.
          </p>
        </form>
      </div>
    </main>
  );
}
