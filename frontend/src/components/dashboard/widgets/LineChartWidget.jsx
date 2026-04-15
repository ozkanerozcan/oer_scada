import { useMemo, useRef, useEffect, useState, useId } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import PropTypes from 'prop-types'
import useTagStore from '@/stores/tagStore'

// ── Demo data ─────────────────────────────────────────────────────
function generateDemoData(count = 30) {
  let v = 50
  return Array.from({ length: count }, (_, i) => {
    v = Math.max(10, Math.min(90, v + (Math.random() - 0.5) * 12))
    return { t: i, value: +v.toFixed(1) }
  })
}

// ── Dual-series builder ───────────────────────────────────────────
// Splits data into:
//   value  = in-range value  (null when out of range)
//   viol   = violation value (null when in range)
//
// At every transition between states we "share" the boundary point in
// BOTH series so the two lines connect seamlessly — no gap at crossing.
function buildDualSeries(data, yMin, yMax) {
  const isViol = v =>
    Number.isFinite(v) &&
    ((yMin !== null && v < yMin) || (yMax !== null && v > yMax))

  if (yMin === null && yMax === null) {
    return data.map(d => ({ t: d.t, value: d.value, viol: null }))
  }

  const result = data.map(d => ({
    t:     d.t,
    value: isViol(d.value) ? null : d.value,
    viol:  isViol(d.value) ? d.value : null,
  }))

  // Share the boundary point so both series overlap at every crossing.
  for (let i = 1; i < data.length; i++) {
    const prevViol = isViol(data[i - 1].value)
    const currViol = isViol(data[i].value)
    if (prevViol && !currViol) {
      // viol → normal: add previous point to normal series so the normal
      // line starts right from the last violation point (no gap).
      result[i - 1].value = data[i - 1].value
    }
    if (!prevViol && currViol) {
      // normal → viol: add previous point to violation series so the
      // violation line starts right from the last normal point (no gap).
      result[i - 1].viol = data[i - 1].value
    }
  }

  return result
}

// ── Tooltip ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, unit, yMin, yMax }) => {
  if (!active || !payload?.length) return null
  // pick whichever series has a value in this slot
  const entry = payload.find(p => p.value != null) ?? payload[0]
  const v = entry?.value
  if (v == null) return null
  const bad = (yMin !== null && v < yMin) || (yMax !== null && v > yMax)
  return (
    <div style={{
      background: '#0d1117ee',
      border: `1px solid ${bad ? '#ef4444' : 'var(--border)'}`,
      borderRadius: 8, padding: '6px 10px', fontSize: 11,
    }}>
      <span style={{ color: bad ? '#ef4444' : entry.stroke, fontWeight: 700 }}>
        {v}{unit}
      </span>
      {bad && <span style={{ color: '#ef4444', fontSize: 9, marginLeft: 6, fontWeight: 700 }}>⚠ LIMIT</span>}
    </div>
  )
}

// ── Resolve a numeric bound from tag store or static config ───────
function useResolvedBound(tagKey, staticVal) {
  return useTagStore(s => {
    if (tagKey) {
      const entry = s.values[tagKey]
      if (entry) {
        const n = Number(entry.value)
        if (Number.isFinite(n)) return n
      }
    }
    if (staticVal !== null && staticVal !== undefined) {
      const n = Number(staticVal)
      if (Number.isFinite(n)) return n
    }
    return null
  })
}

