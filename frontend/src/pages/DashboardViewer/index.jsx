import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Pencil, Eye, Trash2, Save, LayoutTemplate, RefreshCw, ArrowLeft, Globe, EyeOff, LayoutDashboard } from 'lucide-react'
import WidgetCanvas from '@/components/dashboard/builder/WidgetCanvas'
import ComponentLibrary from '@/components/dashboard/builder/ComponentLibrary'
import ConfigPanel from '@/components/dashboard/builder/ConfigPanel'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'
import useDashboardPagesStore from '@/stores/dashboardPagesStore'
import useAuthStore from '@/stores/authStore'

function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div className="card fade-in" style={{ width: 380, padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--danger-muted)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', marginBottom: 16 }}>
          <Trash2 size={22} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1, justifyContent: 'center' }}>Clear</button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const hasRole = useAuthStore(s => s.hasRole)
  const isAdmin = hasRole('admin')

  // Initialize edit mode based on state from navigation (e.g. from Management page)
  const [isEditing, setIsEditing] = useState(isAdmin ? (location.state?.isEditing || false) : false)
  const [selectedId, setSelectedId] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null

  const widgets = useDashboardStore(s => s.widgets)
  const currentPageId = useDashboardStore(s => s.currentPageId)
  const clearCanvas = useDashboardStore(s => s.clearCanvas)
  const loadWidgets = useDashboardStore(s => s.loadWidgets)

  const getPage = useDashboardPagesStore(s => s.getPage)
  const updatePageWidgets = useDashboardPagesStore(s => s.updatePageWidgets)
  const updatePageMeta = useDashboardPagesStore(s => s.updatePageMeta)

  const page = useDashboardPagesStore(s => s.pages.find(p => p.id === id))

  useEffect(() => {
    if (id) {
      const p = getPage(id)
      if (p) {
        if (currentPageId !== p.id) {
          loadWidgets(p.widgets, p.id)
        }
      }
    }
  }, [id, getPage, loadWidgets, currentPageId])

  // Sync isEditing with navigation state (e.g. sidebar clicks default to preview)
  useEffect(() => {
    setIsEditing(isAdmin ? (location.state?.isEditing || false) : false)
    setSelectedId(null)
  }, [id, location.state, isAdmin])

  // ── ALL hooks must be declared before any early return ─────────────────────
  // (React Rules of Hooks: never call hooks after a conditional return)
  const handleSelect   = useCallback(widgetId => setSelectedId(widgetId), [])
  const handleDeselect = useCallback(() => setSelectedId(null), [])

  // Non-admins can only see visible pages
  if (!page || (!page.isVisible && !isAdmin)) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--bg-primary)' }}>
        <EyeOff size={48} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>
          Dashboard not found
        </p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Go Home
        </button>
      </div>
    )
  }

  const handleUpdate = async () => {
    if (!id) return
    await updatePageWidgets(id, widgets)
  }

  const toggleVisibility = async () => {
    if (!id || !page) return
    await updatePageMeta(id, { isVisible: !page.isVisible })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ── Toolbar (Admins Only) ─────────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{
          height: 52, flexShrink: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10,
        }}>
          {/* Back to Management button */}
          <button
            onClick={() => navigate('/dashboard-management')}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
            title="Go to Management"
          >
            <LayoutDashboard size={14} />
          </button>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto', marginLeft: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <LayoutTemplate size={16} />
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{page.name}</span>
              {page.description && (
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>— {page.description}</span>
              )}
              {isEditing && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-muted)', padding: '1px 7px', borderRadius: 100, border: '1px solid rgba(59,130,246,0.3)' }}>editing</span>
              )}
            </div>
          </div>

          {/* Widget count */}
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 100, border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
            {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
          </span>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

          {/* Clear */}
          {isEditing && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={widgets.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: widgets.length === 0 ? 0.4 : 1 }}
              onMouseEnter={e => { if (widgets.length > 0) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Trash2 size={14} /> Clear
            </button>
          )}

          {/* Go to management */}
          <button
            onClick={async () => {
              try {
                await handleUpdate()
                setSaveStatus('success')
                setTimeout(() => setSaveStatus(null), 1000)
              } catch (err) {
                setSaveStatus('error')
                setTimeout(() => setSaveStatus(null), 1000)
              }
            }}
            title="Save changes"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Save size={14} /> Save
          </button>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={() => { setIsEditing(true); setSelectedId(null) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: isEditing ? 'var(--accent)' : 'transparent', color: isEditing ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s', boxShadow: isEditing ? '0 1px 6px rgba(59,130,246,0.35)' : 'none' }}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={() => { setIsEditing(false); setSelectedId(null) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: !isEditing ? 'var(--success)' : 'transparent', color: !isEditing ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s', boxShadow: !isEditing ? '0 1px 6px rgba(34,197,94,0.35)' : 'none' }}>
              <Eye size={13} /> Preview
            </button>
          </div>

          {/* Visibility toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={() => { if (!page.isVisible) toggleVisibility() }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: page.isVisible ? 'var(--success)' : 'transparent', color: page.isVisible ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s', boxShadow: page.isVisible ? '0 1px 6px rgba(34,197,94,0.35)' : 'none' }}>
              <Globe size={13} /> Published
            </button>
            <button onClick={() => { if (page.isVisible) toggleVisibility() }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: !page.isVisible ? 'var(--text-muted)' : 'transparent', color: !page.isVisible ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s', boxShadow: !page.isVisible ? '0 1px 6px rgba(0,0,0,0.2)' : 'none' }}>
              <EyeOff size={13} /> Hidden
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {page.widgets.length === 0 && !isEditing ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
            <EyeOff size={40} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: 15 }}>This dashboard has no widgets.</p>
          </div>
        ) : (
          <WidgetCanvas
            selectedId={selectedId}
            onSelect={handleSelect}
            isEditing={isEditing && isAdmin}
          />
        )}

        {selectedId && isEditing && isAdmin && (
          <ConfigPanel widgetId={selectedId} onClose={handleDeselect} />
        )}

        {isEditing && isAdmin && <ComponentLibrary />}
      </div>

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Dashboard"
          message="Are you sure you want to clear all widgets? This action cannot be undone."
          onConfirm={() => {
            clearCanvas()
            setSelectedId(null)
            setShowClearConfirm(false)
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* ── Save Toast ───────────────────────────────────────────────────────── */}
      {saveStatus && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000, background: saveStatus === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 13,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', pointerEvents: 'none',
          animation: 'pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {saveStatus === 'success' ? <Save size={16} /> : <RefreshCw size={16} />}
          {saveStatus === 'success' ? 'Save successful' : 'Save failed'}
        </div>
      )}

      <style>{`
        @keyframes pop-in {
          0% { transform: translateX(-50%) translateY(20px) scale(0.9); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
