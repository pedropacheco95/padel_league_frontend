import axios from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
});

type LoaderTrackedConfig = AxiosRequestConfig & {
  skipGlobalLoader?: boolean;
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
  if (!trackedConfig.skipGlobalLoader) {
    trackedConfig.__trackedByGlobalLoader = true;
    startRequest();
  }

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => {
    const trackedConfig = response.config as LoaderTrackedConfig;
    if (trackedConfig.__trackedByGlobalLoader) {
      trackedConfig.__trackedByGlobalLoader = false;
      finishRequest();
    }
    return response;
  },
  (error) => {
    const trackedConfig = error?.config as LoaderTrackedConfig | undefined;
    if (trackedConfig?.__trackedByGlobalLoader) {
      trackedConfig.__trackedByGlobalLoader = false;
      finishRequest();
    }
    return Promise.reject(error);
  }
);
