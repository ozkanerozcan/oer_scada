import { create } from 'zustand'
import { getDevices, createDevice, updateDevice as apiUpdateDevice, deleteDevice as apiDeleteDevice } from '@/services/api'

const useDeviceStore = create((set, get) => ({
  devices: [],       // DeviceConfig[]
  statuses: {},      // { [deviceId]: 'connected'|'disconnected'|'error'|'polling' }
  isLoading: false,
  error: null,

  fetchDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getDevices();
      set({ devices: data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  addDevice: async (devicePayload) => {
    try {
      const res = await createDevice(devicePayload);
      if (res.success) {
        await get().fetchDevices();
      }
    } catch (err) {
      console.error('Failed to create device', err);
    }
  },
  
  updateDevice: async (devicePayload) => {
    try {
      const res = await apiUpdateDevice(devicePayload.id, devicePayload);
      if (res.success) {
        await get().fetchDevices();
      }
    } catch (err) {
      console.error('Failed to update device', err);
    }
  },

  deleteDevice: async (id) => {
    try {
      const res = await apiDeleteDevice(id);
      if (res.success) {
        set((state) => ({ devices: state.devices.filter(d => d.id !== id) }));
      }
    } catch (err) {
      console.error('Failed to delete device', err);
    }
  },

  setDeviceStatus: (deviceId, status) => set((state) => ({
    statuses: { ...state.statuses, [deviceId]: status },
  })),

  getOnlineCount: () => {
    const { statuses } = useDeviceStore.getState()
    return Object.values(statuses).filter(s => s === 'connected').length
  },
}))

export default useDeviceStore
