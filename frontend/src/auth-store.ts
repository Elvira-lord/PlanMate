import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthToken } from '@/api'

type UserRole = 'user' | 'admin'

export type AuthUser = {
  id: number
  username: string
  token: string
  role: UserRole
}

type AuthState = {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        setAuthToken(user?.token ?? null)
        set({ user })
      },
      logout: () => {
        setAuthToken(null)
        set({ user: null })
      },
    }),
    {
      name: 'plan-mate-auth',
      onRehydrateStorage: () => (state) => {
        setAuthToken(state?.user?.token ?? null)
      },
    },
  ),
)
