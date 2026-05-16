import { create } from 'zustand'

interface AuthStore {
  accessToken: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

// Access token is kept in memory only. On page reload the refresh-token
// HTTP-only cookie is used to re-issue an access token via /auth/refresh.
export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  setToken: (token) => set({ accessToken: token }),
  clearToken: () => set({ accessToken: null }),
}))
