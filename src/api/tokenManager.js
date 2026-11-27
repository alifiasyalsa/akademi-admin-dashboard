/**
 * Token Manager
 * Bertanggung jawab menyimpan dan mengambil access token dan refresh token CMS.
 *
 * Sumber token:
 * 1. localStorage → token hasil refresh otomatis (lebih baru dari token env).
 * 2. import.meta.env (VITE_ACCESS_TOKEN / VITE_REFRESH_TOKEN) → token dari Vercel env / .env.local.
 *
 * Token tersimpan di localStorage "diikat" ke token env saat ia dibuat (seed). Jika token env
 * diganti (deploy baru), token tersimpan yang lama otomatis dibuang sehingga token env baru dipakai.
 *
 * Jika refresh gagal permanen, sesi ditandai "terputus" (terikat ke token env saat itu) agar dashboard
 * berhenti mengirim request yang pasti 401. Tanda ini hilang otomatis saat token env diganti.
 *
 * Token TIDAK disimpan di source code / repository.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: "qb_akademi_access_token",
  REFRESH_TOKEN: "qb_akademi_refresh_token",
  TOKEN_EXPIRY: "qb_akademi_token_expiry",
  TOKEN_SEED: "qb_akademi_token_seed",
  SESSION_DEAD: "qb_akademi_cms_session_dead",
};

const ENV_ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN || "";
const ENV_REFRESH_TOKEN = import.meta.env.VITE_REFRESH_TOKEN || "";

// Sidik jari pendek token env (bukan token utuh) untuk mendeteksi pergantian token
function fingerprint(token) {
  return token ? `${token.length}:${token.slice(-24)}` : "none";
}
const ENV_SEED = fingerprint(ENV_ACCESS_TOKEN);

// Event listener channel untuk notifikasi perubahan status token/sesi
const listeners = new Set();

function safeGet(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeStoredTokens() {
  try {
    [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.TOKEN_EXPIRY].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // browser storage disabled
  }
}

// Token env berganti sejak token tersimpan dibuat → buang token tersimpan yang lama
(function syncWithEnvToken() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.TOKEN_SEED) !== ENV_SEED) {
      removeStoredTokens();
      localStorage.setItem(STORAGE_KEYS.TOKEN_SEED, ENV_SEED);
    }
  } catch {
    // browser storage disabled
  }
})();

function parseJwtExpiry(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const tokenManager = {
  getAccessToken() {
    return safeGet(STORAGE_KEYS.ACCESS_TOKEN) || ENV_ACCESS_TOKEN;
  },

  getRefreshToken() {
    return safeGet(STORAGE_KEYS.REFRESH_TOKEN) || ENV_REFRESH_TOKEN;
  },

  getEnvAccessToken() {
    return ENV_ACCESS_TOKEN;
  },

  getEnvRefreshToken() {
    return ENV_REFRESH_TOKEN;
  },

  hasStoredTokens() {
    return Boolean(safeGet(STORAGE_KEYS.ACCESS_TOKEN));
  },

  setTokens({ accessToken, refreshToken, expiresIn, adminProfile }) {
    try {
      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      if (adminProfile) {
        localStorage.setItem("qb_akademi_admin_profile", JSON.stringify(adminProfile));
      }
      localStorage.setItem(STORAGE_KEYS.TOKEN_SEED, ENV_SEED);
      localStorage.removeItem(STORAGE_KEYS.SESSION_DEAD);

      // Hitung waktu kadaluwarsa dari JWT exp atau parameter expiresIn
      const jwtExp = parseJwtExpiry(accessToken);
      if (jwtExp) {
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(jwtExp));
      } else if (expiresIn) {
        const expiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiresAt));
      }
    } catch (err) {
      console.warn("Gagal menyimpan token ke localStorage:", err);
    }
    this.notify({ type: "TOKEN_UPDATED", hasToken: Boolean(accessToken || this.getAccessToken()) });
  },

  getAdminProfile() {
    try {
      const data = localStorage.getItem("qb_akademi_admin_profile");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /** Buang token hasil refresh (kembali memakai token env) tanpa menandai sesi terputus. */
  clearStoredTokens() {
    removeStoredTokens();
  },

  /** Token tersimpan maupun token env sudah tidak bisa dipakai / di-refresh. */
  markSessionDead() {
    removeStoredTokens();
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_DEAD, ENV_SEED);
    } catch {
      // ignore
    }
    this.notify({ type: "SESSION_EXPIRED", hasToken: false });
  },

  /** Sesi ditandai terputus untuk token env yang sedang dipakai build ini. */
  isSessionDead() {
    return safeGet(STORAGE_KEYS.SESSION_DEAD) === ENV_SEED;
  },

  /** Hapus tanda terputus & token tersimpan agar koneksi dicoba ulang dari token env. */
  resetSession() {
    removeStoredTokens();
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_DEAD);
    } catch {
      // ignore
    }
    this.notify({ type: "TOKEN_UPDATED", hasToken: Boolean(this.getAccessToken()) });
  },

  /** @deprecated pakai markSessionDead() */
  clearTokens() {
    this.markSessionDead();
  },

  hasValidAuth() {
    return Boolean(this.getAccessToken());
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify(event) {
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in token listener:", err);
      }
    });
  },
};
