import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Eye, Trash2, Save, LayoutTemplate, RefreshCw, Copy, Clipboard, X } from 'lucide-react'
import WidgetCanvas from '@/components/dashboard/builder/WidgetCanvas'
import ComponentLibrary from '@/components/dashboard/builder/ComponentLibrary'
import ConfigPanel from '@/components/dashboard/builder/ConfigPanel'
import AdminGuard from '@/components/common/AdminGuard'
import useDashboardStore from './useDashboardStore'
import useDashboardPagesStore from '@/stores/dashboardPagesStore'

// ── Keyboard hint pill ───────────────────────────────────────────
function KbdHint({ keys, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {keys.map((k, i) => (
        <span key={i} style={{
          fontFamily: 'inherit',
          fontSize: 10, fontWeight: 700,
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '1px 5px',
          letterSpacing: '0.02em',
          boxShadow: 'inset 0 -1px 0 var(--border)',
        }}>{k}</span>
      ))}
      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>{label}</span>
    </div>
  )
}

// ── Main DashboardBuilder ────────────────────────────────────────
function DashboardBuilderInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing,  setIsEditing]  = useState(true)
  const [flashMsg,   setFlashMsg]   = useState(null) // 'copied' | 'pasted' | 'deleted'

  const clipboardRef = useRef(null) // stores a deep-copy of the widget being copied

  const widgets         = useDashboardStore(s => s.widgets)
  const currentPageId   = useDashboardStore(s => s.currentPageId)
  const clearCanvas     = useDashboardStore(s => s.clearCanvas)
  const loadWidgets     = useDashboardStore(s => s.loadWidgets)
  const removeWidget    = useDashboardStore(s => s.removeWidget)
  const duplicateWidget = useDashboardStore(s => s.duplicateWidget)
  const addWidgetRaw    = useDashboardStore(s => s.addWidget)

  const updatePageWidgets = useDashboardPagesStore(s => s.updatePageWidgets)
  const getPage           = useDashboardPagesStore(s => s.getPage)
  const setCurrentPageId  = useDashboardStore(s => s.setCurrentPageId)

  const currentPage = currentPageId ? getPage(currentPageId) : null

  useEffect(() => {
    if (id) {
      const page = getPage(id)
      if (page) {
        if (currentPageId !== page.id) {
          loadWidgets(page.widgets, page.id)
        }
      } else {
        navigate('/dashboard-management')
      }
    }
  }, [id, getPage, loadWidgets, navigate, currentPageId])

  const handleSelect   = useCallback(id => setSelectedId(id), [])
  const handleDeselect = useCallback(() => setSelectedId(null), [])

  const handleUpdate = () => {
    if (!currentPageId) return
    updatePageWidgets(currentPageId, widgets)
  }

  // ── Flash helper ─────────────────────────────────────────────
  const flashTimerRef = useRef(null)
  const flash = useCallback((msg) => {
    setFlashMsg(msg)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashMsg(null), 1400)
  }, [])

  // ── Keyboard shortcuts (ref-based: listener registered ONCE) ──
  // Keep mutable values in refs so the single listener always reads the
  // current value without needing to re-register.
  const selectedIdRef = useRef(null)
  const isEditingRef  = useRef(true)
  const flashRef      = useRef(flash)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { isEditingRef.current  = isEditing  }, [isEditing])
  useEffect(() => { flashRef.current      = flash      }, [flash])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isEditingRef.current) return

      // Suppress when focus is inside any form control
      const tag = (document.activeElement?.tagName ?? '').toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (document.activeElement?.isContentEditable) return

      const store = useDashboardStore.getState()
      const id    = selectedIdRef.current
      const key   = e.key.toLowerCase()

      // Ctrl / Cmd + C — copy
      if ((e.ctrlKey || e.metaKey) && key === 'c') {
        if (!id) return
        const src = store.widgets.find(w => w.id === id)
        if (!src) return
        e.preventDefault()
        clipboardRef.current = JSON.parse(JSON.stringify(src))
        flashRef.current('copied')
        return
      }

      // Ctrl / Cmd + V — paste
      if ((e.ctrlKey || e.metaKey) && key === 'v') {
        if (!clipboardRef.current) return
        e.preventDefault()
        const src = clipboardRef.current
        const newWidget = {
          ...JSON.parse(JSON.stringify(src)),
          id: `widget_${Date.now()}`,
          x: src.x + 1,
          y: src.y + 1,
        }
        store.pasteWidget(newWidget)
        setSelectedId(newWidget.id)
        flashRef.current('pasted')
        return
      }

      // Delete — remove selected widget
      if (e.key === 'Delete' && id) {
        e.preventDefault()
        store.removeWidget(id)
        setSelectedId(null)
        flashRef.current('deleted')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // ← empty: registers once on mount, reads live values via refs

  const hasCopied = !!clipboardRef.current

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--accent-muted)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)',
          }}>
            <LayoutTemplate size={16} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentPage ? currentPage.name : 'Dashboard Builder'}
            </span>
            {currentPage && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-muted)', padding: '1px 7px', borderRadius: 100, border: '1px solid rgba(59,130,246,0.3)' }}>
                editing
              </span>
            )}
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '1px 7px', borderRadius: 100, border: '1px solid var(--border)' }}>
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Keyboard shortcut hints (editing mode only) ──── */}
        {isEditing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '4px 12px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            opacity: 0.85,
          }}>
            <KbdHint keys={['Ctrl', 'C']} label="Copy" />
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <KbdHint keys={['Ctrl', 'V']} label="Paste" />
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <KbdHint keys={['Del']} label="Delete" />
          </div>
        )}

        {/* Flash feedback */}
        {flashMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 8,
            background: flashMsg === 'deleted'
              ? 'rgba(239,68,68,0.12)'
              : flashMsg === 'copied'
                ? 'rgba(59,130,246,0.12)'
                : 'rgba(20,184,166,0.12)',
            border: '1px solid',
            borderColor: flashMsg === 'deleted' ? 'rgba(239,68,68,0.35)' : flashMsg === 'copied' ? 'rgba(59,130,246,0.35)' : 'rgba(20,184,166,0.35)',
            fontSize: 11, fontWeight: 700,
            color: flashMsg === 'deleted' ? '#ef4444' : flashMsg === 'copied' ? 'var(--accent)' : '#14b8a6',
            animation: 'fadeScaleIn 0.15s ease-out',
          }}>
            {flashMsg === 'copied' && <><Copy size={12} /> Copied</>}
            {flashMsg === 'pasted' && <><Clipboard size={12} /> Pasted</>}
            {flashMsg === 'deleted' && <><X size={12} /> Deleted</>}
          </div>
        )}

        {/* Clear */}
        {isEditing && (
          <button
            onClick={() => { clearCanvas(); setSelectedId(null) }}
            disabled={widgets.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: widgets.length === 0 ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (widgets.length > 0) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}

        {/* Update */}
        {currentPage && (
          <button
            onClick={handleUpdate}
            disabled={widgets.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--teal)', background: 'var(--teal-muted)',
              color: 'var(--teal)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              opacity: widgets.length === 0 ? 0.4 : 1,
            }}
          >
            <RefreshCw size={14} />
            Update
          </button>
        )}

        {/* Go to management */}
        <button
          onClick={() => navigate('/dashboard-management')}
          title="Manage Dashboards"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          <Save size={15} />
        </button>

        {/* ── Mode toggle pill ────────────────────────────────── */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: 3, gap: 2,
        }}>
          <button
            onClick={() => { setIsEditing(true); setSelectedId(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700,
              background: isEditing  ? 'var(--accent)' : 'transparent',
              color:      isEditing  ? '#fff'          : 'var(--text-muted)',
              transition: 'all 0.18s',
              boxShadow: isEditing ? '0 1px 6px rgba(59,130,246,0.35)' : 'none',
            }}
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            onClick={() => { setIsEditing(false); setSelectedId(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700,
              background: !isEditing ? 'var(--success)' : 'transparent',
              color:      !isEditing ? '#fff'           : 'var(--text-muted)',
              transition: 'all 0.18s',
              boxShadow: !isEditing ? '0 1px 6px rgba(34,197,94,0.35)' : 'none',
            }}
          >
            <Eye size={13} />
            Preview
          </button>
        </div>
      </div>

      {/* ── Animation style ─────────────────────────────────────── */}
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <WidgetCanvas
          selectedId={selectedId}
          onSelect={handleSelect}
          isEditing={isEditing}
        />

        {selectedId && isEditing && (
          <ConfigPanel widgetId={selectedId} onClose={handleDeselect} />
        )}

        {isEditing && <ComponentLibrary />}
      </div>
    </div>
  )
}

export default function DashboardBuilder() {
  return (
    <AdminGuard>
      <DashboardBuilderInner />
    </AdminGuard>
  )
}
