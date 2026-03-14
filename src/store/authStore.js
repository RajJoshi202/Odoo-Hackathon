import { create } from 'zustand'
import { supabase } from '@/supabase/client'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  role: null,       // 'manager' | 'staff' | null
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearUser: () => set({ user: null, session: null, role: null }),
  clearAuth: () => set({ user: null, session: null, role: null }),
  setLoading: (loading) => set({ loading }),

  // Fetch role from the profiles table for the given user ID
  _fetchRole: async (userId) => {
    if (!userId) { set({ role: null }); return }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    set({ role: data?.role ?? 'staff' })
  },

  // Initialize auth state — call once on app mount
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      set({ session, user, loading: false })

      // Fetch role from DB (not from user_metadata — more secure)
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        set({ role: data?.role ?? 'staff' })
      }
    } catch {
      set({ loading: false })
    }

    // Listen for future auth changes (login / logout)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      set({ session, user })

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        set({ role: data?.role ?? 'staff' })
      } else {
        set({ role: null })
      }
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, role: null })
  },
}))