export default function LineChartWidget({ config = {}, isPreview = false }) {
  const {
    title      = 'Line Chart',
    showTitle  = true,
    tagKey     = '',
    lineColor  = '#3b82f6',
    yAxisUnit  = '',
    showDots   = false,
    showGrid   = true,
    pointCount = 30,
    yMinTagKey = '',
    yMinValue  = null,
    yMaxTagKey = '',
    yMaxValue  = null,
  } = config

  const safePoints     = Math.min(Math.max(pointCount, 5), 120)
  const violationColor = '#ef4444'
  const limitColor     = '#f59e0b'

  // ── Resolved bounds ────────────────────────────────────────────
  const yMin = useResolvedBound(yMinTagKey, yMinValue)
  const yMax = useResolvedBound(yMaxTagKey, yMaxValue)

  // ── Rolling live data buffer ───────────────────────────────────
  const liveEntry = useTagStore(s => tagKey ? s.values[tagKey] : null)
  const bufferRef = useRef([])
  const tickRef   = useRef(0)
  const [liveData, setLiveData] = useState([])

  useEffect(() => {
    if (!tagKey || !liveEntry) return
    const n = Number(liveEntry.value)
    if (!Number.isFinite(n)) return
    tickRef.current += 1
    const pt = { t: tickRef.current, value: parseFloat(n.toFixed(4)) }
    bufferRef.current = [...bufferRef.current, pt].slice(-safePoints)
    setLiveData([...bufferRef.current])
  }, [liveEntry, tagKey, safePoints])

  useEffect(() => {
    bufferRef.current = []
    tickRef.current   = 0
    setLiveData([])
  }, [tagKey])

  // ── Data source ────────────────────────────────────────────────
  const demoData  = useMemo(() => generateDemoData(safePoints), [safePoints])
  const rawData   = tagKey ? liveData : demoData

  // ── Effective Y domain (must encompass data AND thresholds) ────
  const dataValues = rawData.map(d => d.value).filter(Number.isFinite)
  const rawMin = dataValues.length ? Math.min(...dataValues) : 0
  const rawMax = dataValues.length ? Math.max(...dataValues) : 100
  const pad    = Math.max((rawMax - rawMin) * 0.08, 1)
  const domainMin = Math.min(rawMin - pad, yMin !== null ? yMin - pad * 0.5 : Infinity)
  const domainMax = Math.max(rawMax + pad, yMax !== null ? yMax + pad * 0.5 : -Infinity)

  // ── Split into normal + violation series ───────────────────────
  const chartData = useMemo(
    () => buildDualSeries(rawData, yMin, yMax),
    [rawData, yMin, yMax]
  )

  // ── Current violation status (for badge) ──────────────────────
  const lastValue   = liveData.at(-1)?.value ?? null
  const isViolating = lastValue !== null && (
    (yMin !== null && lastValue < yMin) ||
    (yMax !== null && lastValue > yMax)
  )

  // ── Dot renderer — colors each dot by its own violation status ─
  const makeDot = (color) => (props) => {
    const { cx, cy, value } = props
    if (value == null) return null
    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke="none" />
  }

  // ── Preview ────────────────────────────────────────────────────
  if (isPreview) {
    const previewData = generateDemoData(20)
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '6px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={previewData} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
              <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const noData = tagKey && liveData.length === 0

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 8 }}>
      {showTitle && (
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--text-muted)',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {title}
          {tagKey && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: isViolating ? violationColor : '#14b8a6',
              background: isViolating ? 'rgba(239,68,68,0.1)' : 'rgba(20,184,166,0.1)',
              padding: '1px 6px', borderRadius: 4, transition: 'color 0.3s, background 0.3s',
            }}>
              {isViolating ? '⚠ LIMIT' : 'LIVE'}
            </span>
          )}
        </div>
      )}

      {noData ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, opacity: 0.4 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Waiting for data…</div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tagKey}</div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              {showGrid && (
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.5} />
              )}
              <XAxis dataKey="t" hide />
              <YAxis
                fontSize={10}
                stroke="var(--text-muted)"
                tickLine={false}
                axisLine={false}
                domain={[domainMin, domainMax]}
                unit={yAxisUnit}
              />
              <Tooltip content={<CustomTooltip unit={yAxisUnit} yMin={yMin} yMax={yMax} />} />

              {/* ── Max reference line ── */}
              {yMax !== null && (
                <ReferenceLine
                  y={yMax}
                  stroke={limitColor}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  label={{
                    value: `Max: ${yMax}${yAxisUnit}`,
                    position: 'insideTopRight',
                    fontSize: 9, fontWeight: 700,
                    fill: limitColor, dy: -4,
                  }}
                />
              )}

              {/* ── Min reference line ── */}
              {yMin !== null && (
                <ReferenceLine
                  y={yMin}
                  stroke={limitColor}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  label={{
                    value: `Min: ${yMin}${yAxisUnit}`,
                    position: 'insideBottomRight',
                    fontSize: 9, fontWeight: 700,
                    fill: limitColor, dy: 4,
                  }}
                />
              )}

              {/* ── Normal (in-range) line ── */}
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={showDots ? makeDot(lineColor) : false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={false}
                style={{ filter: `drop-shadow(0 0 4px ${lineColor}66)` }}
              />

              {/* ── Violation (out-of-range) line — rendered on top ── */}
              <Line
                type="monotone"
                dataKey="viol"
                stroke={violationColor}
                strokeWidth={2}
                dot={showDots ? makeDot(violationColor) : false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={false}
                style={{ filter: `drop-shadow(0 0 6px ${violationColor}88)` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

LineChartWidget.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
