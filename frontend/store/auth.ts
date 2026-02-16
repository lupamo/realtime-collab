import { create } from 'zustand'
import { User } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isLoading: false
  }),

  login: async (email, password) => {
    const tokenData = await authApi.login({ email, password })
    set({
      user: tokenData.user,
      isAuthenticated: true,
      isLoading: false
    })
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  register: async (email, password, fullName) => {
    await authApi.register({ email, password, full_name: fullName })
    const tokenData = await authApi.login({ email, password })
    set({
      user: tokenData.user,
      isAuthenticated: true,
      isLoading: false
    })
  },

  restoreSession: async () => {
    set({ isLoading: true })
    try {
      const user = await authApi.restoreSession()
      set({ user, isAuthenticated: !!user, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  }
}))