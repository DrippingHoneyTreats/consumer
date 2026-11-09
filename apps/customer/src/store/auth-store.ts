"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { ApiRequestError, apiClient } from "@/lib/api";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  refreshMe: () => Promise<User | null>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      refreshMe: async () => {
        try {
          const user = await apiClient.get<User>("/me");
          set({ user });
          return user;
        } catch (err) {
          if (err instanceof ApiRequestError && err.status === 401) {
            set({ user: null });
            return null;
          }
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
      name: "dht-auth",
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
