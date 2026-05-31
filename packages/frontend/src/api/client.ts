import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";

const baseURL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        state.logout();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/onboarding")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
