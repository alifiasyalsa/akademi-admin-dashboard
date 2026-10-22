import { tokenManager } from "./tokenManager.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://plus-api.quranbest.com/v1";

// State kontrol untuk single-flight token refresh
let isRefreshing = false;
let refreshQueue = []; // Antrian resolver Promise yang menunggu refresh selesai
let consecutiveRefreshFailures = 0;
const MAX_CONSECUTIVE_REFRESH_ATTEMPTS = 2;

function processQueue(error, newAccessToken = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(newAccessToken);
    }
  });
  refreshQueue = [];
}

/**
 * Mencoba merefresh access token via endpoint autentikasi CMS jika tersedia.
 * Jika CMS tidak menyediakan endpoint refresh publik, atau refresh gagal, sesi ditandai kedaluwarsa.
 */
async function performTokenRefresh() {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_ATTEMPTS) {
    tokenManager.clearTokens();
    throw new Error("Maksimal percobaan refresh token terlampaui. Sesi berakhir.");
  }

  try {
    // Endpoint resmi refresh token CMS QuranBest

    let refreshResponse = null;
    let refreshPayload = null;

    try {
      const res = await fetch(`${BASE_URL}/admin/refresh-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            refreshToken: refreshToken,
          }),
      });
      if (res.ok) {
        refreshResponse = res;
        refreshPayload = await res.json();
      }
    } catch {
        // try next endpoint if any
    }
    

    if (!refreshResponse || !refreshPayload) {
      consecutiveRefreshFailures += 1;
      throw new Error("Gagal merefresh access token dari endpoint CMS.");
    }

    const newAccessToken = refreshPayload.data?.access_token; 
    const newRefreshToken = refreshPayload.data?.refresh_token;

    if (!newAccessToken) {
      consecutiveRefreshFailures += 1;
      throw new Error("Format respons refresh token tidak memuat access_token valid.");
    }

    // Reset counter kegagalan jika berhasil
    consecutiveRefreshFailures = 0;
    tokenManager.setTokens({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    return newAccessToken;
  } catch (err) {
    consecutiveRefreshFailures += 1;
    if (consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_ATTEMPTS) {
      tokenManager.clearTokens();
    }
    throw err;
  }
}

/**
 * Custom fetcher client dengan automatic Authorization header & auto-refresh token queue
 */
export async function apiClient(endpoint, options = {}, isRetry = false) {
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

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (isRetry) {
        // Jika sudah retry setelah refresh tapi tetap 401, hentikan agar tidak loop tak berujung
        tokenManager.clearTokens();
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.message || "Sesi autentikasi telah berakhir. Silakan masukkan token baru.");
        err.status = 401;
        throw err;
      }

      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        tokenManager.clearTokens();
        const err = new Error("Sesi login berakhir (401 Unauthorized). Silakan perbarui access token CMS.");
        err.status = 401;
        throw err;
      }

      // Jika ada request lain yang sedang merefresh token, masukkan ke antrean Promise
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken) => {
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              };
              resolve(apiClient(endpoint, { ...options, headers: retryHeaders }, true));
            },
            reject,
          });
        });
      }

      // Inisiasi proses refresh token tunggal (Single-flight)
      isRefreshing = true;
      try {
        const newAccessToken = await performTokenRefresh();
        processQueue(null, newAccessToken);

        // Ulangi request asli dengan token baru
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return apiClient(endpoint, { ...options, headers: retryHeaders }, true);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
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
  } catch (error) {
    throw error;
  }
}
