import axios from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
});

type LoaderTrackedConfig = AxiosRequestConfig & {
  skipGlobalLoader?: boolean;
  trackGlobalLoader?: boolean;
  __trackedByGlobalLoader?: boolean;
};

let activeRequests = 0;
const listeners = new Set<() => void>();

const notifyLoadingChange = () => {
  listeners.forEach((listener) => listener());
};

const startRequest = () => {
  activeRequests += 1;
  notifyLoadingChange();
};

const finishRequest = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  notifyLoadingChange();
};

export const subscribeToApiLoading = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getApiLoadingState = () => activeRequests > 0;

api.interceptors.request.use((config) => {
  const trackedConfig = config as InternalAxiosRequestConfig & LoaderTrackedConfig;
  const method = (trackedConfig.method ?? "get").toLowerCase();
  const shouldTrackLoader = trackedConfig.skipGlobalLoader
    ? false
    : trackedConfig.trackGlobalLoader ?? method === "get";

  if (shouldTrackLoader) {
    trackedConfig.__trackedByGlobalLoader = true;
    startRequest();
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

export function storeTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// One renewal at a time: concurrent 401s all wait for the same refresh.
let refreshing: Promise<string | null> | null = null;

function renewAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = axios
      .post("/api/v1/auth/refresh", null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .then((res) => {
        storeTokens(res.data.access_token, res.data.refresh_token);
        return res.data.access_token as string;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

type RetryConfig = InternalAxiosRequestConfig & { __retried?: boolean };

// 401: the access token expired. 422: it no longer verifies (e.g. a new server key).
const isAuthFailure = (status?: number) => status === 401 || status === 422;

api.interceptors.response.use(
  (response) => {
    const trackedConfig = response.config as LoaderTrackedConfig;
    if (trackedConfig.__trackedByGlobalLoader) {
      trackedConfig.__trackedByGlobalLoader = false;
      finishRequest();
    }
    return response;
  },
  async (error) => {
    const trackedConfig = error?.config as LoaderTrackedConfig | undefined;
    if (trackedConfig?.__trackedByGlobalLoader) {
      trackedConfig.__trackedByGlobalLoader = false;
      finishRequest();
    }

    const config = error?.config as RetryConfig | undefined;
    const sentToken = !!config?.headers?.Authorization;
    if (config && sentToken && !config.__retried && isAuthFailure(error.response?.status)) {
      config.__retried = true;
      const token = await renewAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
    }
    return Promise.reject(error);
  }
);
