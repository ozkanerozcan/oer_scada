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

// ─── Device heartbeat tracking ────────────────────────────────────────────────
// Track the last time we received a DATA_UPDATE for each device.
// If a device goes silent for DISCONNECT_TIMEOUT ms it is marked disconnected.
const lastDataReceived = new Map() // deviceId -> timestamp
const DISCONNECT_TIMEOUT = 6000   // 6 s — at least 3 missed poll cycles at 2 s interval

let heartbeatTimer = null

function startHeartbeat() {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(() => {
    const now = Date.now()
    const store = useDeviceStore.getState()
    for (const [deviceId, ts] of lastDataReceived) {
      const current = store.statuses[deviceId]
      if (current === 'connected' && now - ts > DISCONNECT_TIMEOUT) {
        store.setDeviceStatus(deviceId, 'disconnected')
      }
    }
  }, 2000)
}

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
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        // Capture top-level deviceId alongside type/payload
        const msg = JSON.parse(event.data)
        const { type, payload } = msg

        switch (type) {
          case 'DATA_UPDATE': {
            // Merge tag values into store
            useTagStore.getState().setTagValues(payload)

            // Infer device status from live data flow:
            // deviceId may sit at top-level (old + new backend) or inside payload
            const deviceId = msg.deviceId
            if (deviceId !== undefined && deviceId !== null) {
              lastDataReceived.set(deviceId, Date.now())
              const current = useDeviceStore.getState().statuses[deviceId]
              if (current !== 'connected') {
                useDeviceStore.getState().setDeviceStatus(deviceId, 'connected')
              }
            }
            break
          }

          case 'device:status': {
            // Support both formats:
            //   new: { type, payload: { deviceId, status } }
            //   old: { type, deviceId, status }
            const deviceId = payload?.deviceId ?? msg.deviceId
            const status   = payload?.status   ?? msg.status
            if (deviceId !== undefined) {
              useDeviceStore.getState().setDeviceStatus(deviceId, status)
              if (status === 'connected') {
                lastDataReceived.set(deviceId, Date.now())
              }
            }
            break
          }

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
