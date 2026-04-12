import { memo } from 'react'

/**
 * @param {{
 *   status: 'connected' | 'disconnected' | 'error' | 'polling',
 *   label: string,
 *   pulse?: boolean
 * }} props
 */
const StatusBadge = memo(({ status, label, pulse = false }) => {
  const getColors = () => {
    switch (status) {
      case 'connected': return { dot: 'success', bg: 'success' }
      case 'polling':   return { dot: 'success', bg: 'success' }
      case 'error':     return { dot: 'danger',  bg: 'danger' }
      default:          return { dot: 'muted',   bg: 'muted' }
    }
  }

  const { dot, bg } = getColors()
  
  return (
    <div className={`badge badge-${bg}`}>
      <span className={`dot dot-${dot} ${pulse ? 'dot-pulse' : ''}`} />
      <span>{label}</span>
      {status === 'polling' && <span className="dot dot-success dot-pulse" style={{ width: 4, height: 4 }} />}
    </div>
  )
})

export default StatusBadge
