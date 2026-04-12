import { memo, useRef, useEffect } from 'react'

/**
 * @param {{ tag: object, value: object, onClick?: function }} props
 */
const ValueCard = memo(({ tag, valueObj, onClick }) => {
  const cardRef = useRef(null)
  
  // Flash effect on value change
  useEffect(() => {
    if (cardRef.current && valueObj?.value !== undefined) {
      cardRef.current.classList.remove('value-flash')
      void cardRef.current.offsetWidth // trigger reflow
      cardRef.current.classList.add('value-flash')
    }
  }, [valueObj?.value, valueObj?.quality])

  // Determine state colors
  const val = valueObj?.value ?? '—'
  const isBad = valueObj?.quality === 'bad' || !valueObj
  let borderColor = 'var(--border)'
  let statusDot = 'dot-muted'

  if (!isBad) {
    if (tag.alarmHigh !== null && val > tag.alarmHigh) {
      borderColor = 'var(--danger)'
      statusDot = 'dot-danger dot-pulse'
    } else if (tag.alarmLow !== null && val < tag.alarmLow) {
      borderColor = 'var(--warning)'
      statusDot = 'dot-warning'
    } else {
      borderColor = 'var(--success)'
      statusDot = 'dot-success'
    }
  }

  return (
    <div 
      ref={cardRef}
      className="card flex-col gap-2" 
      style={{
        borderLeft: `4px solid ${borderColor}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.5s ease-out'
      }}
      onClick={onClick}
    >
      <div className="flex justify-between items-center text-muted" style={{ fontSize: 13, fontWeight: 500 }}>
        <span>{tag.name}</span>
        <span className={`dot ${statusDot}`} />
      </div>

      <div className="flex items-center gap-2">
        <span className="mono" style={{ fontSize: 28, fontWeight: 500, color: isBad ? 'var(--text-muted)' : 'var(--text-primary)'}}>
          {val}
        </span>
        {tag.unit && (
          <span className="text-secondary" style={{ fontSize: 13, paddingBottom: 4, alignSelf: 'flex-end' }}>
            {tag.unit}
          </span>
        )}
      </div>
      
      {tag.group && (
        <div className="text-muted" style={{ fontSize: 11, marginTop: 'auto' }}>
          {tag.group}
        </div>
      )}
    </div>
  )
})

export default ValueCard
