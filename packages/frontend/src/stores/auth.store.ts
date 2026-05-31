import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/api/client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<void>;
  setSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      async login(username, password) {
        set({ isLoading: true });
        try {
          const res = await api.post<{ token: string; user: User }>("/auth/login", {
            username,
            password,
          });
          set({
            user: res.data.user,
            token: res.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      setSession(token, user) {
        set({ token, user, isAuthenticated: true });
      },

      async logout() {
        try {
          await api.post("/auth/logout");
        } catch {
          // ignore
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      async initialize() {
        const { token } = get();
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const res = await api.get<{ user: User }>("/auth/me");
          set({ user: res.data.user, isAuthenticated: true, isInitialized: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
        }
      },

      updateUser(patch) {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },
    }),
    {
      name: "rally-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
