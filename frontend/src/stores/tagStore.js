import { create } from 'zustand'
import { getTags, createTag as apiCreateTag, updateTag as apiUpdateTag, deleteTag as apiDeleteTag } from '@/services/api'

const useTagStore = create((set, get) => ({
  tags: [],          // TagConfig[]
  values: {},        // { [tagName]: TagValue }
  isLoading: false,
  error: null,

  setTags: (tags) => set({ tags }),

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getTags();
      set({ tags: data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  addTag: async (tagPayload) => {
    try {
      const res = await apiCreateTag(tagPayload);
      if (res.success) {
        await get().fetchTags(); // Re-fetch to get new ID explicitly inside our db
      }
    } catch (err) {
      console.error('Failed to create tag', err);
    }
  },
  
  updateTag: async (tagPayload) => {
    try {
      const res = await apiUpdateTag(tagPayload.id, tagPayload);
      if (res.success) {
        await get().fetchTags();
      }
    } catch (err) {
      console.error('Failed to update tag', err);
    }
  },

  deleteTag: async (id) => {
    try {
      const res = await apiDeleteTag(id);
      if (res.success) {
        set((state) => ({ tags: state.tags.filter(t => t.id !== id) }));
      }
    } catch (err) {
      console.error('Failed to delete tag', err);
    }
  },

  setTagValues: (incomingObjMap) => set((state) => {
    const ts = Date.now();
    const newValues = { ...state.values }
    for (const [key, val] of Object.entries(incomingObjMap)) {
      newValues[key] = { value: val, timestamp: ts }
    }
    return { values: newValues }
  }),

  getTagValue: (tagName) => {
    return useTagStore.getState().values[tagName] ?? null
  },
}))

export default useTagStore
