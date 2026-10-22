/**
 * Token Manager
 * Bertanggung jawab menyimpan dan mengambil access token dan refresh token.
 * 
 * Prioritas penyimpanan:
 * 1. window.sessionStorage / localStorage (agar user bisa paste token dari UI / console)
 * 2. import.meta.env (VITE_ACCESS_TOKEN / VITE_REFRESH_TOKEN) untuk kemudahan development lokal
 *
 * Token TIDAK disimpan di source code / repository.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: "qb_akademi_access_token",
  REFRESH_TOKEN: "qb_akademi_refresh_token",
  TOKEN_EXPIRY: "qb_akademi_token_expiry",
};

// Event listener channel untuk notifikasi perubahan status token/sesi
const listeners = new Set();

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
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (stored) return stored;
    } catch {
      // browser storage disabled
    }
    return import.meta.env.VITE_ACCESS_TOKEN || "";
  },

  getRefreshToken() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (stored) return stored;
    } catch {
      // browser storage disabled
    }
    return import.meta.env.VITE_REFRESH_TOKEN || "";
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

  clearTokens() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    } catch {
      // ignore
    }
    this.notify({ type: "SESSION_EXPIRED", hasToken: false });
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
