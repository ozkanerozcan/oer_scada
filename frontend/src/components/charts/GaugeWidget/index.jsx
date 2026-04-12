import { memo } from 'react'

/**
 * Basic SVG Half-Doughnut Gauge
 * @param {{ value: number, min: number, max: number, title?: string, unit?: string }} props
 */
const GaugeWidget = memo(({ value = 0, min = 0, max = 100, title, unit }) => {
  const clamp = (val, mn, mx) => Math.min(Math.max(val, mn), mx)
  const safeVal = clamp(value, min, max)
  
  // Percent [0, 1]
  const pct = (safeVal - min) / (max - min) || 0
  
  // SVG Arc calculations
  const cx = 100
  const cy = 100
  const r = 80
  const strokeW = 16

  // 180 deg mapped to 100%
  const dashArray = Math.PI * r
  const dashOffset = dashArray * (1 - pct)

  // Color logic (green -> yellow -> red based on pct)
  let color = 'var(--success)'
  if (pct > 0.85) color = 'var(--danger)'
  else if (pct > 0.60) color = 'var(--warning)'

  return (
    <div className="flex-col items-center" style={{ position: 'relative', width: 200, height: 120 }}>
      {title && <div style={{ marginBottom: -10, zIndex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{title}</div>}
      
      <svg viewBox="0 0 200 120" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {/* Background Arc */}
        <circle 
          cx={cx} cy={cy} r={r} 
          fill="none" 
          stroke="var(--bg-tertiary)" 
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          strokeDashoffset={dashArray / 2}
          strokeLinecap="round"
        />
        {/* Foreground Arc */}
        <circle 
          cx={cx} cy={cy} r={r} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeW}
          strokeDasharray={dashArray}
          strokeDashoffset={dashArray / 2 + dashOffset / 2}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out' }}
        />
      </svg>
      
      <div style={{ position: 'absolute', bottom: 10, textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)'}}>
          {Number(safeVal.toFixed(1))}
        </span>
        {unit && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
})

export default GaugeWidget
