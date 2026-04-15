import PropTypes from 'prop-types'
import { useEffect } from 'react'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'
import useWatchStore from '@/stores/watchStore'
import { Trash2, X, Unlink } from 'lucide-react'

// ── Shared watch-list hook ──────────────────────────────────────
// Fetches once on first use; subsequent callers get cached data immediately.
function useWatchList() {
  const items   = useWatchStore(s => s.items)
  const loading = useWatchStore(s => s.loading)
  const loaded  = useWatchStore(s => s.loaded)
  const fetchFn = useWatchStore(s => s.fetch)

  useEffect(() => {
    if (!loaded && !loading) fetchFn()
  }, [loaded, loading, fetchFn])

  return { watchItems: items, loadingWatch: loading }
}

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
  const { watchItems, loadingWatch } = useWatchList()

  return (
    <>
      {/* ── Tag Binding ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Current Value
      </div>
      <TagBindRow
        label="Bind value to tag"
        tagKey={config.tagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ tagKey: v })}
        staticInput={
          <input
            className="input"
            value={config.value ?? ''}
            onChange={e => update({ value: e.target.value })}
            placeholder="e.g. 2369"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

      <Row label="Show Title">
        <Toggle value={config.showTitle} onChange={v => update({ showTitle: v })} label={config.showTitle ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showTitle && (
        <Row label="Title Text">
          <TextInput value={config.title} onChange={v => update({ title: v })} placeholder="Card title" />
        </Row>
      )}
      <Row label="Show Unit">
        <Toggle value={config.showUnit} onChange={v => update({ showUnit: v })} label={config.showUnit ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showUnit && (
        <Row label="Unit Text">
          <TextInput value={config.unit} onChange={v => update({ unit: v })} placeholder="e.g. pcs, km/h" />
        </Row>
      )}

      <Row label="Accent Color">
        <ColorInput value={config.accentColor} onChange={v => update({ accentColor: v })} />
      </Row>
    </>
  )
}

function LEDConfig({ config, update }) {
  const { watchItems: allWatch, loadingWatch } = useWatchList()
  // LED only accepts Boolean tags
  const watchItems = allWatch.filter(w => {
    const dt = (w.dataType || '').toLowerCase()
    return dt === 'bool' || dt === 'boolean'
  })

  return (
    <>
      {/* ── Tag Binding ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Live State Source
      </div>
      <TagBindRow
        label="Bind state to tag (Boolean)"
        tagKey={config.tagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ tagKey: v })}
        emptyLabel={loadingWatch ? 'Loading…' : watchItems.length === 0 ? 'No boolean tags in watch list' : '— None (manual state) —'}
        staticInput={
          <div style={{ marginTop: 4 }}>
            <Toggle
              value={config.state}
              onChange={v => update({ state: v })}
              label={config.state ? (config.onText || 'ON') : (config.offText || 'OFF')}
            />
          </div>
        }
      />

      <Row label="Show Label">
        <Toggle value={config.showLabel} onChange={v => update({ showLabel: v })} label={config.showLabel ? 'Visible' : 'Hidden'} />
      </Row>
      {config.showLabel && (
        <Row label="Label Text">
          <TextInput value={config.label} onChange={v => update({ label: v })} placeholder="e.g. Motor Status" />
        </Row>
      )}
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

      <Row label="Blink when ON">
        <Toggle value={config.blink} onChange={v => update({ blink: v })} label={config.blink ? 'Enabled' : 'Disabled'} />
      </Row>
    </>
  )
}

// ── Shared tag-binding row — used by all widget config panels ───
// staticInput: JSX rendered below the dropdown when no tag is bound
// emptyLabel:  custom placeholder text for the "no tag" option
function TagBindRow({ label, tagKey, watchItems, loadingWatch, onTagChange, staticInput, emptyLabel }) {
  const bound = !!tagKey
  return (
    <div style={{
      background: bound
        ? 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(6,182,212,0.08))'
        : 'var(--bg-tertiary)',
      border: `1px solid ${bound ? 'rgba(20,184,166,0.35)' : 'var(--border)'}`,
      borderRadius: 10, padding: '10px 12px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: bound ? '#14b8a6' : 'var(--text-muted)' }}>
          {label}{bound ? ' 🔗' : ''}
        </div>
        {bound && (
          <button
            onClick={() => onTagChange('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
            title="Unbind tag"
          >
            <Unlink size={12} />
          </button>
        )}
      </div>

      {/* Tag selector */}
      <select
        value={tagKey || ''}
        onChange={e => onTagChange(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 11,
          padding: '5px 8px',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
          marginBottom: bound ? 0 : 4,
        }}
      >
        <option value="">{loadingWatch ? 'Loading…' : (emptyLabel || '— Static value —')}</option>
        {watchItems.map(w => (
          <option key={w.id} value={w.tagKey}>
            {w.tagKey}{w.dataType ? ` [${w.dataType}]` : ''}
          </option>
        ))}
        {watchItems.length === 0 && !loadingWatch && (
          <option disabled>No variables in watch list</option>
        )}
      </select>

      {/* Static fallback — shown when no tag is bound */}
      {!bound && staticInput}

      {/* Bound tag key display */}
      {bound && (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#14b8a6', wordBreak: 'break-all', lineHeight: 1.5, marginTop: 4 }}>
          {tagKey}
        </div>
      )}
    </div>
  )
}

