import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutTemplate, EyeOff, Pencil, Trash2,
  Globe, Clock, LayoutDashboard, Search, X
} from 'lucide-react'
import AdminGuard from '@/components/common/AdminGuard'
import useDashboardPagesStore from '@/stores/dashboardPagesStore'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'

// ── Confirm Delete Dialog ────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onCancel}
    >
      <div
        className="card fade-in"
        style={{ width: 380, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--danger-muted)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--danger)', marginBottom: 16,
        }}>
          <Trash2 size={22} />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Delete Dashboard</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1, justifyContent: 'center' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Info Dialog ─────────────────────────────────────────
function DashboardInfoDialog({ page, existingNames, onSave, onClose }) {
  const isEdit = !!page
  const [name, setName] = useState(page?.name || '')
  const [desc, setDesc] = useState(page?.description || '')
  const [isVisible, setIsVisible] = useState(page?.isVisible || false)
  const [err,  setErr]  = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) { setErr('Name is required'); return }
    
    if ((!isEdit || trimmedName.toLowerCase() !== page.name.toLowerCase()) && existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setErr('A dashboard with this name already exists.')
      return
    }
    onSave(trimmedName, desc.trim(), isVisible)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        className="card fade-in"
        style={{ width: 400, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{isEdit ? 'Edit Dashboard Info' : 'Create Dashboard'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>Name *</label>
            <input className="input" autoFocus value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder="e.g. Production Line 1" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 5 }}>Description</label>
            <textarea className="input" value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'vertical', lineHeight: 1.5 }} placeholder="Optional description…" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isVisible ? <Globe size={16} color="var(--success)" /> : <EyeOff size={16} color="var(--text-muted)" />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Published State</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isVisible ? 'Visible to all users' : 'Hidden from operators'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVisible(!isVisible)}
              style={{
                width: 34, height: 18, borderRadius: 100,
                background: isVisible ? 'var(--success)' : 'var(--text-muted)',
                border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: isVisible ? 18 : 2, width: 14, height: 14,
                borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.2s'
              }} />
            </button>
          </div>

          {err && <div style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-muted)', padding: '6px 10px', borderRadius: 6 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{isEdit ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Dashboard Card ───────────────────────────────────────────────
function DashboardCard({ page, onDelete, onEdit, onPreview, onRename }) {
  const createdAt = new Date(page.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  const updatedAt = new Date(page.updatedAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${page.isVisible ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: page.isVisible ? '0 0 0 0 transparent, 0 4px 20px rgba(34,197,94,0.05)' : 'none',
    }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: page.isVisible ? 'var(--success-muted)' : 'var(--bg-tertiary)',
          border: `1px solid ${page.isVisible ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: page.isVisible ? 'var(--success)' : 'var(--text-muted)',
          flexShrink: 0, transition: 'all 0.3s',
        }}>
          <LayoutDashboard size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {page.name}
          </div>
        </div>

        {/* Status Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Visibility badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700,
            color: page.isVisible ? 'var(--success)' : 'var(--text-muted)',
            background: page.isVisible ? 'var(--success-muted)' : 'var(--bg-tertiary)',
            padding: '3px 9px', borderRadius: 100,
            border: `1px solid ${page.isVisible ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            transition: 'all 0.3s',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: page.isVisible ? 'var(--success)' : 'var(--text-muted)', display: 'inline-block' }} />
            {page.isVisible ? 'Published' : 'Hidden'}
          </div>

          {/* Rename / Edit Info */}
          <button
            onClick={onRename}
            title="Edit name & description"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 6, fontFamily: 'inherit', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {page.description || <em>No description</em>}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LayoutDashboard size={11} /> {page.widgets?.length ?? 0} widgets
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> Created {createdAt}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> Updated {updatedAt}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {/* Preview */}
        <button
          onClick={onPreview}
          title="Preview dashboard"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            border: '1px solid rgba(168,85,247,0.4)',
            background: 'var(--accent-muted)', color: '#a855f7',
          }}
        >
          <EyeOff size={12} style={{display: 'none'}}/> {/* Just for spacing or use standard Eye */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
           Preview
        </button>

        {/* Edit in builder */}
        <button
          onClick={onEdit}
          title="Edit in builder"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            border: '1px solid rgba(59,130,246,0.4)',
            background: 'var(--accent-muted)', color: 'var(--accent)',
          }}
        >
          <LayoutTemplate size={12} /> Edit
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          title="Delete dashboard"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            border: '1px solid var(--danger)', background: 'var(--danger-muted)', color: 'var(--danger)',
          }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  )
}

