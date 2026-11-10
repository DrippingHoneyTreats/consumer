"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { ApiRequestError, apiClient } from "@/lib/api";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (hydrated: boolean) => void;
  refreshMe: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const REFRESH_TIMEOUT_MS = 8000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      refreshMe: async () => {
        const timeout = new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS);
        });

        try {
          const user = await Promise.race([
            apiClient.get<User>("/me"),
            timeout.then(() => {
              throw new Error("AUTH_REFRESH_TIMEOUT");
            }),
          ]);
          set({ user });
          return user;
        } catch (err) {
          if (err instanceof ApiRequestError && err.status === 401) {
            set({ user: null });
            return null;
          }
          // Network / timeout: keep any cached user, do not hang the gate.
          return get().user;
        }
      },
      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } finally {
          set({ user: null });
        }
      },
    }),
    {
      name: "dht-admin-auth",
      partialize: (s) => ({ user: s.user }),
      skipHydration: true,
    },
  ),
);
