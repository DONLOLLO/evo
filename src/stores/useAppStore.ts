import { create } from "zustand";
import { db } from "../db/database";
import { seedIfEmpty } from "../db/seed";
import { todayISO } from "../lib/date";
import type { Settings } from "../types";

interface AppState {
  ready: boolean;
  settings: Settings | null;
  init: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  incrementStreak: () => Promise<void>;
  resetStreakIfMissed: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  settings: null,

  init: async () => {
    await seedIfEmpty();
    const settings = (await db.settings.get("main")) ?? null;
    set({ ready: true, settings });
    await get().resetStreakIfMissed();
  },

  refreshSettings: async () => {
    const settings = (await db.settings.get("main")) ?? null;
    set({ settings });
  },

  incrementStreak: async () => {
    const s = (await db.settings.get("main"))!;
    const today = todayISO();
    if (s.lastCheckinDate === today) return; // già fatto
    const yesterday = todayISO(new Date(Date.now() - 86400000));
    const newCount = s.lastCheckinDate === yesterday ? s.streakCount + 1 : 1;
    await db.settings.update("main", { streakCount: newCount, lastCheckinDate: today });
    await get().refreshSettings();
  },

  resetStreakIfMissed: async () => {
    const s = (await db.settings.get("main"))!;
    if (!s.lastCheckinDate) return;
    const today = todayISO();
    const yesterday = todayISO(new Date(Date.now() - 86400000));
    if (s.lastCheckinDate !== today && s.lastCheckinDate !== yesterday && s.streakCount > 0) {
      await db.settings.update("main", { streakCount: 0 });
      await get().refreshSettings();
    }
  },
}));
