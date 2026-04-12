import { useState, useEffect, useRef } from 'react'
import useTagStore from '@/stores/tagStore'
import useDeviceStore from '@/stores/deviceStore'
import useAlarmStore from '@/stores/alarmStore'
import { X } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { useFullscreen } from '@/hooks/useFullscreen'

const k = (tag) => `PRes1.Press_500T.${tag}`

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

function MinimalistArcMeter({ value = 0, min = 0, max = 100, color = '#14b8a6', label, unit, size = 140, history = [] }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1)
  const R = size * 0.4
  const cx = size / 2
  const cy = size / 2 + size * 0.1
  const startAngle = -200
  const sweepAngle = 220
  const toRad = (deg) => (deg * Math.PI) / 180
  const arcPt = (deg) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy + R * Math.sin(toRad(deg))
  })
  const endAngle = startAngle + sweepAngle * pct
  const [s1, e1] = [arcPt(startAngle), arcPt(endAngle)]
  const [sbg1, sbg2] = [arcPt(startAngle), arcPt(startAngle + sweepAngle)]
  const largeArc = sweepAngle * pct > 180 ? 1 : 0
  const largeBg = sweepAngle > 180 ? 1 : 0
  const animVal = useAnimatedValue(value)

  const bgPath = `M ${sbg1.x} ${sbg1.y} A ${R} ${R} 0 ${largeBg} 1 ${sbg2.x} ${sbg2.y}`
  const fgPath = pct > 0
    ? `M ${s1.x} ${s1.y} A ${R} ${R} 0 ${largeArc} 1 ${e1.x} ${e1.y}`
    : ''

  const sparklineWidth = size * 0.8
  const sparklineHeight = 24
  const sparklinePath = history.length > 1
    ? history.map((v, i) => {
        const x = (i / (history.length - 1)) * sparklineWidth
        const y = sparklineHeight - ((v - min) / (max - min)) * sparklineHeight
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
    : ''

  const minVal = history.length > 0 ? Math.min(...history) : value
  const maxVal = history.length > 0 ? Math.max(...history) : value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} overflow="visible">
        <path d={bgPath} fill="none" stroke="var(--bg-tertiary)" strokeWidth={8} strokeLinecap="round" />
        {fgPath && (
          <path d={fgPath} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}66)`, transition: 'stroke 0.3s' }}
          />
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)"
          fontSize={size * 0.14} fontWeight="800" fontFamily="'JetBrains Mono', monospace">
          {Number(animVal).toFixed(value % 1 === 0 ? 0 : 1)}
        </text>
        <text x={cx} y={cy + size * 0.08} textAnchor="middle" fill="var(--text-muted)"
          fontSize={size * 0.065} fontWeight="600">
          {unit}
        </text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      {sparklinePath && (
        <svg width={sparklineWidth} height={sparklineHeight} viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}>
          <path d={sparklinePath} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
        </svg>
      )}
      <div style={{ display: 'flex', gap: 12, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
        <span>Min: {minVal.toFixed(1)}</span>
        <span>Max: {maxVal.toFixed(1)}</span>
      </div>
    </div>
  )
}

function KPICard({ title, value, unit, target, color, trend, subtitle, isMobile = false }) {
  const animValue = useAnimatedValue(value)
  const pct = target ? Math.min((value / target) * 100, 100) : 0
  const trendUp = trend === 'up'
  const trendDown = trend === 'down'

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: isMobile ? '14px 16px' : '16px 20px',
      minHeight: isMobile ? 100 : 120,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </div>
          {trendUp && <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--success)' }}>↑</span>}
          {trendDown && <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--danger)' }}>↓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color, fontFamily: `'JetBrains Mono', monospace` }}>
            {Number(animValue).toFixed(value % 1 === 0 ? 0 : 1)}
          </span>
          <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', fontWeight: 600 }}>{unit}</span>
        </div>
        {subtitle && (
          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {target && (
        <div>
          <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 9 : 10, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>{pct.toFixed(0)}%</span>
            <span>Target: {target}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function OEECard({ availability, performance, quality, isMobile = false }) {
  const oee = (availability * performance * quality) / 10000
  const animOEE = useAnimatedValue(oee)

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: isMobile ? '16px' : '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 12 : 16
    }}>
      <div>
        <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          OEE
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: isMobile ? 32 : 42, fontWeight: 800, color: 'var(--accent)', fontFamily: `'JetBrains Mono', monospace` }}>
            {animOEE.toFixed(1)}
          </span>
          <span style={{ fontSize: isMobile ? 12 : 14, color: 'var(--text-muted)', fontWeight: 600 }}>%</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
        <MetricBar label="Availability" value={availability} color="var(--success)" isMobile={isMobile} />
        <MetricBar label="Performance" value={performance} color="var(--accent)" isMobile={isMobile} />
        <MetricBar label="Quality" value={quality} color="var(--teal)" isMobile={isMobile} />
      </div>
    </div>
  )
}

function MetricBar({ label, value, color, isMobile = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 9 : 10, fontWeight: 600 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function TimeRangeToggle({ selected, onChange, isMobile = false }) {
  const ranges = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' }
  ]

  return (
    <div style={{ display: 'flex', gap: isMobile ? 4 : 6, background: 'var(--bg-tertiary)', padding: isMobile ? 2 : 3, borderRadius: 8 }}>
      {ranges.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          style={{
            padding: isMobile ? '8px 14px' : '6px 12px',
            fontSize: isMobile ? 10 : 11,
            fontWeight: 700,
            borderRadius: 6,
            border: 'none',
            background: selected === r.value ? 'var(--bg-secondary)' : 'transparent',
            color: selected === r.value ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            minHeight: isMobile ? 44 : undefined,
            minWidth: isMobile ? 44 : undefined
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

function ChartTypeSelector({ selected, onChange, isMobile = false }) {
  const types = [
    { label: 'Line', value: 'line' },
    { label: 'Area', value: 'area' },
    { label: 'Step', value: 'step' }
  ]

  return (
    <div style={{ display: 'flex', gap: isMobile ? 4 : 4 }}>
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={{
            padding: isMobile ? '8px 12px' : '5px 10px',
            fontSize: isMobile ? 10 : 10,
            fontWeight: 700,
            borderRadius: 6,
            border: selected === t.value ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: selected === t.value ? 'var(--accent-muted)' : 'transparent',
            color: selected === t.value ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            minHeight: isMobile ? 44 : undefined,
            minWidth: isMobile ? 44 : undefined
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{Number(p.value).toFixed(1)}{p.unit}</span>
        </div>
      ))}
    </div>
  )
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) setMatches(media.matches)
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])
  return matches
}

export default function Press500TDashboard() {
  const values = useTagStore(s => s.values)
  const devices = useDeviceStore(s => s.devices)
  const statuses = useDeviceStore(s => s.statuses)
  const activeAlarms = useAlarmStore(s => s.getActiveCount())
  const isFullscreen = useFullscreen()

  const isMobile = useMediaQuery('(max-width: 639px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const g = (tag) => values[k(tag)]?.value ?? 0

  const operatingMode = g('Operating Mode')
  const ready = g('Ready')
  const mainMotorRun = g('Main Motor Running')
  const lubricRun = g('Lubrication Running')
  const motorSpeed = g('Main Motor Speed')
  const motorCurrent = g('Main Motor Current')
  const speedAct = g('Speed Actual')
  const speedSet = g('Speed Set')
  const angle = g('Angle')
  const regulationPosition = g('Regulation Position')
  const pressureBar = g('Pressure Actual Bar')
  const pressureTon = g('Pressure Actual Ton')
  const lastTonnage = g('Last Tonnage')
  const limitTonnage = g('Set Limit Tonnage')
  const counterDes = g('Counter Desired')
  const counterAct = g('Counter Aktüel')
  const temp1 = g('Crank Temperature 1')
  const temp2 = g('Crank Temperature 2')
  const temp3 = g('Crank Temperature 3')
  const temp4 = g('Crank Temperature 4')

  const animCounterAct = useAnimatedValue(counterAct)
  const animSpeedAct = useAnimatedValue(speedAct)
  const animMotorSpeed = useAnimatedValue(motorSpeed)
  const animMotorCurrent = useAnimatedValue(motorCurrent)
  const animPressureBar = useAnimatedValue(pressureBar)
  const animPressureTon = useAnimatedValue(pressureTon)
  const animRegPosition = useAnimatedValue(regulationPosition)

  const [tempHist, setTempHist] = useState([])
  const [speedTonnageHist, setSpeedTonnageHist] = useState([])
  const [timeRange, setTimeRange] = useState('5m')
  const [chartType, setChartType] = useState('line')
  const tempHistRef = useRef([])
  const speedTonnageHistRef = useRef([])
  const tempHistoryRef = useRef({ t1: [], t2: [], t3: [], t4: [] })

  useEffect(() => {
    const t = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    tempHistoryRef.current.t1.push(temp1)
    tempHistoryRef.current.t2.push(temp2)
    tempHistoryRef.current.t3.push(temp3)
    tempHistoryRef.current.t4.push(temp4)

    const maxHistory = timeRange === '1m' ? 60 : timeRange === '5m' ? 300 : timeRange === '15m' ? 900 : 3600
    if (tempHistoryRef.current.t1.length > maxHistory) {
      tempHistoryRef.current.t1.shift()
      tempHistoryRef.current.t2.shift()
      tempHistoryRef.current.t3.shift()
      tempHistoryRef.current.t4.shift()
    }

    tempHistRef.current = [...tempHistRef.current, {
      t,
      t1: +temp1.toFixed(2),
      t2: +temp2.toFixed(2),
      t3: +temp3.toFixed(2),
      t4: +temp4.toFixed(2)
    }].slice(-maxHistory)
    setTempHist([...tempHistRef.current])

    speedTonnageHistRef.current = [...speedTonnageHistRef.current, {
      t,
      speed: +speedAct.toFixed(1),
      tonnage: +pressureTon.toFixed(1)
    }].slice(-maxHistory)
    setSpeedTonnageHist([...speedTonnageHistRef.current])
  }, [temp1, temp2, temp3, temp4, speedAct, pressureTon, timeRange])

  const modes = ['OFF', 'INCH', 'TEK ÇEVRİM', 'CONTINUOUS']
  const modeName = modes[operatingMode] || 'UNKNOWN'
  const isPRes1Online = statuses[devices.find(d => d.name === 'PRes1')?.id] === 'connected'

  const productionPct = counterDes > 0 ? (counterAct / counterDes) * 100 : 0
  const efficiency = speedSet > 0 ? (speedAct / speedSet) * 100 : 0
  const utilization = mainMotorRun ? 100 : 0
  const cycleTime = speedAct > 0 ? 60 / speedAct : 0
  const quality = 98
  const oee = (utilization * efficiency * quality) / 10000

  const tempStats = tempHist.length > 0 ? {
    min: Math.min(...tempHist.map(h => Math.min(h.t1, h.t2, h.t3, h.t4))),
    max: Math.max(...tempHist.map(h => Math.max(h.t1, h.t2, h.t3, h.t4))),
    avg: tempHist.reduce((sum, h) => sum + (h.t1 + h.t2 + h.t3 + h.t4) / 4, 0) / tempHist.length
  } : { min: 0, max: 0, avg: 0 }

  const gapSize = isMobile ? 12 : 24
  const paddingSize = isMobile ? '12px 16px' : '20px 24px'
  const cardPadding = isMobile ? '16px' : '24px'
  const meterSize = isMobile ? 120 : 140
  const chartHeight = isMobile ? 200 : 220
  const fontSizeHeader = isMobile ? 18 : 20
  const fontSizeDesc = isMobile ? 12 : 14
  const fontSizeCardTitle = isMobile ? 12 : 11
  const fontSizeKPIValue = isMobile ? 32 : 28
  const fontSizeKPIUnit = isMobile ? 14 : 12
  const fontSizeLabel = isMobile ? 12 : 11
  const fontSizeValue = isMobile ? 20 : 16

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .scrollable-toggles::-webkit-scrollbar {
          display: none;
        }
        .scrollable-toggles {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div style={{ padding: paddingSize, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 12 : 0, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: ready ? 'var(--success)' : 'var(--text-muted)',
              boxShadow: ready ? '0 0 8px var(--success)' : 'none',
              animation: ready ? 'pulse 2s ease-in-out infinite' : 'none'
            }} />
            <div>
              <h1 style={{ margin: 0, fontSize: fontSizeHeader, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Press 500T
              </h1>
              <p style={{ margin: 0, fontSize: fontSizeDesc, color: 'var(--text-muted)' }}>
                Real-time production monitoring and control
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {activeAlarms > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger-muted)', border: '1px solid var(--danger)', padding: isMobile ? '5px 10px' : '6px 12px', borderRadius: 8, color: 'var(--danger)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
                <span style={{ fontWeight: 700, fontSize: isMobile ? 11 : 12 }}>{activeAlarms} Active</span>
              </div>
            )}
            <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: isPRes1Online ? 'var(--success)' : 'var(--danger)', background: 'var(--bg-tertiary)', padding: isMobile ? '5px 10px' : '6px 12px', borderRadius: 8, border: '1px solid var(--border)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPRes1Online ? 'Online' : 'Offline'}
            </div>
            {isFullscreen && (
              <button
                onClick={() => document.exitFullscreen()}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: gapSize, marginBottom: 24 }}>
          <KPICard title="Daily Production" value={counterAct} unit="parts" target={counterDes} color="var(--accent)" trend="up" isMobile={isMobile} />
          <KPICard title="Efficiency" value={efficiency} unit="%" target={100} color="var(--teal)" trend={efficiency >= 80 ? 'up' : 'down'} isMobile={isMobile} />
          <KPICard title="OEE" value={oee} unit="%" target={85} color="var(--purple)" trend={oee >= 75 ? 'up' : 'down'} isMobile={isMobile} />
          <KPICard title="Utilization" value={utilization} unit="%" target={90} color="var(--success)" trend={utilization >= 85 ? 'up' : 'down'} isMobile={isMobile} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: gapSize, marginBottom: 24 }}>
          <OEECard availability={utilization} performance={efficiency} quality={quality} isMobile={isMobile} />
          <div className="card" style={{ padding: cardPadding, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Cycle Time
            </div>
            <div style={{ fontSize: fontSizeKPIValue, fontWeight: 800, color: 'var(--text-primary)', fontFamily: `'JetBrains Mono', monospace` }}>
              {cycleTime > 0 ? cycleTime.toFixed(2) : '0.00'}s
            </div>
            <MetricBar label="Target: 2.5s" value={cycleTime > 0 ? (2.5 / cycleTime) * 100 : 0} color="var(--accent)" isMobile={isMobile} />
          </div>
          <div className="card" style={{ padding: cardPadding, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Production Progress
            </div>
            <div style={{ fontSize: fontSizeKPIValue, fontWeight: 800, color: 'var(--text-primary)', fontFamily: `'JetBrains Mono', monospace` }}>
              {productionPct.toFixed(0)}%
            </div>
            <MetricBar label="Target Progress" value={productionPct} color="var(--success)" isMobile={isMobile} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: gapSize, marginBottom: 24 }}>
          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Main Motor</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Speed</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--teal)' }}>{Math.round(animMotorSpeed)} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>rpm</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((motorSpeed / 2000) * 100, 100)}%`, background: 'var(--teal)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Current</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--warning)' }}>{animMotorCurrent.toFixed(1)} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>A</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((motorCurrent / 100) * 100, 100)}%`, background: 'var(--warning)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: mainMotorRun ? 'var(--success)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: fontSizeLabel, fontWeight: 600, color: mainMotorRun ? 'var(--success)' : 'var(--text-muted)' }}>{mainMotorRun ? 'Running' : 'Stopped'}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Speed (SPM)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Actual</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--accent)' }}>{Math.round(animSpeedAct)} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>spm</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((speedAct / 100) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Set</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--text-primary)' }}>{speedSet} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>spm</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((speedSet / 100) * 100, 100)}%`, background: 'var(--text-muted)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Pressure</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Bar</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--purple)' }}>{Math.round(animPressureBar)} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>bar</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((pressureBar / 500) * 100, 100)}%`, background: 'var(--purple)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: fontSizeLabel, color: 'var(--text-muted)' }}>Ton</span>
                  <span style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--danger)' }}>{Math.round(animPressureTon)} <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ton</small></span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${limitTonnage > 0 ? Math.min((pressureTon / limitTonnage) * 100, 100) : 0}%`, background: 'var(--danger)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeCardTitle, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Regulation Position</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <div style={{ fontSize: fontSizeKPIValue, fontWeight: 900, color: 'var(--teal)', fontFamily: `'JetBrains Mono', monospace` }}>
                {animRegPosition.toFixed(2)}
              </div>
              <div style={{ fontSize: fontSizeKPIUnit, color: 'var(--text-muted)', fontWeight: 600 }}>mm</div>
              <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                <div style={{ height: '100%', width: `${Math.min((regulationPosition / 100) * 100, 100)}%`, background: 'var(--teal)', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: gapSize, marginBottom: 24 }}>
          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeLabel, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Tonnage Monitoring</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 8 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>Last Tonnage</div>
                  <div style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--text-primary)' }}>{lastTonnage} T</div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 8 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>Limit Tonnage</div>
                  <div style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--warning)' }}>{limitTonnage} T</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width={140} height={140} viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="var(--bg-tertiary)" strokeWidth={10} />
                  <circle cx="70" cy="70" r="60" fill="none" stroke="var(--purple)" strokeWidth={10}
                    strokeDasharray={Math.PI * 120}
                    strokeDashoffset={limitTonnage > 0 ? Math.PI * 120 * (1 - Math.min(pressureTon / limitTonnage, 1)) : Math.PI * 120}
                    strokeLinecap="round" transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dashoffset 0.6s' }} />
                  <text x="70" y="65" textAnchor="middle" fill="var(--text-primary)" fontSize={26} fontWeight="800">{pressureTon}</text>
                  <text x="70" y={88} textAnchor="middle" fill="var(--text-muted)" fontSize={12} fontWeight="600">TON</text>
                </svg>
              </div>
              <div style={{ textAlign: 'center', fontSize: fontSizeLabel, color: 'var(--text-muted)', fontWeight: 600 }}>
                {limitTonnage > 0 ? `${((pressureTon / limitTonnage) * 100).toFixed(1)}% of limit` : 'No limit set'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeLabel, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Production Counter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--accent-muted)', padding: '20px', borderRadius: 10, textAlign: 'center', border: '1px dashed var(--accent)' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>Actual</div>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--accent)', fontFamily: `'JetBrains Mono', monospace` }}>{Math.round(animCounterAct).toLocaleString('tr-TR')}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>Target: {counterDes.toLocaleString('tr-TR')}</div>
              </div>
              <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(productionPct, 100)}%`, background: 'var(--accent)', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizeLabel, fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>{counterDes > 0 ? `${counterDes - counterAct} remaining` : 'No target set'}</span>
                <span>{productionPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: gapSize, marginBottom: 24 }}>
          {[
            { temp: temp1, color: 'var(--teal)', label: 'Crank 1', history: tempHistoryRef.current.t1.slice(-20) },
            { temp: temp2, color: 'var(--accent)', label: 'Crank 2', history: tempHistoryRef.current.t2.slice(-20) },
            { temp: temp3, color: 'var(--warning)', label: 'Crank 3', history: tempHistoryRef.current.t3.slice(-20) },
            { temp: temp4, color: 'var(--danger)', label: 'Crank 4', history: tempHistoryRef.current.t4.slice(-20) }
          ].map((item, idx) => (
            <div key={idx} className="card" style={{
              padding: cardPadding,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <MinimalistArcMeter value={item.temp} min={0} max={120} color={item.color} label={item.label} unit="°C" size={meterSize} history={item.history} />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: gapSize, marginBottom: 24 }}>
          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: fontSizeLabel, fontWeight: 700, color: 'var(--text-primary)' }}>Temperature Trends</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Real-time crank temperature monitoring</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div className={isMobile ? 'scrollable-toggles' : ''} style={{ display: 'flex', gap: 12, overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 4 : 0 }}>
                  <TimeRangeToggle selected={timeRange} onChange={setTimeRange} isMobile={isMobile} />
                  <ChartTypeSelector selected={chartType} onChange={setChartType} isMobile={isMobile} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: fontSizeLabel, fontWeight: 700, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--teal)' }} /> T1
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} /> T2
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--warning)' }} /> T3
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)' }} /> T4
              </span>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={tempHist} margin={{ top: 0, right: 0, bottom: 0, left: isMobile ? -5 : -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="t" hide />
                <YAxis fontSize={isMobile ? 9 : 10} stroke="var(--text-muted)" tickLine={false} axisLine={false} domain={['auto', 'auto']} unit="°" />
                <Tooltip content={<CustomTooltip />} />
                <Line type={chartType} dataKey="t1" name="T1" stroke="var(--teal)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit="°C" />
                <Line type={chartType} dataKey="t2" name="T2" stroke="var(--accent)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit="°C" />
                <Line type={chartType} dataKey="t3" name="T3" stroke="var(--warning)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit="°C" />
                <Line type={chartType} dataKey="t4" name="T4" stroke="var(--danger)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit="°C" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: fontSizeLabel, fontWeight: 600, color: 'var(--text-muted)', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <span>Min: {tempStats.min.toFixed(1)}°C</span>
              <span>Max: {tempStats.max.toFixed(1)}°C</span>
              <span>Avg: {tempStats.avg.toFixed(1)}°C</span>
            </div>
          </div>

          <div className="card" style={{ padding: cardPadding, borderRadius: 16 }}>
            <div style={{ fontSize: fontSizeLabel, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Speed & Tonnage</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={speedTonnageHist} margin={{ top: 0, right: 0, bottom: 0, left: isMobile ? -5 : -8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="t" hide />
                <YAxis fontSize={isMobile ? 9 : 10} stroke="var(--text-muted)" tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="speed" name="Speed" stroke="var(--teal)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit=" spm" />
                <Line type="monotone" dataKey="tonnage" name="Tonnage" stroke="var(--purple)" strokeWidth={isMobile ? 1.5 : 2} dot={false} isAnimationActive={false} unit=" T" yAxisId="right" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: cardPadding, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {[
              { label: 'Ready', val: ready, color: 'var(--success)' },
              { label: 'Lube', val: lubricRun, color: 'var(--accent)' },
              { label: 'Motor', val: mainMotorRun, color: 'var(--purple)' },
              { label: 'Run', val: operatingMode > 0, color: 'var(--warning)' }
            ].map((s, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-tertiary)', padding: isMobile ? '8px 12px' : '6px 10px', borderRadius: 8, minHeight: 44
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.val ? s.color : 'var(--text-muted)' }} />
                <span style={{ fontSize: fontSizeLabel, fontWeight: 600, color: s.val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Stroke Angle</div>
              <div style={{ fontSize: fontSizeValue, fontWeight: 800, color: 'var(--text-primary)', fontFamily: `'JetBrains Mono', monospace` }}>{angle}°</div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', border: `3px solid var(--bg-tertiary)`, borderTopColor: 'var(--accent)', transform: `rotate(${angle}deg)`
            }} />
          </div>
        </div>
      </div>
    </>
  )
}
