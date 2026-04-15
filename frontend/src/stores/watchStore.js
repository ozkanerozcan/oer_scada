import { create } from 'zustand'
import { getWatchItems } from '@/services/api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Build the flat list of all tag instances from group/device assignments
// (same logic as TagBrowser's tagInstances useMemo)
function buildTagInstances(groups) {
  const list = []
  groups.forEach(group => {
    if (!group.assignedDevices || !group.tags) return
    group.assignedDevices.forEach(device => {
      group.tags.forEach(tag => {
        list.push({ uniqueKey: `${device.name}.${group.name}.${tag.name}` })
      })
    })
  })
  return list
}

/**
 * Centralized store for the watch list.
 *
 * Applies the same enrichment + filter the Watch Table page uses:
 *   - OPC UA entries always shown
 *   - Modbus entries only shown when a matching device+group assignment exists
 *
 * This keeps the dashboard binding dropdown in sync with the Watch Table (same N items).
 */
const useWatchStore = create((set, get) => ({
  items: [],       // filtered WatchItem[]
  loading: false,
  loaded: false,
  error: null,

  /** Fetch the watch list + groups and apply the same filter as the Watch Table. */
  fetch: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      // Fetch both in parallel
      const [watchData, groupsData] = await Promise.all([
        getWatchItems(),
        fetch(`${API}/groups`).then(r => r.json()),
      ])

      const rawItems  = Array.isArray(watchData) ? watchData : (watchData?.data ?? [])
      const groups    = Array.isArray(groupsData) ? groupsData : []
      const instances = buildTagInstances(groups)
      const instanceKeys = new Set(instances.map(i => i.uniqueKey))

      // Keep the item only if:
      //   - it is an OPC UA tag  (always valid — backend polls it directly), OR
      //   - its tagKey matches a known device+group+tag combination
      const filtered = rawItems.filter(w => {
        if (!w.tagKey) return false
        if (w.tagKey.includes('.OPCUA.')) return true   // OPC UA — always valid
        return instanceKeys.has(w.tagKey)               // Modbus — must match an instance
      })

      set({ items: filtered, loading: false, loaded: true })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },
}))

export default useWatchStore
