import { useState, useEffect, useRef } from 'react'
import useTagStore from '@/stores/tagStore'
import useDeviceStore from '@/stores/deviceStore'
import useAlarmStore from '@/stores/alarmStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

// ─── Tag keys ──────────────────────────────────────────────────
const k = (tag) => `PRES 1.Monitoring.${tag}`

// ─── Animated number hook ──────────────────────────────────────
function useAnimatedValue(value, duration = 600) {
  const [display, setDisplay] = useState(value)
  const frame = useRef(null)
  useEffect(() => {
    const start = display
    const diff = value - start
    const t0 = performance.now()
    const step = (t) => {
      const p = Math.min((t - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(start + diff * ease)
      if (p < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [value])
  return display
}

// ─── SVG Arc Meter ─────────────────────────────────────────────
function ArcMeter({ value = 0, min = 0, max = 100, color = '#14b8a6', label, unit, size = 160, danger = 85, warn = 65 }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1)
  const R = size * 0.38
  const cx = size / 2, cy = size / 2 + size * 0.08
  const startAngle = -210, sweepAngle = 240
  const toRad = (deg) => (deg * Math.PI) / 180
  const arcPt = (deg) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy + R * Math.sin(toRad(deg)),
  })
  const endAngle = startAngle + sweepAngle * pct
  const arcColor = pct * 100 > danger ? '#ef4444' : pct * 100 > warn ? '#f59e0b' : color
  const [s1, e1] = [arcPt(startAngle), arcPt(endAngle)]
  const [sbg1, sbg2] = [arcPt(startAngle), arcPt(startAngle + sweepAngle)]
  const largeArc = sweepAngle * pct > 180 ? 1 : 0
  const largeBg = sweepAngle > 180 ? 1 : 0
  const animVal = useAnimatedValue(value)

  const bgPath = `M ${sbg1.x} ${sbg1.y} A ${R} ${R} 0 ${largeBg} 1 ${sbg2.x} ${sbg2.y}`
  const fgPath = pct > 0
    ? `M ${s1.x} ${s1.y} A ${R} ${R} 0 ${largeArc} 1 ${e1.x} ${e1.y}`
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`} overflow="visible">
        {/* tick marks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const angle = startAngle + (sweepAngle / 10) * i
          const inner = R - 8, outer = R - 2
          const a = toRad(angle)
          return (
            <line key={i}
              x1={cx + inner * Math.cos(a)} y1={cy + inner * Math.sin(a)}
              x2={cx + outer * Math.cos(a)} y2={cy + outer * Math.sin(a)}
              stroke={i >= Math.round(warn / 10) ? (i >= Math.round(danger / 10) ? '#ef444455' : '#f59e0b55') : '#33445566'}
              strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
            />
          )
        })}
        {/* bg arc */}
        <path d={bgPath} fill="none" stroke="var(--bg-tertiary)" strokeWidth={10} strokeLinecap="round" />
        {/* fg arc */}
        {fgPath && (
          <path d={fgPath} fill="none" stroke={arcColor} strokeWidth={10} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${arcColor}88)`, transition: 'stroke 0.4s' }}
          />
        )}
        {/* needle dot */}
        <circle cx={cx} cy={cy} r={6} fill={arcColor} style={{ filter: `drop-shadow(0 0 4px ${arcColor})` }} />
        {/* value */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)"
          fontSize={size * 0.155} fontWeight="800" fontFamily="'JetBrains Mono', monospace">
          {Number(animVal).toFixed(value % 1 === 0 ? 0 : 1)}
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" fill="var(--text-muted)" fontSize={size * 0.078} fontWeight="600">
          {unit}
        </text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: -4 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Horizontal bar metric ─────────────────────────────────────
