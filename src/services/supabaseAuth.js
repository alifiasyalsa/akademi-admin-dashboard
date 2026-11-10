/**
 * Sesi Login Akun Admin (Supabase Auth via REST)
 * QuranBest Akademi Admin Dashboard
 *
 * - Login email + password: POST /auth/v1/token?grant_type=password
 * - Sesi disimpan di localStorage & di-refresh otomatis sebelum kedaluwarsa.
 * - `supabaseHeaders()` dipakai semua service Supabase: request membawa JWT akun yang login,
 *   sehingga RLS bisa mengenali pelaku (auth.uid()).
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ihbsysccstltadfaztgz.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-r4Af6aaQrcjbu6wI_wRvw_7bvJN-eC";

// Login akun aktif hanya jika VITE_ENABLE_LOGIN=true. Nonaktif → dashboard tanpa login,
// request Supabase memakai anon key, fitur berbasis akun disembunyikan.
export const LOGIN_ENABLED = import.meta.env.VITE_ENABLE_LOGIN === "true";

const SESSION_KEY = "qb_akademi_supabase_session";
const PKCE_VERIFIER_KEY = "qb_akademi_pkce_verifier";
const REFRESH_MARGIN_MS = 60 * 1000;

const listeners = new Set();
let session = LOGIN_ENABLED ? loadSession() : null;
let refreshTimer = null;
let refreshPromise = null;
let initPromise = null;

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkcePair() {
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
}

function currentRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Kembali dari Google: URL membawa ?code=... (PKCE) atau ?error=...
 * Kode ditukar menjadi sesi, lalu parameter dibersihkan dari address bar.
 */
