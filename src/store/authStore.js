import { create } from 'zustand'
import { supabase } from '@/supabase/client'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearUser: () => set({ user: null, session: null }),
  clearAuth: () => set({ user: null, session: null }),
  setLoading: (loading) => set({ loading }),

  // Initialize auth state — call once on app mount
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false })
    } catch {
      set({ loading: false })
    }

    // Listen for future auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
