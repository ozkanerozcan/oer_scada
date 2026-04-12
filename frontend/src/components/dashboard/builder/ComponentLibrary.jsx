import PropTypes from 'prop-types'
import ValueCard from '../widgets/ValueCard'
import LEDIndicator from '../widgets/LEDIndicator'
import DonutChart from '../widgets/DonutChart'
import LineChartWidget from '../widgets/LineChartWidget'
import TextWidget from '../widgets/TextWidget'

const LIBRARY_ITEMS = [
  {
    type: 'ValueCard',
    label: 'Value Card',
    description: 'Display a numeric value with optional title and unit',
    category: 'Metrics',
    component: ValueCard,
    defaultConfig: {},
    previewW: 140,
    previewH: 80,
  },
  {
    type: 'LEDIndicator',
    label: 'LED Indicator',
    description: 'Status light showing ON/OFF state',
    category: 'Status',
    component: LEDIndicator,
    defaultConfig: {},
    previewW: 80,
    previewH: 80,
  },
  {
    type: 'DonutChart',
    label: 'Donut Chart',
    description: 'Ring chart with configurable 270° or 360° angle',
    category: 'Charts',
    component: DonutChart,
    defaultConfig: {},
    previewW: 80,
    previewH: 80,
  },
  {
    type: 'LineChartWidget',
    label: 'Line Chart',
    description: 'Time-series trend chart',
    category: 'Charts',
    component: LineChartWidget,
    defaultConfig: {},
    previewW: 140,
    previewH: 70,
  },
  {
    type: 'TextWidget',
    label: 'Text',
    description: 'Display a free-form text label or note',
    category: 'Content',
    component: TextWidget,
    defaultConfig: {},
    previewW: 200,
    previewH: 50,
  },
]

const CATEGORY_COLORS = {
  Metrics: '#3b82f6',
  Status:  '#22c55e',
  Charts:  '#a855f7',
  Content: '#f59e0b',
}

export default function ComponentLibrary({ onDragStart }) {
  const categories = [...new Set(LIBRARY_ITEMS.map(i => i.category))]

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 4 }}>
          Component Library
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Drag widgets onto the canvas
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 20 }}>
            {/* Category header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: CATEGORY_COLORS[cat] || '#3b82f6',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}>
                {cat}
              </span>
            </div>

            {/* Cards */}
            {LIBRARY_ITEMS.filter(i => i.category === cat).map(item => {
              const Preview = item.component
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('widgetType', item.type)
                    onDragStart && onDragStart(item.type)
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    marginBottom: 8,
                    padding: '10px',
                    cursor: 'grab',
                    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.12)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Preview */}
                  <div style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 8,
                    height: item.previewH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <div style={{ width: item.previewW, height: item.previewH }}>
                      <Preview config={{}} isPreview />
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        fontSize: 11,
        color: 'var(--text-muted)',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Drag to place · Click to configure · Resize from edges
      </div>
    </div>
  )
}

ComponentLibrary.propTypes = {
  onDragStart: PropTypes.func,
}
