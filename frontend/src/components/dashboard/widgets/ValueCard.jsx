import PropTypes from 'prop-types'

// Multipliers for the fontSize config setting
// Base value font = N cqw, title and unit scale relative to that
const SIZE_MULTIPLIERS = {
  small:  { value: 14, unit: 5,  title: 4.5 },
  medium: { value: 18, unit: 6,  title: 5   },
  large:  { value: 22, unit: 7,  title: 5.5 },
  xl:     { value: 28, unit: 8.5, title: 6  },
}

export default function ValueCard({ config = {}, isPreview = false }) {
  const {
    title       = 'Value Card',
    showTitle   = true,
    value       = '2369',
    showUnit    = true,
    unit        = 'pcs',
    fontSize    = 'large',
    accentColor = '#3b82f6',
  } = config

  const m = SIZE_MULTIPLIERS[fontSize] || SIZE_MULTIPLIERS.large

  if (isPreview) {
    // Preview thumbnails keep fixed px sizes
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '8px', gap: 4, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: accentColor, opacity: 0.07, filter: 'blur(24px)', pointerEvents: 'none' }} />
        {showTitle && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'center' }}>{title}</div>}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor}66)`, letterSpacing: '-0.03em' }}>{value}</span>
          {showUnit && unit && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span>}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, opacity: 0.5 }} />
      </div>
    )
  }

  return (
    // container-type: size enables cqw/cqh units inside
    <div style={{
      width: '100%',
      height: '100%',
      containerType: 'size',
      containerName: 'valuecard',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @container valuecard (min-width: 1px) {
          .vc-root {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            padding: clamp(8px, 3cqw, 28px);
            gap: clamp(2px, 1.2cqh, 10px);
            box-sizing: border-box;
          }
          .vc-title {
            font-size: clamp(8px, ${m.title}cqw, 48px);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted);
            text-align: center;
            margin-bottom: clamp(1px, 0.5cqh, 6px);
          }
          .vc-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: clamp(14px, ${m.value}cqw, 180px);
            font-weight: 900;
            letter-spacing: -0.03em;
            line-height: 1;
            transition: color 0.3s;
          }
          .vc-unit {
            font-size: clamp(8px, ${m.unit}cqw, 80px);
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: clamp(1px, 0.4cqh, 6px);
            line-height: 1;
          }
        }
      `}</style>

      <div className="vc-root">
        {/* Glow blob */}
        <div style={{
          position: 'absolute', bottom: -20, right: -20,
          width: '25%', height: '40%',
          borderRadius: '50%', background: accentColor,
          opacity: 0.08, filter: 'blur(24px)', pointerEvents: 'none',
        }} />

        {showTitle && <div className="vc-title">{title}</div>}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3em', lineHeight: 1 }}>
          <span
            className="vc-value"
            style={{ color: accentColor, filter: `drop-shadow(0 0 12px ${accentColor}66)` }}
          >
            {value}
          </span>
          {showUnit && unit && (
            <span className="vc-unit">{unit}</span>
          )}
        </div>

        {/* Bottom accent line */}
        <div style={{
          position: 'absolute', bottom: 0, left: '20%', right: '20%',
          height: 2, borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.5,
        }} />
      </div>
    </div>
  )
}

ValueCard.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
