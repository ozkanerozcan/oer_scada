import { create } from 'zustand'
import i18n from '@/i18n'

const savedLang = localStorage.getItem('lang') || 'tr'
const savedTheme = localStorage.getItem('theme') || 'dark'

if (savedTheme === 'light') {
  document.documentElement.classList.add('theme-light')
}

const useUiStore = create((set) => ({
  sidebarOpen: true,
  lang: savedLang,
  theme: savedTheme,
  loginModalOpen: false,
  loginRedirectPath: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),

  openLoginModal: (redirectPath = null) => set({ loginModalOpen: true, loginRedirectPath: redirectPath }),
  closeLoginModal: () => set({ loginModalOpen: false, loginRedirectPath: null }),

  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    i18n.changeLanguage(lang)
    set({ lang })
  },

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light')
    return { theme: nextTheme }
  }),
}))

export default useUiStore
