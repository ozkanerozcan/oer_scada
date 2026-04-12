import { create } from 'zustand'
import { getDashboards, createDashboard, updateDashboard, deleteDashboard } from '@/services/api'

export const slugify = (text) => {
  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'dashboard'
}

const useDashboardPagesStore = create((set, get) => ({
  pages: [],
  isLoading: false,

  loadDashboards: async () => {
    set({ isLoading: true })
    try {
      const dashboards = await getDashboards()
      set({ pages: dashboards, isLoading: false })
    } catch (err) {
      console.error('Failed to load dashboards:', err)
      set({ isLoading: false })
    }
  },

  // Save current builder widgets as a new named page
  savePage: async (name, description, widgets, isVisible = false) => {
    const id = slugify(name)
    const now = new Date().toISOString()
    const payload = {
      id,
      name,
      description,
      isVisible,
      widgets,
      createdAt: now,
      updatedAt: now
    }

    try {
      await createDashboard(payload)
      set((s) => ({ pages: [...s.pages, payload] }))
      return id
    } catch (err) {
      console.error('Failed to save dashboard:', err)
      throw err
    }
  },

  // Overwrite an existing page's widgets (from builder "Update" action)
  updatePageWidgets: async (id, widgets) => {
    const now = new Date().toISOString()
    
    // Optimistic update
    set((s) => ({
      pages: s.pages.map((p) => p.id === id ? { ...p, widgets, updatedAt: now } : p),
    }))

    try {
      await updateDashboard(id, { widgets, updatedAt: now })
    } catch (err) {
      console.error('Failed to update widgets:', err)
      // Potentially revert state here if needed
      await get().loadDashboards()
      throw err
    }
  },

  // Update name/description/visibility metadata
  updatePageMeta: async (id, patch) => {
    const now = new Date().toISOString()
    
    set((s) => ({
      pages: s.pages.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now } : p),
    }))

    try {
      await updateDashboard(id, { ...patch, updatedAt: now })
    } catch (err) {
      console.error('Failed to update meta:', err)
      await get().loadDashboards()
      throw err
    }
  },

  toggleVisibility: async (id) => {
    const page = get().pages.find(p => p.id === id)
    if (!page) return
    const now = new Date().toISOString()
    const newVisibility = !page.isVisible

    set((s) => ({
      pages: s.pages.map((p) => p.id === id ? { ...p, isVisible: newVisibility, updatedAt: now } : p),
    }))

    try {
      await updateDashboard(id, { isVisible: newVisibility, updatedAt: now })
    } catch (err) {
      console.error('Failed to toggle visibility:', err)
      await get().loadDashboards()
      throw err
    }
  },

  deletePage: async (id) => {
    set((s) => ({ pages: s.pages.filter((p) => p.id !== id) }))
    
    try {
      await deleteDashboard(id)
    } catch (err) {
      console.error('Failed to delete dashboard:', err)
      await get().loadDashboards()
    }
  },

  getPage: (id) => get().pages.find((p) => p.id === id),

  getVisiblePages: () => get().pages.filter((p) => p.isVisible),
}))

export default useDashboardPagesStore
