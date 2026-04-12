import { memo } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * @param {{ count: number, severity?: 'warning'|'critical' }} props
 */
const AlarmBadge = memo(({ count, severity = 'warning' }) => {
  const navigate = useNavigate()
  if (count === 0) return null

  return (
    <button 
      className={`btn btn-${severity === 'critical' ? 'danger' : 'ghost'} fade-in`}
      style={{ padding: '6px 12px', borderRadius: 20 }}
      title={`${count} aktif alarm`}
      onClick={() => navigate('/alarms')}
    >
      <span className={`dot dot-${severity === 'critical' ? 'danger' : 'warning'} dot-pulse`} />
      <span>{count} Alarm</span>
    </button>
  )
})

export default AlarmBadge
