import { create } from 'zustand'

const useAlarmStore = create((set) => ({
  alarms: [],        // AlarmEvent[]

  setAlarms: (alarms) => set({ alarms }),

  addAlarm: (alarm) => set((state) => ({
    alarms: [alarm, ...state.alarms]
  })),

  clearAlarm: (alarmId, clearedAt = Date.now()) => set((state) => ({
    alarms: state.alarms.map(a => 
      a.id === alarmId ? { ...a, clearedAt } : a
    )
  })),

  ackAlarm: (alarmId, userId) => set((state) => ({
    alarms: state.alarms.map(a => 
      a.id === alarmId ? { ...a, ackBy: userId, ackAt: Date.now() } : a
    )
  })),

  getActiveCount: () => {
    const { alarms } = useAlarmStore.getState()
    return alarms.filter(a => !a.clearedAt && !a.ackAt).length
  },
}))

export default useAlarmStore