function BarMetric({ label, value, max, unit, color }) {
  const pct = Math.min((value / (max || 1)) * 100, 100)
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 800, color }}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>{unit}</span>
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 100, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${color}88`
        }} />
      </div>
    </div>
  )
}

// ─── Custom recharts tooltip ───────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117ee', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {Number(p.value).toFixed(1)} {p.unit}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const values       = useTagStore(s => s.values)
  const devices      = useDeviceStore(s => s.devices)
  const statuses     = useDeviceStore(s => s.statuses)
  const activeAlarms = useAlarmStore(s => s.getActiveCount())

  const g = (tag) => values[k(tag)]?.value ?? 0

  const sicaklik1  = g('Sıcaklık 1')
  const sicaklik2  = g('Sıcaklık 2')
  const sicaklik3  = g('Sıcaklık 3')
  const sayac      = g('Sayaç')
  const vurus      = g('Vuruş Sayısı')
  const tonajSet   = g('Tonaj Set')
  const tonajAkt   = g('Tonaj Aktüel')

  const animSayac = useAnimatedValue(sayac)
  const animVurus = useAnimatedValue(vurus)

  // 60-point history for each temp
  const [hist, setHist] = useState([])
  const histRef = useRef([])
  useEffect(() => {
    const t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    histRef.current = [...histRef.current, {
      t,
      s1: +sicaklik1.toFixed(2),
      s2: +sicaklik2.toFixed(2),
      s3: +sicaklik3.toFixed(2),
    }].slice(-60)
    setHist([...histRef.current])
  }, [sicaklik1, sicaklik2, sicaklik3])

  const online = Object.values(statuses).filter(s => s === 'connected').length
  const running = vurus > 0
  const tonajPct = tonajSet > 0 ? Math.min((tonajAkt / tonajSet) * 100, 100) : 0
  const now = new Date().toLocaleString('tr-TR')

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      background: 'var(--bg-primary)',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: "'Inter', sans-serif"
    }}>

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: running ? '#22c55e' : '#64748b',
              boxShadow: running ? '0 0 10px #22c55e' : 'none',
              animation: running ? 'pulse 2s ease-in-out infinite' : 'none'
            }} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              PRES 1 &mdash; Monitoring
            </h1>
            <span style={{ fontSize: 11, color: running ? '#22c55e' : 'var(--text-muted)', fontWeight: 700,
              background: running ? 'rgba(34,197,94,0.1)' : 'var(--bg-tertiary)',
              padding: '2px 8px', borderRadius: 100, border: `1px solid ${running ? 'rgba(34,197,94,0.3)' : 'var(--border)'}` }}>
              {running ? 'ÇALIŞIYOR' : 'BEKLEMEDE'}
            </span>
          </div>
          <p style={{ margin: '2px 0 0 20px', fontSize: 12, color: 'var(--text-muted)' }}>
            Son güncelleme: {now}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeAlarms > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.4)', padding: '6px 14px', borderRadius: 8, color: '#ef4444' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{activeAlarms} Aktif Alarm</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            {online}/{devices.length} cihaz çevrimiçi
          </div>
        </div>
      </div>

      {/* ══ MAIN GRID ══════════════════════════════════════════ */}
      {/* Row 1: Arc meters + pulse counter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.4fr', gap: 14 }}>

        {/* Sıcaklık 1 */}
        <div style={{
          background: 'linear-gradient(145deg, #0d1b1e, #0a1a2e)',
          border: '1px solid rgba(20,184,166,0.2)',
          borderRadius: 16, padding: '20px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(20,184,166,0.06)'
        }}>
          <ArcMeter value={sicaklik1} min={0} max={150} color="#14b8a6" label="Sıcaklık 1" unit="°C" size={168} />
          <BarMetric label="Anlık" value={sicaklik1} max={150} unit="°C" color="#14b8a6" />
        </div>

        {/* Sıcaklık 2 */}
        <div style={{
          background: 'linear-gradient(145deg, #0d1422, #0a0f2a)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16, padding: '20px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(99,102,241,0.06)'
        }}>
          <ArcMeter value={sicaklik2} min={0} max={150} color="#6366f1" label="Sıcaklık 2" unit="°C" size={168} warn={60} danger={80} />
          <BarMetric label="Anlık" value={sicaklik2} max={150} unit="°C" color="#6366f1" />
        </div>

        {/* Sıcaklık 3 */}
        <div style={{
          background: 'linear-gradient(145deg, #1a1500, #120e00)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 16, padding: '20px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(245,158,11,0.06)'
        }}>
          <ArcMeter value={sicaklik3} min={0} max={150} color="#f59e0b" label="Sıcaklık 3" unit="°C" size={168} warn={65} danger={85} />
          <BarMetric label="Anlık" value={sicaklik3} max={150} unit="°C" color="#f59e0b" />
        </div>

        {/* VURUŞ + SAYAÇ cluster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Vuruş */}
          <div style={{
            background: 'linear-gradient(145deg, #120e22, #0d0a1a)',
            border: `1px solid ${running ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.1)'}`,
            borderRadius: 16, padding: '18px 20px', flex: 1,
            boxShadow: running ? '0 0 24px rgba(168,85,247,0.1)' : 'none',
            transition: 'border-color 0.4s, box-shadow 0.4s'
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
              Vuruş Sayısı
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 52, fontWeight: 900, lineHeight: 1,
                color: running ? '#a855f7' : 'var(--text-muted)',
                filter: running ? 'drop-shadow(0 0 12px #a855f7aa)' : 'none',
                transition: 'color 0.4s, filter 0.4s'
              }}>{Math.round(animVurus)}</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>spm</span>
            </div>
            {/* beat bar */}
            <div style={{ display: 'flex', gap: 3, marginTop: 10, height: 24, alignItems: 'flex-end' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  background: i < Math.round((vurus / 60) * 12) ? '#a855f7' : 'var(--bg-tertiary)',
                  height: `${30 + Math.sin(i * 0.9) * 70}%`,
                  transition: 'background 0.3s',
                  opacity: i < Math.round((vurus / 60) * 12) ? 1 : 0.3
                }} />
              ))}
            </div>
          </div>

          {/* Sayaç */}
          <div style={{
            background: 'linear-gradient(145deg, #0a1a1a, #061414)',
            border: '1px solid rgba(20,184,166,0.15)',
            borderRadius: 16, padding: '14px 20px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              Üretim Sayacı
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 900, color: '#14b8a6' }}>
                {Math.round(animSayac).toLocaleString('tr-TR')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>adet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Trend chart + Tonaj */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>

        {/* Sıcaklık Trend */}
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Sıcaklık Değişim Grafiği</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Son 60 ölçüm · Gerçek zamanlı</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700 }}>
              {[['Sıcaklık 1', '#14b8a6'], ['Sıcaklık 2', '#6366f1'], ['Sıcaklık 3', '#f59e0b']].map(([lbl, c]) => (
                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, color: c }}>
                  <span style={{ width: 20, height: 2, background: c, display: 'inline-block', borderRadius: 1 }} /> {lbl}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="t" hide />
              <YAxis fontSize={10} stroke="var(--text-muted)" tickLine={false} axisLine={false} domain={['auto','auto']} unit="°" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="s1" name="Sıcaklık 1" stroke="#14b8a6" strokeWidth={2} dot={false} isAnimationActive={false} unit="°C" />
              <Line type="monotone" dataKey="s2" name="Sıcaklık 2" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} unit="°C" />
              <Line type="monotone" dataKey="s3" name="Sıcaklık 3" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} unit="°C" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tonaj */}
        <div style={{
          background: 'linear-gradient(160deg, #12101e, #0a0916)',
          border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: 16, padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Tonaj Analizi
          </div>

          {/* Circular progress */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <svg width={160} height={160} viewBox="0 0 160 160">
              <defs>
                <linearGradient id="tGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              {/* Segments ring */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = (i * 10) - 90
                const active = i < Math.round(tonajPct / 100 * 36)
                const r = 64
                const a1 = toRad(angle), a2 = toRad(angle + 8)
                const x1 = 80 + r * Math.cos(a1), y1 = 80 + r * Math.sin(a1)
                const x2 = 80 + r * Math.cos(a2), y2 = 80 + r * Math.sin(a2)
                const xi1 = 80 + (r - 10) * Math.cos(a1), yi1 = 80 + (r - 10) * Math.sin(a1)
                const xi2 = 80 + (r - 10) * Math.cos(a2), yi2 = 80 + (r - 10) * Math.sin(a2)
                return (
                  <path key={i}
                    d={`M ${xi1} ${yi1} A ${r - 10} ${r - 10} 0 0 1 ${xi2} ${yi2} L ${x2} ${y2} A ${r} ${r} 0 0 0 ${x1} ${y1} Z`}
                    fill={active ? (tonajPct > 90 ? '#ef4444' : tonajPct > 75 ? '#f59e0b' : '#a855f7') : 'var(--bg-tertiary)'}
                    opacity={active ? 1 : 0.3}
                    style={{ transition: 'fill 0.3s' }}
                  />
                )
              })}
              <text x="80" y="72" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="900" fontFamily="JetBrains Mono, monospace">
                {tonajAkt}
              </text>
              <text x="80" y="90" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">TON</text>
              <text x="80" y="108" textAnchor="middle" fill="#a855f7" fontSize="13" fontWeight="800">%{tonajPct.toFixed(1)}</text>
            </svg>
          </div>

          {/* Set vs Aktüel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { lbl: 'Set Değeri', val: tonajSet, color: 'var(--text-muted)' },
              { lbl: 'Aktüel', val: tonajAkt, color: '#a855f7' },
            ].map(({ lbl, val, color }) => (
              <div key={lbl} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{lbl}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ton</div>
              </div>
            ))}
          </div>

          {/* Segment progress bar */}
          <div>
            <div style={{ display: 'flex', gap: 2, height: 8 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  background: i < Math.round(tonajPct / 5)
                    ? (tonajPct > 90 ? '#ef4444' : tonajPct > 75 ? '#f59e0b' : '#a855f7')
                    : 'var(--bg-tertiary)',
                  transition: 'background 0.4s'
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0 Ton</span><span>{tonajSet} Ton</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Device status strip */}
      {devices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(devices.length, 4)}, 1fr)`, gap: 10 }}>
          {devices.map(d => {
            const isOnline = statuses[d.id] === 'connected'
            return (
              <div key={d.id} style={{
                background: 'var(--bg-secondary)', border: `1px solid ${isOnline ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.3s'
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isOnline ? '#22c55e' : '#64748b',
                  boxShadow: isOnline ? '0 0 8px #22c55e' : 'none',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{d.ip}:{d.port}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                  color: isOnline ? '#22c55e' : 'var(--text-muted)' }}>
                  {isOnline ? 'BAĞLI' : 'KOPUK'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function toRad(deg) { return (deg * Math.PI) / 180 }
