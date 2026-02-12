"use client";

import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  aiAssistantOpen: boolean;
  theme: "light" | "dark";
  toggleSidebar: () => void;
  toggleAIAssistant: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  aiAssistantOpen: false,
  theme: "light",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleAIAssistant: () =>
    set((state) => ({ aiAssistantOpen: !state.aiAssistantOpen })),
  setTheme: (theme) => set({ theme }),
}));
