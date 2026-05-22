import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { startSync, stopSync } from "../lib/sync";

interface AuthState {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  syncing: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  configured: supabaseConfigured,
  ready: !supabaseConfigured, // se non c'è backend, siamo subito pronti (modalità locale)
  session: null,
  syncing: false,

  init: async () => {
    if (!supabase) {
      set({ ready: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      set({ session: data.session, syncing: true });
      try {
        await startSync(data.session.user.id);
      } finally {
        set({ syncing: false });
      }
    }
    set({ ready: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const prev = get().session;
      set({ session });
      if (session && !prev) {
        set({ syncing: true });
        try {
          await startSync(session.user.id);
        } finally {
          set({ syncing: false });
        }
      } else if (!session && prev) {
        stopSync();
      }
    });
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: "Backend non configurato." };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: "Backend non configurato." };
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    stopSync();
    set({ session: null });
  },
}));
