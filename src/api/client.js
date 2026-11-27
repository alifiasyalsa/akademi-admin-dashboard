import { tokenManager } from "./tokenManager.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://plus-api.quranbest.com/v1";

// State kontrol untuk single-flight token refresh
let refreshPromise = null;

function sessionDeadError() {
  const err = new Error(
    "Koneksi Plus CMS terputus: token kedaluwarsa dan gagal diperbarui. Perbarui token CMS di Vercel lalu redeploy."
  );
  err.status = 401;
  err.code = "CMS_SESSION_DEAD";
  return err;
}

/** Satu percobaan refresh. Network error → `network: true` (jangan anggap sesi mati). */
async function requestRefresh(refreshToken) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/admin/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken, refreshToken }),
    });
  } catch {
    return { ok: false, network: true };
  }
  if (!res.ok) return { ok: false, network: res.status >= 500 };
  const payload = await res.json().catch(() => null);
  const accessToken = payload?.data?.access_token;
  if (!accessToken) return { ok: false, network: false };
  return { ok: true, accessToken, refreshToken: payload?.data?.refresh_token };
}

/**
 * Perbarui access token. Urutan percobaan:
 * 1. Refresh token yang aktif (tersimpan dari refresh sebelumnya, atau dari env).
 * 2. Refresh token env, jika berbeda (mis. token tersimpan sudah dicabut).
 * 3. Access token env langsung, jika berbeda dari token yang barusan ditolak.
 * Semua gagal karena ditolak server → sesi ditandai terputus.
 * @returns {Promise<string>} access token yang harus dicoba
 */
async function performTokenRefresh(rejectedAccessToken) {
  const candidates = [...new Set([tokenManager.getRefreshToken(), tokenManager.getEnvRefreshToken()].filter(Boolean))];
  let networkFailure = false;

  for (const refreshToken of candidates) {
    const result = await requestRefresh(refreshToken);
    if (result.ok) {
      tokenManager.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      return result.accessToken;
    }
    if (result.network) networkFailure = true;
  }

  if (networkFailure) {
    throw new Error("Tidak dapat menghubungi server CMS untuk memperbarui token. Periksa koneksi lalu coba lagi.");
  }

  const envAccessToken = tokenManager.getEnvAccessToken();
  if (tokenManager.hasStoredTokens() && envAccessToken && envAccessToken !== rejectedAccessToken) {
    tokenManager.clearStoredTokens();
    return envAccessToken;
  }

  tokenManager.markSessionDead();
  throw sessionDeadError();
}

function refreshOnce(rejectedAccessToken) {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh(rejectedAccessToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Custom fetcher client dengan automatic Authorization header & auto-refresh token (single-flight)
 */
export async function apiClient(endpoint, options = {}, isRetry = false) {
  // Sesi sudah dinyatakan terputus untuk token env build ini: jangan kirim request yang pasti 401
  if (tokenManager.isSessionDead()) {
    throw sessionDeadError();
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const accessToken = tokenManager.getAccessToken();

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Jika body adalah object JS dan belum stringified
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (response.status === 401) {
    if (isRetry) {
      // Token hasil refresh pun ditolak: hentikan agar tidak loop tak berujung
      tokenManager.markSessionDead();
      throw sessionDeadError();
    }

    const usedToken = String(headers.Authorization || "").replace(/^Bearer\s+/i, "");
    const newAccessToken = await refreshOnce(usedToken);
    const { Authorization: _omit, ...restHeaders } = options.headers || {};
    return apiClient(
      endpoint,
      { ...options, headers: { ...restHeaders, Authorization: `Bearer ${newAccessToken}` } },
      true
    );
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    const message = errorJson?.message || `Request failed with HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(message);
    err.status = response.status;
    err.response = errorJson;
    throw err;
  }

  return await response.json();
}
