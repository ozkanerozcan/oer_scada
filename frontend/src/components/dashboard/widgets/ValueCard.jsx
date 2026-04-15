import PropTypes from 'prop-types'
import useTagStore from '@/stores/tagStore'
import useWatchStore from '@/stores/watchStore'

export default function ValueCard({ config = {}, isPreview = false }) {
  const {
    title       = 'Value Card',
    showTitle   = true,
    value       = '2369',
    showUnit    = true,
    unit        = 'pcs',
    accentColor = '#3b82f6',
    tagKey      = '',
  } = config

  // Look up the dataType for this tag from the already-loaded watch list
  const dataType = useWatchStore(s =>
    tagKey ? (s.items.find(w => w.tagKey === tagKey)?.dataType ?? '') : ''
  )

  // Live tag binding: if tagKey is set, read from the global tag value store
  const liveEntry = useTagStore(s => tagKey ? s.values[tagKey] : null)
  const resolvedValue = (() => {
    if (!tagKey || liveEntry === null || liveEntry === undefined) return value
    const raw = liveEntry.value
    if (typeof raw === 'number') {
      if (Number.isInteger(raw)) return String(raw)
      // Float32 → max 2 decimal places, strip trailing zeros
      if ((dataType || '').toLowerCase() === 'float32') {
        return parseFloat(raw.toFixed(2)).toString()
      }
      // All other floats → up to 4 significant digits
      return parseFloat(raw.toPrecision(4)).toString()
    }
    if (raw === null || raw === undefined) return value
    return String(raw)
  })()

  if (isPreview) {
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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor}66)`, letterSpacing: '-0.03em' }}>{resolvedValue}</span>
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
      {/*
        No clamp() max cap — font scales with cqw/cqh indefinitely.
        Uses min() of two axes so the value never overflows in either direction.
      */}
      <style>{`
        @container valuecard (min-width: 1px) {
          .vc-root {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            padding: max(4px, 2cqw);
            gap: max(1px, 0.8cqh);
            box-sizing: border-box;
          }
          .vc-title {
            font-size: max(10px, min(9cqw, 11cqh));
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            text-align: center;
            margin-bottom: max(1px, 0.4cqh);
            flex-shrink: 0;
          }
          .vc-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: max(14px, min(22cqw, 38cqh));
            font-weight: 900;
            letter-spacing: -0.03em;
            line-height: 1;
            transition: color 0.3s;
          }
          .vc-unit {
            font-size: max(8px, min(7cqw, 12cqh));
            font-weight: 600;
            color: var(--text-muted);
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
            {resolvedValue}
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
