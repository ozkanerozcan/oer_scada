import PropTypes from 'prop-types'
import { useRef, useState, useEffect } from 'react'

const SIZE_RATIO = { small: 0.35, medium: 0.55, large: 0.75, xl: 0.9 }

export default function LEDIndicator({ config = {}, isPreview = false }) {
  const {
    label     = 'Status',
    state     = false,
    onColor   = '#22c55e',
    offColor  = '#ef4444',
    onText    = 'ON',
    offText   = 'OFF',
    ledSize   = 'medium',
    blink     = true,
    showLabel = true,
  } = config

  const color        = state ? onColor : offColor
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 240, h: 60 })

  useEffect(() => {
    if (isPreview || !containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDims({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [isPreview])

  // ── Preview thumbnail (fixed small size) ─────────────────────
  if (isPreview) {
    const s = 16
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '4px 8px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: s, height: s, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: color, opacity: state ? 0.2 : 0.05, filter: 'blur(3px)' }} />
          <div style={{ width: s, height: s, borderRadius: '50%', position: 'relative', background: state ? `radial-gradient(circle at 35% 35%, ${color}ff, ${color}88)` : `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`, boxShadow: state ? `0 0 6px ${color}` : 'inset 0 2px 4px rgba(0,0,0,0.4)', border: `1.5px solid ${color}44` }}>
            <div style={{ position: 'absolute', top: '18%', left: '22%', width: '30%', height: '25%', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', filter: 'blur(1px)' }} />
          </div>
        </div>
        {showLabel && <span style={{ fontSize: 8, fontWeight: 700, color: state ? color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>}
        <span style={{ fontSize: 7, fontWeight: 700, color: state ? color : 'var(--text-muted)', background: state ? `${color}15` : 'var(--bg-tertiary)', border: `1px solid ${state ? color + '44' : 'var(--border)'}`, padding: '1px 4px', borderRadius: 100, flexShrink: 0 }}>
          {state ? onText : offText}
        </span>
      </div>
    )
  }

  // ── Compute all sizes from measured container ─────────────────
  const ratio     = SIZE_RATIO[ledSize] ?? SIZE_RATIO.medium
  const ledD      = Math.round(Math.min(dims.h * ratio, dims.w * 0.22, 120))
  const fontSize  = Math.round(Math.max(10, Math.min(dims.h * 0.3,  dims.w * 0.055, 36)))
  const badgeFont = Math.round(Math.max(8,  Math.min(dims.h * 0.22, dims.w * 0.04,  24)))
  const gap       = Math.round(Math.max(6,  dims.w * 0.025))
  const padH      = Math.round(Math.max(8,  dims.w * 0.04))
  const padV      = Math.round(Math.max(4,  dims.h * 0.12))

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap, padding: `${padV}px ${padH}px`,
        boxSizing: 'border-box', overflow: 'hidden',
      }}
    >
      <style>{`@keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>

      {/* LED bulb */}
      <div style={{ position: 'relative', width: ledD, height: ledD, flexShrink: 0 }}>
        {/* Glow ring */}
        <div style={{
          position: 'absolute', inset: -Math.round(ledD * 0.25),
          borderRadius: '50%', background: color,
          opacity: state ? 0.18 : 0.05,
          filter: `blur(${Math.round(ledD * 0.3)}px)`,
          transition: 'opacity 0.4s, background 0.4s',
        }} />
        {/* Body */}
        <div style={{
          width: ledD, height: ledD, borderRadius: '50%', position: 'relative',
          background: state
            ? `radial-gradient(circle at 35% 35%, ${color}ff, ${color}88)`
            : `radial-gradient(circle at 35% 35%, ${color}55, ${color}22)`,
          boxShadow: state
            ? `0 0 ${Math.round(ledD * 0.5)}px ${color}, 0 0 ${ledD}px ${color}44`
            : 'inset 0 2px 4px rgba(0,0,0,0.4)',
          border: `2px solid ${color}44`,
          transition: 'background 0.4s, box-shadow 0.4s',
          animation: state && blink ? 'ledPulse 1.8s ease-in-out infinite' : 'none',
        }}>
          {/* Specular highlight */}
          <div style={{ position: 'absolute', top: '18%', left: '22%', width: '30%', height: '25%', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', filter: 'blur(1px)' }} />
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <span style={{
          fontSize, fontWeight: 700,
          color: state ? color : 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.4s',
        }}>
          {label}
        </span>
      )}

      {/* ON/OFF badge */}
      <span style={{
        fontSize: badgeFont, fontWeight: 700,
        color: state ? color : 'var(--text-muted)',
        background: state ? `${color}15` : 'var(--bg-tertiary)',
        border: `1px solid ${state ? color + '44' : 'var(--border)'}`,
        padding: `${Math.max(2, Math.round(badgeFont * 0.15))}px ${Math.max(6, Math.round(badgeFont * 0.55))}px`,
        borderRadius: 100, flexShrink: 0,
        transition: 'all 0.4s', letterSpacing: '0.06em',
      }}>
        {state ? onText : offText}
      </span>
    </div>
  )
}

LEDIndicator.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
