import PropTypes from 'prop-types'
import { useEffect } from 'react'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'
import useWatchStore from '@/stores/watchStore'
import { Trash2, X, Unlink, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'

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

const FONT_FAMILIES = [
  { value: 'Inter',       label: 'Inter' },
  { value: 'Rajdhani',    label: 'Rajdhani' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
  { value: 'Orbitron',    label: 'Orbitron' },
  { value: 'IBM Plex Sans', label: 'IBM Plex' },
];

function RichTextEditor({ field = 'text', prefix = '', config, update, label = "Text Content" }) {
  const getK = (k) => prefix ? `${prefix}${k.charAt(0).toUpperCase() + k.slice(1)}` : k;
  
  const get = (k) => config[getK(k)];
  const set = (k, v) => update({ [getK(k)]: v });
  const toggle = (k) => update({ [getK(k)]: !get(k) });

  const btnStyle = (active) => ({
    padding: 4, borderRadius: 4, border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s'
  });

  const selectStyle = {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: 4,
    color: 'var(--text-primary)', fontSize: 11, padding: '2px 4px', outline: 'none', cursor: 'pointer'
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>
        {label}
      </label>
      
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
        
        {/* Toolbar Row 1: Font Family, Size, Color */}
        <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={get('fontFamily') || 'Inter'} onChange={e => set('fontFamily', e.target.value)} style={{ ...selectStyle, flex: 1, minWidth: 70 }}>
             {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <input 
            type="number" placeholder="px" title="Custom Font Size (px). Leave empty for auto."
            value={get('fontSizePx') ?? ''} 
            onChange={e => set('fontSizePx', e.target.value ? Number(e.target.value) : null)}
            style={{ ...selectStyle, width: 45 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }} title="Text Color">
             <input type="color" value={get('color') || ''} onChange={e => set('color', e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
          </div>
        </div>

        {/* Toolbar Row 2: Formatting */}
        <div style={{ display: 'flex', gap: 2, padding: '4px 6px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button title="Bold" style={btnStyle(get('fontWeight') === 'bold' || get('fontWeight') === 'extrabold')} onClick={() => set('fontWeight', get('fontWeight') === 'bold' ? 'normal' : 'bold')}><Bold size={13} /></button>
          <button title="Italic" style={btnStyle(get('italic'))} onClick={() => toggle('italic')}><Italic size={13} /></button>
          <button title="Underline" style={btnStyle(get('underline'))} onClick={() => toggle('underline')}><UnderlineIcon size={13} /></button>
          
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
          
          <button title="Align Left" style={btnStyle(get('align') === 'left' || !get('align'))} onClick={() => set('align', 'left')}><AlignLeft size={13} /></button>
          <button title="Align Center" style={btnStyle(get('align') === 'center')} onClick={() => set('align', 'center')}><AlignCenter size={13} /></button>
          <button title="Align Right" style={btnStyle(get('align') === 'right')} onClick={() => set('align', 'right')}><AlignRight size={13} /></button>
          <button title="Justify" style={btnStyle(get('align') === 'justify')} onClick={() => set('align', 'justify')}><AlignJustify size={13} /></button>
        </div>

        <textarea
          value={config[field] ?? ''}
          onChange={e => update({ [field]: e.target.value })}
          placeholder="Type here…"
          rows={3}
          style={{
            width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)',
            fontSize: 12, fontFamily: 'inherit', padding: '8px 10px', outline: 'none',
            resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
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
        <RichTextEditor field="title" prefix="title" config={config} update={update} label="Title Text" />
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
      <Row label="Padding (px)">
        <NumberInput value={config.paddingPx} onChange={v => update({ paddingPx: v })} placeholder="Auto" />
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

      <Row label="Show Title">
        <Toggle value={config.showTitle ?? config.showLabel ?? true} onChange={v => update({ showTitle: v })} label={(config.showTitle ?? config.showLabel ?? true) ? 'Visible' : 'Hidden'} />
      </Row>
      {(config.showTitle ?? config.showLabel ?? true) && (
        <RichTextEditor field="title" prefix="title" config={{ ...config, title: config.title ?? config.label ?? 'Status' }} update={update} label="Title Text" />
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
      <Row label="Padding (px)">
        <NumberInput value={config.paddingPx} onChange={v => update({ paddingPx: v })} placeholder="Auto" />
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
        <RichTextEditor field="title" prefix="title" config={config} update={update} label="Chart Title" />
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
      <Row label="Padding (px)">
        <NumberInput value={config.paddingPx} onChange={v => update({ paddingPx: v })} placeholder="Auto" />
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
        <RichTextEditor field="title" prefix="title" config={config} update={update} label="Chart Title" />
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
      <Row label="Padding (px)">
        <NumberInput value={config.paddingPx} onChange={v => update({ paddingPx: v })} placeholder="Auto" />
      </Row>
    </>
  )
}

function TextWidgetConfig({ config, update }) {
  return (
    <>
      <RichTextEditor field="text" prefix="" config={config} update={update} label="Text Content" />
      <Row label="Background Color">
        <ColorInput value={config.bgColor || '#1a2235'} onChange={v => update({ bgColor: v })} />
      </Row>

      <Row label="Padding (px)">
        <NumberInput value={config.paddingPx} onChange={v => update({ paddingPx: v })} placeholder="Auto" />
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
