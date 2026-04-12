import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import PropTypes from 'prop-types'

// Generate demo data for preview
function generateDemoData(count = 30) {
  let v = 50
  return Array.from({ length: count }, (_, i) => {
    v = Math.max(10, Math.min(90, v + (Math.random() - 0.5) * 12))
    return { t: i, value: +v.toFixed(1) }
  })
}

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0d1117ee',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 11,
    }}>
      <span style={{ color: payload[0].color, fontWeight: 700 }}>
        {payload[0].value}{unit}
      </span>
    </div>
  )
}

export default function LineChartWidget({ config = {}, isPreview = false }) {
  const {
    title      = 'Line Chart',
    showTitle  = true,
    lineColor  = '#3b82f6',
    yAxisUnit  = '',
    showDots   = false,
    showGrid   = true,
    pointCount = 30,
  } = config

  const data = useMemo(() => generateDemoData(Math.min(pointCount, 60)), [pointCount])

  if (isPreview) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '6px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
              <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 16px',
      gap: 8,
    }}>
      {showTitle && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {title}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.5} />
            )}
            <XAxis dataKey="t" hide />
            <YAxis
              fontSize={10}
              stroke="var(--text-muted)"
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              unit={yAxisUnit}
            />
            <Tooltip content={<CustomTooltip unit={yAxisUnit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={showDots ? { r: 3, fill: lineColor } : false}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 4px ${lineColor}66)` }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

LineChartWidget.propTypes = {
  config: PropTypes.object,
  isPreview: PropTypes.bool,
}
