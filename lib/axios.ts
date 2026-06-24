import axios from "axios";
import { getAuthToken, setAuthToken } from "@/lib/authToken";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // sends the httpOnly auth cookie automatically
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error logging — does not replace per-call error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? "";
      const isAuthFlow =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/signup") ||
        requestUrl.includes("/auth/magic-link") ||
        requestUrl.includes("/auth/qr-login") ||
        requestUrl.includes("/auth/me");

      if (!isAuthFlow && typeof window !== "undefined") {
        setAuthToken(null);
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  },
);
