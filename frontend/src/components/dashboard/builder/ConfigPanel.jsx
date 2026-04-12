import PropTypes from 'prop-types'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'
import { Trash2, X } from 'lucide-react'

// ── Reusable form controls ──────────────────────────────────────
function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      className="input"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontSize: 12, padding: '7px 10px' }}
    />
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onClick={() => onChange(!value)}
    >
      <div style={{
        width: 34,
        height: 18,
        borderRadius: 100,
        background: value ? 'var(--accent)' : 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 1,
          left: value ? 17 : 1,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          transition: 'left 0.2s',
        }} />
      </div>
      {label && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>}
    </div>
  )
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={value ?? '#3b82f6'}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 32,
          height: 28,
          borderRadius: 6,
          border: '1px solid var(--border)',
          cursor: 'pointer',
          background: 'transparent',
          padding: 2,
        }}
      />
      <input
        className="input"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{ fontSize: 12, padding: '6px 10px', fontFamily: 'monospace' }}
      />
    </div>
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text-primary)',
        fontSize: 12,
        padding: '7px 10px',
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function NumberInput({ value, onChange, min, max }) {
  return (
    <input
      type="number"
      className="input"
      value={value ?? 0}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      style={{ fontSize: 12, padding: '7px 10px' }}
    />
  )
}

// ── Widget-specific config panels ───────────────────────────────
function ValueCardConfig({ config, update }) {
  return (
    <>
      <Row label="Show Title">
        <Toggle value={config.showTitle} onChange={v => update({ showTitle: v })} label={config.showTitle ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showTitle && (
        <Row label="Title Text">
          <TextInput value={config.title} onChange={v => update({ title: v })} placeholder="Card title" />
        </Row>
      )}
      <Row label="Value">
        <TextInput value={config.value} onChange={v => update({ value: v })} placeholder="e.g. 2369" />
      </Row>
      <Row label="Show Unit">
        <Toggle value={config.showUnit} onChange={v => update({ showUnit: v })} label={config.showUnit ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showUnit && (
        <Row label="Unit Text">
          <TextInput value={config.unit} onChange={v => update({ unit: v })} placeholder="e.g. pcs, km/h" />
        </Row>
      )}
      <Row label="Font Size">
        <SelectInput value={config.fontSize} onChange={v => update({ fontSize: v })} options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large (default)' },
          { value: 'xl', label: 'Extra Large' },
        ]} />
      </Row>
      <Row label="Accent Color">
        <ColorInput value={config.accentColor} onChange={v => update({ accentColor: v })} />
      </Row>
    </>
  )
}

function LEDConfig({ config, update }) {
  return (
    <>
      <Row label="Show Label">
        <Toggle value={config.showLabel} onChange={v => update({ showLabel: v })} label={config.showLabel ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showLabel && (
        <Row label="Label Text">
          <TextInput value={config.label} onChange={v => update({ label: v })} placeholder="e.g. Motor Status" />
        </Row>
      )}
      <Row label="State">
        <Toggle value={config.state} onChange={v => update({ state: v })} label={config.state ? (config.onText || 'ON') : (config.offText || 'OFF')} />
      </Row>
      <Row label="ON Color">
        <ColorInput value={config.onColor} onChange={v => update({ onColor: v })} />
      </Row>
      <Row label="ON Text">
        <TextInput value={config.onText} onChange={v => update({ onText: v })} placeholder="e.g. RUNNING" />
      </Row>
      <Row label="OFF Color">
        <ColorInput value={config.offColor} onChange={v => update({ offColor: v })} />
      </Row>
      <Row label="OFF Text">
        <TextInput value={config.offText} onChange={v => update({ offText: v })} placeholder="e.g. STOPPED" />
      </Row>
      <Row label="LED Size">
        <SelectInput value={config.ledSize} onChange={v => update({ ledSize: v })} options={[
          { value: 'small',  label: 'Small' },
          { value: 'medium', label: 'Medium (default)' },
          { value: 'large',  label: 'Large' },
          { value: 'xl',     label: 'Extra Large' },
        ]} />
      </Row>
      <Row label="Blink when ON">
        <Toggle value={config.blink} onChange={v => update({ blink: v })} label={config.blink ? 'Enabled' : 'Disabled'} />
      </Row>
    </>
  )
}

function DonutConfig({ config, update }) {
  return (
    <>
      <Row label="Show Title">
        <Toggle value={config.showTitle} onChange={v => update({ showTitle: v })} label={config.showTitle ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showTitle && (
        <Row label="Title Text">
          <TextInput value={config.title} onChange={v => update({ title: v })} placeholder="Chart title" />
        </Row>
      )}
      <Row label="Current Value">
        <NumberInput value={config.value} onChange={v => update({ value: v })} min={0} />
      </Row>
      <Row label="Max Value">
        <NumberInput value={config.maxValue} onChange={v => update({ maxValue: v })} min={1} />
      </Row>
      <Row label="Unit">
        <TextInput value={config.unit} onChange={v => update({ unit: v })} placeholder="e.g. %, rpm" />
      </Row>
      <Row label="Sweep Angle">
        <SelectInput value={config.angle} onChange={v => update({ angle: Number(v) })} options={[
          { value: 270, label: '270° (open arc)' },
          { value: 360, label: '360° (full circle)' },
        ]} />
      </Row>
      <Row label="Color">
        <ColorInput value={config.color} onChange={v => update({ color: v })} />
      </Row>
      <Row label="Show Center Label">
        <Toggle value={config.showCenterLabel} onChange={v => update({ showCenterLabel: v })} label={config.showCenterLabel ? 'Visible' : 'Hidden'} />
      </Row>
      <Row label="Show as Percentage">
        <Toggle value={config.showPercentage} onChange={v => update({ showPercentage: v })} label={config.showPercentage ? 'Yes' : 'No'} />
      </Row>
    </>
  )
}

