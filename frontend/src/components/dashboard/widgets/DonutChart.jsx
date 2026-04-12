import PropTypes from 'prop-types'

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

// ── Preview (thumbnail) — fixed small size ───────────────────────
function DonutPreview({ config }) {
  const {
    value = 65, maxValue = 100, unit = '%',
    angle = 270, color = '#14b8a6',
    showTitle = true, title = 'Donut Chart',
    showCenterLabel = true, showPercentage = false,
  } = config

  const safeMax = maxValue > 0 ? maxValue : 100
  const pct = Math.min(Math.max(value / safeMax, 0), 1)
  const is360 = angle === 360
  const startAngle = is360 ? 0 : -135
  const fgEnd = is360
    ? startAngle + angle * pct + (pct === 1 ? -0.01 : 0)
    : startAngle + angle * pct

  const s = 80, cx = 40, cy = 40, r = 28, sw = 8
  const bgPath = describeArc(cx, cy, r, is360 ? 0.001 : startAngle, is360 ? 359.999 : startAngle + angle)
  const fgPath = pct > 0 ? describeArc(cx, cy, r, startAngle, fgEnd) : null
  const displayValue = showPercentage ? `${Math.round(pct * 100)}%` : value

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, padding: 4 }}>
      {showTitle && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'center' }}>{title}</div>}
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <path d={bgPath} fill="none" stroke="var(--bg-tertiary)" strokeWidth={sw} strokeLinecap={is360 ? 'butt' : 'round'} />
        {fgPath && <path d={fgPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap={is360 ? 'butt' : 'round'} style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />}
        {showCenterLabel && (
          <>
            <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-primary)" fontSize={12} fontWeight="900" fontFamily="'JetBrains Mono', monospace">{displayValue}</text>
            {unit && !showPercentage && <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontWeight="600">{unit}</text>}
          </>
        )}
      </svg>
    </div>
  )
}

// ── Main widget — scales with card ──────────────────────────────
export default function DonutChart({ config = {}, isPreview = false }) {
  const {
    title           = 'Donut Chart',
    showTitle       = true,
    value           = 65,
    maxValue        = 100,
    unit            = '%',
    angle           = 270,
    color           = '#14b8a6',
    showCenterLabel = true,
    showPercentage  = false,
  } = config

  if (isPreview) return <DonutPreview config={config} />

  const safeMax = maxValue > 0 ? maxValue : 100
  const pct = Math.min(Math.max(value / safeMax, 0), 1)

  const is360 = angle === 360
  const startAngle = is360 ? 0 : -135
  const totalSweep = angle
  const fgEnd = is360
    ? startAngle + totalSweep * pct + (pct === 1 ? -0.01 : 0)
    : startAngle + totalSweep * pct

  // Fixed internal coordinate system — CSS scales the SVG element
  const VB = 200           // viewBox size
  const cx = VB / 2        // 100
  const cy = VB / 2        // 100
  const r  = VB * 0.36     // 72
  const sw = VB * 0.08     // 16  — stroke scales with viewBox

  const bgPath = describeArc(cx, cy, r, is360 ? 0.001 : startAngle, is360 ? 359.999 : startAngle + totalSweep)
  const fgPath = pct > 0 ? describeArc(cx, cy, r, startAngle, fgEnd) : null

  const displayValue = showPercentage ? `${Math.round(pct * 100)}%` : value

  // Center text sizes in viewBox units (they scale with SVG)
  const centerFontSize = 32
  const unitFontSize   = 14

  return (
    <div style={{
      width: '100%',
      height: '100%',
      containerType: 'size',
      containerName: 'donutcard',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'clamp(6px, 3cqw, 20px)',
      gap: 'clamp(2px, 1cqh, 8px)',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Title — scales with container */}
      {showTitle && (
        <div style={{
          fontSize: 'clamp(8px, 4.5cqw, 18px)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {title}
        </div>
      )}

      {/* SVG fills remaining space — viewBox keeps internal scale stable */}
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', overflow: 'visible' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id={`donut-glow-${color.replace('#', '')}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={bgPath}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth={sw}
            strokeLinecap={is360 ? 'butt' : 'round'}
          />

          {/* Foreground arc */}
          {fgPath && (
            <path
              d={fgPath}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap={is360 ? 'butt' : 'round'}
              style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke 0.3s' }}
            />
          )}

          {/* Center label */}
          {showCenterLabel && (
            <>
              <text
                x={cx} y={cy + centerFontSize * 0.38}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize={centerFontSize}
                fontWeight="900"
                fontFamily="'JetBrains Mono', monospace"
              >
                {displayValue}
              </text>
              {unit && !showPercentage && (
                <text
                  x={cx} y={cy + centerFontSize * 0.38 + unitFontSize + 4}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize={unitFontSize}
                  fontWeight="600"
                >
                  {unit}
                </text>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  )
}

DonutChart.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
