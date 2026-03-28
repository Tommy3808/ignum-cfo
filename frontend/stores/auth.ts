'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  tier: string
  demo_expires_at?: string
}

interface Company {
  id: number
  rfc: string
  razon_social: string
  regimen_fiscal: string
}

interface AuthState {
  token: string | null
  user: User | null
  companies: Company[]
  currentCompany: Company | null
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  setCompanies: (companies: Company[]) => void
  setCurrentCompany: (company: Company | null) => void
  logout: () => void
  isDemoExpired: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      companies: [],
      currentCompany: null,
      
      setToken: (token) => set({ token }),
      
      setUser: (user) => set({ user }),
      
      setCompanies: (companies) => set({ companies }),
      
      setCurrentCompany: (company) => set({ currentCompany: company }),
      
      logout: () => set({
        token: null,
        user: null,
        companies: [],
        currentCompany: null,
      }),
      
      isDemoExpired: () => {
        const { user } = get()
        if (!user || user.tier !== 'demo') return false
        if (!user.demo_expires_at) return false
        return new Date(user.demo_expires_at) < new Date()
      },
    }),
    {
      name: 'ignum-auth-storage',
    }
  )
)

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}))