function DonutConfig({ config, update }) {
  const { watchItems, loadingWatch } = useWatchList()

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

      {/* ── Current Value ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Current Value
      </div>
      <TagBindRow
        label="Bind value to tag"
        tagKey={config.tagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ tagKey: v })}
        staticInput={
          <input type="number" className="input"
            value={config.value ?? 0}
            onChange={e => update({ value: Number(e.target.value) })}
            placeholder="e.g. 65"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

      {/* ── Min Value ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Min Value
      </div>
      <TagBindRow
        label="Bind min to tag"
        tagKey={config.minTagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ minTagKey: v })}
        staticInput={
          <input type="number" className="input"
            value={config.minValue ?? 0}
            onChange={e => update({ minValue: Number(e.target.value) })}
            placeholder="e.g. 0"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

      {/* ── Max Value ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Max Value
      </div>
      <TagBindRow
        label="Bind max to tag"
        tagKey={config.maxTagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ maxTagKey: v })}
        staticInput={
          <input type="number" className="input"
            value={config.maxValue ?? 100}
            min={1}
            onChange={e => update({ maxValue: Number(e.target.value) })}
            placeholder="e.g. 100"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

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
        <Toggle value={config.showPercentage} onChange={v => update({ showPercentage: v })} label={config.showPercentage ? 'Yes — computed from min/max' : 'No — raw value'} />
      </Row>
    </>
  )
}

function LineChartConfig({ config, update }) {
  const { watchItems, loadingWatch } = useWatchList()

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

      {/* ── Current Value (data source) ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Data Source
      </div>
      <TagBindRow
        label="Bind value to tag"
        tagKey={config.tagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ tagKey: v })}
        emptyLabel={loadingWatch ? 'Loading…' : '— None (demo data) —'}
        staticInput={
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            No tag bound — demo data is shown.
          </div>
        }
      />

      {/* ── Y-Axis Min ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Y-Axis Min
      </div>
      <TagBindRow
        label="Bind Y-min to tag"
        tagKey={config.yMinTagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ yMinTagKey: v })}
        emptyLabel={loadingWatch ? 'Loading…' : '— Auto (fit data) —'}
        staticInput={
          <input
            type="number"
            className="input"
            value={config.yMinValue ?? ''}
            onChange={e => update({ yMinValue: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="Leave blank for auto"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

      {/* ── Y-Axis Max ── */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
        Y-Axis Max
      </div>
      <TagBindRow
        label="Bind Y-max to tag"
        tagKey={config.yMaxTagKey || ''}
        watchItems={watchItems}
        loadingWatch={loadingWatch}
        onTagChange={v => update({ yMaxTagKey: v })}
        emptyLabel={loadingWatch ? 'Loading…' : '— Auto (fit data) —'}
        staticInput={
          <input
            type="number"
            className="input"
            value={config.yMaxValue ?? ''}
            onChange={e => update({ yMaxValue: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="Leave blank for auto"
            style={{ fontSize: 12, padding: '5px 8px', marginTop: 4 }}
          />
        }
      />

      <Row label="Line Color">
        <ColorInput value={config.lineColor} onChange={v => update({ lineColor: v })} />
      </Row>
      <Row label="Y-Axis Unit">
        <TextInput value={config.yAxisUnit} onChange={v => update({ yAxisUnit: v })} placeholder="e.g. °C, bar" />
      </Row>
      <Row label="Data Points">
        <NumberInput value={config.pointCount} onChange={v => update({ pointCount: v })} min={5} max={120} />
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

const FONT_FAMILIES = [
  { value: 'Inter',       label: 'Inter — UI Standard' },
  { value: 'Rajdhani',    label: 'Rajdhani — Industrial / SCADA' },
  { value: 'Roboto Mono', label: 'Roboto Mono — Numeric / Data' },
  { value: 'Orbitron',    label: 'Orbitron — Futuristic / HMI' },
  { value: 'IBM Plex Sans', label: 'IBM Plex Sans — Professional' },
]

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

      {/* Font Family */}
      <Row label="Font Family">
        <SelectInput
          value={config.fontFamily || 'Inter'}
          onChange={v => update({ fontFamily: v })}
          options={FONT_FAMILIES}
        />
      </Row>

      {/* Font Size — preset OR custom px */}
      <Row label="Font Size">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <SelectInput
            value={config.fontSizePreset || 'medium'}
            onChange={v => update({ fontSizePreset: v, fontSizePx: null })}
            options={[
              { value: 'custom', label: 'Custom px…' },
              { value: 'small',  label: 'Small (12px)' },
              { value: 'medium', label: 'Medium (14px)' },
              { value: 'large',  label: 'Large (18px)' },
              { value: 'xl',     label: 'XL (24px)' },
              { value: 'xxl',    label: 'XXL (32px)' },
              { value: 'xxxl',   label: 'XXXL (48px)' },
            ]}
          />
          {(config.fontSizePreset === 'custom' || config.fontSizePx != null) && (
            <input
              type="number"
              className="input"
              value={config.fontSizePx ?? 14}
              min={8} max={200}
              onChange={e => update({ fontSizePx: Number(e.target.value), fontSizePreset: 'custom' })}
              style={{ fontSize: 12, padding: '7px 8px', width: 70, flexShrink: 0 }}
            />
          )}
        </div>
      </Row>

      <Row label="Font Weight">
        <SelectInput value={config.fontWeight} onChange={v => update({ fontWeight: v })} options={[
          { value: 'normal',   label: 'Normal (400)' },
          { value: 'semibold', label: 'Semi Bold (600)' },
          { value: 'bold',     label: 'Bold (700)' },
          { value: 'extrabold', label: 'Extra Bold (800)' },
        ]} />
      </Row>
      <Row label="Alignment">
        <SelectInput value={config.align} onChange={v => update({ align: v })} options={[
          { value: 'left',    label: 'Left' },
          { value: 'center',  label: 'Center' },
          { value: 'right',   label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ]} />
      </Row>
      <Row label="Text Color">
        <ColorInput value={config.color} onChange={v => update({ color: v })} />
      </Row>
      <Row label="Italic">
        <Toggle value={config.italic} onChange={v => update({ italic: v })} label={config.italic ? 'On' : 'Off'} />
      </Row>
      <Row label="Underline">
        <Toggle value={config.underline} onChange={v => update({ underline: v })} label={config.underline ? 'On' : 'Off'} />
      </Row>
      <Row label="Letter Spacing">
        <SelectInput value={config.letterSpacing || 'normal'} onChange={v => update({ letterSpacing: v })} options={[
          { value: 'normal',  label: 'Normal' },
          { value: 'tight',   label: 'Tight' },
          { value: 'wide',    label: 'Wide' },
          { value: 'widest',  label: 'Widest' },
        ]} />
      </Row>
      <Row label="Line Height">
        <SelectInput value={config.lineHeight || '1.6'} onChange={v => update({ lineHeight: v })} options={[
          { value: '1',    label: 'Single (1.0)' },
          { value: '1.25', label: 'Compact (1.25)' },
          { value: '1.6',  label: 'Normal (1.6)' },
          { value: '2',    label: 'Relaxed (2.0)' },
          { value: '2.5',  label: 'Double (2.5)' },
        ]} />
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
      width: 280,
      flexShrink: 0,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInFromLeft 0.2s ease-out',
    }}>
      <style>{`
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-20px); }
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