function LineChartConfig({ config, update }) {
  return (
    <>
      <Row label="Show Title">
        <Toggle value={config.showTitle} onChange={v => update({ showTitle: v })} label={config.showTitle ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showTitle && (
        <Row label="Title Text">
          <TextInput value={config.title} onChange={v => update({ title: v })} placeholder="Chart title" />
        </Row>
      )}
      <Row label="Line Color">
        <ColorInput value={config.lineColor} onChange={v => update({ lineColor: v })} />
      </Row>
      <Row label="Y-Axis Unit">
        <TextInput value={config.yAxisUnit} onChange={v => update({ yAxisUnit: v })} placeholder="e.g. °C, bar" />
      </Row>
      <Row label="Data Points">
        <NumberInput value={config.pointCount} onChange={v => update({ pointCount: v })} min={5} max={60} />
      </Row>
      <Row label="Show Grid Lines">
        <Toggle value={config.showGrid} onChange={v => update({ showGrid: v })} label={config.showGrid ? 'Visible' : 'Hidden'} />
      </Row>
      <Row label="Show Dots">
        <Toggle value={config.showDots} onChange={v => update({ showDots: v })} label={config.showDots ? 'Enabled' : 'Disabled'} />
      </Row>
    </>
  )
}

function TextWidgetConfig({ config, update }) {
  return (
    <>
      <Row label="Text Content">
        <textarea
          value={config.text ?? ''}
          onChange={e => update({ text: e.target.value })}
          placeholder="Type your text here…"
          rows={4}
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'inherit',
            padding: '8px 10px',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </Row>
      <Row label="Font Size">
        <SelectInput value={config.fontSize} onChange={v => update({ fontSize: v })} options={[
          { value: 'small',  label: 'Small (12px)' },
          { value: 'medium', label: 'Medium (14px)' },
          { value: 'large',  label: 'Large (18px)' },
          { value: 'xl',     label: 'Extra Large (24px)' },
        ]} />
      </Row>
      <Row label="Font Weight">
        <SelectInput value={config.fontWeight} onChange={v => update({ fontWeight: v })} options={[
          { value: 'normal',   label: 'Normal' },
          { value: 'semibold', label: 'Semi Bold' },
          { value: 'bold',     label: 'Bold' },
        ]} />
      </Row>
      <Row label="Alignment">
        <SelectInput value={config.align} onChange={v => update({ align: v })} options={[
          { value: 'left',   label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right',  label: 'Right' },
        ]} />
      </Row>
      <Row label="Text Color">
        <ColorInput value={config.color} onChange={v => update({ color: v })} />
      </Row>
      <Row label="Italic">
        <Toggle value={config.italic} onChange={v => update({ italic: v })} label={config.italic ? 'On' : 'Off'} />
      </Row>
      <Row label="Background Color">
        <ColorInput value={config.bgColor || '#1a2235'} onChange={v => update({ bgColor: v })} />
      </Row>
    </>
  )
}

const CONFIG_COMPONENTS = {
  ValueCard:       ValueCardConfig,
  LEDIndicator:    LEDConfig,
  DonutChart:      DonutConfig,
  LineChartWidget: LineChartConfig,
  TextWidget:      TextWidgetConfig,
}

// ── Main ConfigPanel ────────────────────────────────────────────
export default function ConfigPanel({ widgetId, onClose }) {
  const widgets      = useDashboardStore(s => s.widgets)
  const updateConfig = useDashboardStore(s => s.updateConfig)
  const removeWidget = useDashboardStore(s => s.removeWidget)

  const widget = widgets.find(w => w.id === widgetId)
  if (!widget) return null

  const ConfigForm = CONFIG_COMPONENTS[widget.type]
  const update = (patch) => updateConfig(widgetId, patch)

  return (
    <div style={{
      position: 'absolute',
      right: 260,
      top: 0,
      bottom: 0,
      width: 280,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
      animation: 'slideInRight 0.2s ease-out',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)' }}>
            Configure
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1 }}>
            {widget.type.replace(/([A-Z])/g, ' $1').trim()}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {ConfigForm ? (
          <ConfigForm config={widget.config} update={update} />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No configuration available.</div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => { removeWidget(widgetId); onClose() }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px',
            borderRadius: 8,
            border: '1px solid var(--danger)',
            background: 'var(--danger-muted)',
            color: 'var(--danger)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'inherit',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger)' || e.currentTarget.style.color === '#fff'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-muted)'}
        >
          <Trash2 size={13} />
          Delete Widget
        </button>
      </div>
    </div>
  )
}

ConfigPanel.propTypes = {
  widgetId: PropTypes.string,
  onClose:  PropTypes.func.isRequired,
}
