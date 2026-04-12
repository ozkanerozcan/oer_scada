import useTagStore from '@/stores/tagStore'
import useAlarmStore from '@/stores/alarmStore'
import useDeviceStore from '@/stores/deviceStore'
import { initMockData } from './mock.data'

// When backend is not ready, we will fallback to mock mode
const MOCK_MODE = false

let ws = null
let retryTimer = null
const RETRY_DELAYS = [2000, 5000, 10000, 30000]
let retryCount = 0

export function connectWS(url) {
  if (MOCK_MODE) {
    console.info('[WS] Mock mode enabled. Starting local data simulation...')
    initMockData()
    return
  }

  try {
    ws = new WebSocket(url)

    ws.onopen = () => {
      retryCount = 0
      clearTimeout(retryTimer)
      console.info('[WS] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        switch (type) {
          case 'DATA_UPDATE':
            // Merge { 'Device.Group.Tag': val } into store
            useTagStore.getState().setTagValues(payload)
            break
          case 'device:status':
            useDeviceStore.getState().setDeviceStatus(payload.deviceId, payload.status)
            break
          case 'alarm:trigger':
            useAlarmStore.getState().addAlarm(payload)
            break
          case 'alarm:clear':
            useAlarmStore.getState().clearAlarm(payload.alarmId, payload.clearedAt)
            break
        }
      } catch (err) {
        console.error('[WS] Message parsing error', err)
      }
    }

    ws.onclose = () => {
      console.warn('[WS] Disconnected, attempting reconnect...')
      const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
      retryCount++
      retryTimer = setTimeout(() => connectWS(url), delay)
    }

    ws.onerror = (err) => console.error('[WS] Connection error', err)
  } catch (err) {
    console.error('[WS] Init failed', err)
  }
}

export function wsSend(type, payload) {
  if (MOCK_MODE) {
    console.log('[WS MOCK] Sent:', type, payload)
    
    // Simulate write success
    if (type === 'tag:write') {
      setTimeout(() => {
        useTagStore.getState().setTagValues([{
          tagId: payload.tagId,
          value: payload.value,
          quality: 'good',
          timestamp: Date.now()
        }])
      }, 300)
    }
    return
  }

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  } else {
    console.error('[WS] Cannot send message, not connected block')
  }
}
