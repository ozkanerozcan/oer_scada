import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const defaultGuest = { id: 'guest', username: 'guest', role: 'guest', fullName: 'Misafir' }

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: defaultGuest,
      token: null,
      isGuest: true,

      loginSuccess: (user, token) => set({
        user,
        token,
        isGuest: false,
      }),

      logout: () => set({ user: defaultGuest, token: null, isGuest: true }),

      isAuthenticated: () => true,

      hasRole: (requiredRole) => {
        const roleOrder = { guest: 0, operator: 1, supervisor: 2, admin: 3 }
        const userRole = get().user?.role || 'guest'
        return (roleOrder[userRole] ?? -1) >= (roleOrder[requiredRole] ?? 999)
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
)

export default useAuthStore
