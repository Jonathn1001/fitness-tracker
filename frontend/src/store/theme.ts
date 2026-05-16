import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  dark: boolean
  toggle: () => void
  setDark: (v: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
      setDark: (v) => set({ dark: v }),
    }),
    { name: 'coach-theme' },
  ),
)

export function applyThemeClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}