// ── Main Management Page ─────────────────────────────────────────
function DashboardManagementInner() {
  const navigate     = useNavigate()
  const pages        = useDashboardPagesStore(s => s.pages)
  const toggleVisibility = useDashboardPagesStore(s => s.toggleVisibility)
  const deletePage   = useDashboardPagesStore(s => s.deletePage)
  const updatePageMeta = useDashboardPagesStore(s => s.updatePageMeta)
  const savePage     = useDashboardPagesStore(s => s.savePage)
  const loadWidgets  = useDashboardStore(s => s.loadWidgets)

  const [search,       setSearch]       = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [filter,       setFilter]       = useState('all') // 'all' | 'published' | 'hidden'

  const existingNames = pages.map(p => p.name)

  const filtered = pages.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'published' ? p.isVisible : !p.isVisible)
    return matchesSearch && matchesFilter
  })

  const handleEdit = (page) => {
    loadWidgets(page.widgets, page.id)
    navigate(`/dashboards/${page.id}`, { state: { isEditing: true } })
  }

  const handlePreview = (page) => {
    navigate(`/dashboards/${page.id}`)
  }

  const handleRename = (page) => setRenameTarget(page)

  const handleRenameSave = async (name, desc, isVisible) => {
    await updatePageMeta(renameTarget.id, { name, description: desc, isVisible })
    setRenameTarget(null)
  }

  const handleCreateSave = async (name, desc, isVisible) => {
    const newId = await savePage(name, desc, [], isVisible)
    loadWidgets([], newId)
    setShowCreate(false)
    navigate(`/dashboards/${newId}`, { state: { isEditing: true } })
  }

  const publishedCount = pages.filter(p => p.isVisible).length
  const hiddenCount    = pages.filter(p => !p.isVisible).length

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg-primary)', padding: '24px 28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-muted)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
          }}>
            <LayoutTemplate size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Dashboard Management
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              Manage, publish and edit saved dashboards
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
            style={{ marginLeft: 'auto', gap: 6 }}
          >
            <LayoutTemplate size={14} />
            Create Dashboard
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Total', value: pages.length, color: 'var(--accent)', bg: 'var(--accent-muted)', border: 'rgba(59,130,246,0.3)' },
            { label: 'Published', value: publishedCount, color: 'var(--success)', bg: 'var(--success-muted)', border: 'rgba(34,197,94,0.3)' },
            { label: 'Hidden', value: hiddenCount, color: 'var(--text-muted)', bg: 'var(--bg-tertiary)', border: 'var(--border)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10, padding: '10px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Search dashboards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 12 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {['all', 'published', 'hidden'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: filter === f ? 'var(--accent-muted)' : 'transparent',
              color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              borderColor: filter === f ? 'rgba(59,130,246,0.4)' : 'var(--border)',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)',
        }}>
          <LayoutDashboard size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {pages.length === 0 ? 'No dashboards saved yet' : 'No results found'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            {pages.length === 0
              ? 'Open the builder, design a dashboard, and save it.'
              : 'Try a different search or filter.'}
          </p>
          {pages.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 16 }}>
              <LayoutTemplate size={14} /> Create Dashboard
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}>
          {filtered.map(page => (
            <DashboardCard
              key={page.id}
              page={page}
              onDelete={() => setDeleteTarget(page)}
              onEdit={() => handleEdit(page)}
              onPreview={() => handlePreview(page)}
              onRename={() => handleRename(page)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name}
          onConfirm={() => { deletePage(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {renameTarget && (
        <DashboardInfoDialog
          page={renameTarget}
          existingNames={existingNames}
          onSave={handleRenameSave}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {showCreate && (
        <DashboardInfoDialog
          existingNames={existingNames}
          onSave={handleCreateSave}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

export default function DashboardManagement() {
  return (
    <AdminGuard>
      <DashboardManagementInner />
    </AdminGuard>
  )
}
