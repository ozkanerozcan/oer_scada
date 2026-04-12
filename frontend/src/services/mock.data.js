// MOCK DATA GENERATOR FOR FRONTEND DEVELOPMENT
import useTagStore from '@/stores/tagStore'
import useDeviceStore from '@/stores/deviceStore'
import useAlarmStore from '@/stores/alarmStore'

export const mockTags = [
  { id: 't1', deviceId: 'd1', group: 'Pres-1', name: 'Basınç', type: 'holding_register', dataType: 'float32', scale: 1, unit: 'bar', writable: true, alarmLow: 5, alarmHigh: 90 },
  { id: 't2', deviceId: 'd1', group: 'Pres-1', name: 'Sıcaklık', type: 'input_register', dataType: 'float32', scale: 0.1, unit: '°C', writable: false, alarmHigh: 60 },
  { id: 't3', deviceId: 'd1', group: 'Pres-1', name: 'Motor', type: 'coil', dataType: 'bool', scale: 1, unit: '', writable: true },
  { id: 't4', deviceId: 'd2', group: 'Fırın-1', name: 'Bölge 1', type: 'holding_register', dataType: 'float32', scale: 1, unit: '°C', writable: true, alarmHigh: 850 },
  { id: 't5', deviceId: 'd2', group: 'Fırın-1', name: 'Fan Hızı', type: 'holding_register', dataType: 'uint16', scale: 1, unit: 'RPM', writable: true },
]

export const mockDevices = [
  { id: 'd1', name: 'Ana Pres Hattı', ip: '192.168.1.10', port: 502 },
  { id: 'd2', name: 'Kurutma Fırını', ip: '192.168.1.11', port: 502 },
]

export function initMockData() {
  useDeviceStore.getState().setDevices(mockDevices)
  useTagStore.getState().setTags(mockTags)
  
  // Initial connected statuses
  mockDevices.forEach(d => useDeviceStore.getState().setDeviceStatus(d.id, 'connected'))

  // Generate initial random values
  const initValues = mockTags.map(t => ({
    tagId: t.id,
    value: t.dataType === 'bool' ? false : Math.floor(Math.random() * 80),
    quality: 'good',
    timestamp: Date.now()
  }))
  useTagStore.getState().setTagValues(initValues)

  // Demo Alarm
  useAlarmStore.getState().addAlarm({
    id: 'a1', tagId: 't4', type: 'high', severity: 'critical', 
    message: 'Fırın Bölge 1 sıcaklığı çok yüksek (860 °C)', triggeredAt: Date.now() - 100000
  })

  // Start mock polling loop to simulate backend WebSocket updates
  setInterval(() => {
    const updates = mockTags.map(t => {
      if (t.dataType === 'bool') return null // skip random toggling bools
      
      const prev = useTagStore.getState().getTagValue(t.id)?.value || 40
      // Random walk
      let next = prev + (Math.random() * 4 - 2)
      if (next < 0) next = 0
      return { tagId: t.id, value: Number(next.toFixed(1)), quality: 'good', timestamp: Date.now() }
    }).filter(Boolean)

    useTagStore.getState().setTagValues(updates)
  }, 1000)
}
