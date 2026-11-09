import { create } from "zustand";

type State = {
  title?: string;
  setTitle: (title?: string) => void;
};

export const useAdminPageTitleStore = create<State>((set) => ({
  title: undefined,
  setTitle: (title) => set({ title }),
}));