async function completeOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = params.get("code");
  const oauthError =
    params.get("error_description") ||
    hashParams.get("error_description") ||
    params.get("error") ||
    hashParams.get("error");
  const hashAccessToken = hashParams.get("access_token");
  if (!code && !oauthError && !hashAccessToken) return { handled: false };

  window.history.replaceState(null, "", window.location.pathname);

  // Link konfirmasi email / magic link (alur implicit): token dikirim lewat hash URL
  if (hashAccessToken && !oauthError) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${hashAccessToken}` },
      });
      if (!res.ok) throw new Error("Link login tidak valid atau sudah kedaluwarsa.");
      const user = await res.json();
      setSession(
        normalizeSession({
          access_token: hashAccessToken,
          refresh_token: hashParams.get("refresh_token"),
          expires_at: Number(hashParams.get("expires_at")) || undefined,
          expires_in: hashParams.get("expires_in"),
          user,
        })
      );
      return { handled: true, signedIn: true, method: hashParams.get("type") || "link" };
    } catch (err) {
      return { handled: true, error: err.message };
    }
  }
  const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);

  if (oauthError) {
    return { handled: true, error: translateAuthError({ msg: oauthError }, 400) };
  }
  if (!verifier) {
    return { handled: true, error: "Sesi login Google kedaluwarsa. Silakan coba lagi." };
  }
  try {
    const payload = await authRequest("token?grant_type=pkce", { auth_code: code, code_verifier: verifier });
    setSession(normalizeSession(payload));
    return { handled: true, signedIn: true, method: "google" };
  } catch (err) {
    return { handled: true, error: err.message };
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeSession(payload) {
  if (!payload?.access_token) return null;
  const expiresAt = payload.expires_at
    ? payload.expires_at * 1000
    : Date.now() + (Number(payload.expires_in) || 3600) * 1000;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    user: payload.user || session?.user || null,
  };
}

function setSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // browser storage disabled
  }
  scheduleRefresh();
  listeners.forEach((listener) => {
    try {
      listener(session);
    } catch (err) {
      console.error("[supabaseAuth] Error in auth listener:", err);
    }
  });
}

function scheduleRefresh() {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!session?.refresh_token) return;
  const delay = Math.max(0, session.expires_at - Date.now() - REFRESH_MARGIN_MS);
  refreshTimer = window.setTimeout(() => {
    refreshSession().catch(() => {});
  }, delay);
}

function translateAuthError(payload, status) {
  const message = payload?.error_description || payload?.msg || payload?.message || payload?.error || "";
  if (/invalid login credentials/i.test(message)) return "Email atau password salah.";
  if (/email not confirmed/i.test(message)) return "Email akun belum dikonfirmasi. Hubungi admin.";
  if (/signups? not allowed|signup.*disabled/i.test(message)) {
    return "Akun Google ini belum terdaftar sebagai admin. Hubungi super admin.";
  }
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return "Login Google belum diaktifkan di Supabase.";
  }
  if (/access_denied/i.test(message)) return "Login Google dibatalkan.";
  if (status === 429) return "Terlalu banyak percobaan login. Coba lagi beberapa saat.";
  return message || `Login gagal (HTTP ${status}).`;
}

async function authRequest(path, body, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(translateAuthError(payload, res.status));
    err.status = res.status;
    throw err;
  }
  return payload;
}

async function refreshSession() {
  if (!session?.refresh_token) return null;
  if (!refreshPromise) {
    refreshPromise = authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token })
      .then((payload) => {
        setSession(normalizeSession(payload));
        return session;
      })
      .catch((err) => {
        // Refresh token ditolak (dicabut / kedaluwarsa) → wajib login ulang
        if (err.status && err.status < 500) setSession(null);
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Timer bisa terlewat saat laptop sleep: cek ulang saat tab kembali aktif
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    if (session && session.expires_at - Date.now() < REFRESH_MARGIN_MS) {
      refreshSession().catch(() => {});
    }
  });
}

export function getUserDisplayName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || (user?.email ? user.email.split("@")[0] : "Admin");
}

export function supabaseHeaders(prefer = "return=representation") {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

export const supabaseAuth = {
  getSession() {
    return session;
  },

  getUser() {
    return session?.user || null;
  },

  /**
   * Selesaikan redirect login Google (jika ada), lalu pulihkan sesi tersimpan
   * dan refresh jika sudah/hampir kedaluwarsa. Hanya berjalan sekali per page load.
   * @returns {Promise<{ session: Object|null, signedInWithOAuth: boolean, error: string|null }>}
   */
  init() {
    if (!initPromise) {
      initPromise = (async () => {
        const oauth = await completeOAuthRedirect();
        if (session && !oauth.signedIn) {
          if (session.expires_at - Date.now() < REFRESH_MARGIN_MS) {
            try {
              await refreshSession();
            } catch {
              // Gagal jaringan: biarkan sesi lama, request berikutnya akan mencoba lagi
            }
          } else {
            scheduleRefresh();
          }
        }
        return {
          session,
          signedInWithOAuth: Boolean(oauth.signedIn),
          signInMethod: oauth.method || null,
          error: oauth.error || null,
        };
      })();
    }
    return initPromise;
  },

  /** Arahkan browser ke halaman login Google (Supabase OAuth, alur PKCE). */
  async signInWithGoogle() {
    // Cek dulu provider aktif: jika tidak, Supabase menampilkan halaman JSON error mentah setelah redirect.
    // Provider aktif → 302 ke Google (opaqueredirect); nonaktif → 400 dengan pesan error.
    const probe = await fetch(
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(currentRedirectUrl())}`,
      { redirect: "manual" }
    ).catch(() => null);
    if (probe && probe.type !== "opaqueredirect" && !probe.ok) {
      const payload = await probe.json().catch(() => null);
      throw new Error(translateAuthError(payload, probe.status));
    }

    const { verifier, challenge } = await createPkcePair();
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    url.searchParams.set("provider", "google");
    url.searchParams.set("redirect_to", currentRedirectUrl());
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "s256");
    window.location.assign(url.toString());
  },

  async signIn(email, password) {
    const payload = await authRequest("token?grant_type=password", { email, password });
    setSession(normalizeSession(payload));
    return session;
  },

  async signOut() {
    const token = session?.access_token;
    setSession(null);
    if (token) {
      await authRequest("logout", null, token).catch(() => {});
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
