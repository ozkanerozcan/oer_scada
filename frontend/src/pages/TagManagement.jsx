import { memo, useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Tags, Plus, Search, Edit2, Trash2, Database, ChevronUp, ChevronDown, Server, X, Cpu, Layers, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import useDeviceStore from '@/stores/deviceStore'
import CustomSelect from '@/components/CustomSelect'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const DATA_TYPES = ['Bool', 'Int16', 'UInt16', 'Int32', 'UInt32', 'Float32']
const REG_SIZE = { bool: 1, int16: 1, uint16: 1, int32: 2, uint32: 2, float32: 2 }

function getRegSize(dt) {
  return REG_SIZE[(dt || '').toLowerCase()] || 1
}

// Compute register offsets with Bool bit-packing.
function calcOffsets(tags) {
  const result = []
  let cursor = 0
  let boolSlotOffset = null
  let boolSlotUsed = 0

  for (const t of tags) {
    if (t.dataType === 'Bool') {
      if (boolSlotOffset === null || boolSlotUsed >= 16) {
        boolSlotOffset = cursor
        boolSlotUsed = 0
        cursor += 1
      }
      result.push({
        ...t,
        registerOffset: boolSlotOffset,
        regSize: 1, 
        bitPosition: t.bitOffset ?? boolSlotUsed,
        isBool: true
      })
      boolSlotUsed += 1
    } else {
      boolSlotOffset = null
      boolSlotUsed = 0
      const rs = getRegSize(t.dataType)
      result.push({ ...t, registerOffset: cursor, regSize: rs, isBool: false })
      cursor += rs
    }
  }
  return { tags: result, totalRegisters: cursor }
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="card fade-in flex-col gap-4" style={{ width: 360, padding: 28, textAlign: 'center', borderRadius: 20 }}>
        <div style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: danger ? '#ef4444' : '#3b82f6', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
          <Trash2 size={26} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div className="flex gap-3" style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, borderRadius: 10 }}>Cancel</button>
          <button className="btn" onClick={onConfirm} style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, background: danger ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 10 }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─── Group Form Modal ──────────────────────────────────────────────────────────
function GroupModal({ group, onClose, onSave }) {
  const [form, setForm] = useState({
    name: group?.name || '',
    startAddress: group?.startAddress ?? 0,
    readInterval: group?.readInterval ?? 1000,
    description: group?.description || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSave(form)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card fade-in" style={{ width: 460, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{group ? 'Edit Group' : 'New Variable Group'}</h2>
          <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 20 }}>
          <div className="flex-col gap-2">
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Group Name</label>
            <input required className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Press_Group" style={{ padding: '12px 16px', borderRadius: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="flex-col gap-2">
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Start Address</label>
              <input type="number" required className="input w-full" value={form.startAddress} onChange={e => setForm({ ...form, startAddress: Number(e.target.value) })} style={{ padding: '12px 16px', borderRadius: 12 }} />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Read Interval (ms)</label>
              <input type="number" required className="input w-full" value={form.readInterval} onChange={e => setForm({ ...form, readInterval: Number(e.target.value) })} style={{ padding: '12px 16px', borderRadius: 12 }} />
            </div>
          </div>
          <div className="flex-col gap-2">
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Description</label>
            <input className="input w-full" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional..." style={{ padding: '12px 16px', borderRadius: 12 }} />
          </div>
          <div className="flex gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, borderRadius: 12 }}>Cancel</button>
            <button type="submit" className="btn" style={{ flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}>
              {group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tag Form Modal ────────────────────────────────────────────────────────────
function TagModal({ tag, onClose, onSave }) {
  const isBoolEdit = tag?.dataType === 'Bool'
  const [form, setForm] = useState({
    name: tag?.name || '',
    dataType: tag?.dataType || 'Int16',
    unit: tag?.unit || ''
  })

  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  const isBool = form.dataType === 'Bool'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card fade-in" style={{ width: 440, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{tag ? 'Edit Variable' : 'Add Variable'}</h2>
          <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 20 }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}
          <div className="flex-col gap-2">
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Variable Name</label>
            <input required className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. SafetyDoor" style={{ padding: '12px 16px', borderRadius: 12 }} />
          </div>
          <div className="flex-col gap-2" style={{ zIndex: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Data Type</label>
            <CustomSelect
              value={form.dataType}
              onChange={val => setForm({ ...form, dataType: val })}
              options={DATA_TYPES.map(dt => ({ label: dt, value: dt }))}
              placeholder="Select Data Type..."
              searchable
            />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Unit</label>
            <input className="input w-full" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. bar, RPM, °C" style={{ padding: '12px 16px', borderRadius: 12 }} />
          </div>
          <div className="flex gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, borderRadius: 12 }}>Cancel</button>
            <button type="submit" className="btn" style={{ flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
              {tag ? 'Save Changes' : 'Add Variable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TagManagement = memo(() => {
  const currentUser = useAuthStore(s => s.user)
  const isGuest = useAuthStore(s => s.isGuest)
  const devices = useDeviceStore(s => s.devices)

  const [groups, setGroups] = useState([])
  const [watchItems, setWatchItems] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [groupModal, setGroupModal] = useState(null) // null | 'create' | group object
  const [tagModal, setTagModal] = useState(null)     // null | 'create' | tag object
  const [confirmModal, setConfirmModal] = useState(null)

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null

  const fetchGroups = useCallback(async () => {
    const res = await fetch(`${API}/groups`)
    const data = await res.json()
    setGroups(data)
  }, [])

  const fetchWatchItems = useCallback(async () => {
    const res = await fetch(`${API}/watch`)
    const data = await res.json()
    setWatchItems(data)
  }, [])

  useEffect(() => {
    fetchGroups()
    fetchWatchItems()
    useDeviceStore.getState().fetchDevices()
  }, [fetchGroups, fetchWatchItems])

  if (isGuest || currentUser?.role !== 'admin') return <Navigate to="/" replace />

  // ─── Group Actions ───────────────────────────────────────────────────────────
  const saveGroup = async (form) => {
    if (groupModal && groupModal !== 'create') {
      await fetch(`${API}/groups/${groupModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      const res = await fetch(`${API}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.id) setSelectedGroupId(data.id)
    }
    await fetchGroups()
  }

  const deleteGroup = async (group) => {
    await fetch(`${API}/groups/${group.id}`, { method: 'DELETE' })
    if (selectedGroupId === group.id) setSelectedGroupId(null)
    await fetchGroups()
    setConfirmModal(null)
  }

  // ─── Tag Actions ─────────────────────────────────────────────────────────────
  const saveTag = async (form) => {
    const isEdit = tagModal && tagModal !== 'create';
    const url = isEdit ? `${API}/tags/${tagModal.id}` : `${API}/tags`;
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit ? form : { ...form, groupId: selectedGroupId };

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to save variable')
    }
    await fetchGroups()
  }

  const deleteTag = async (tag) => {
    await fetch(`${API}/tags/${tag.id}`, { method: 'DELETE' })
    await fetchGroups()
    setConfirmModal(null)
  }

  const moveTag = async (tags, index, direction) => {
    const newTags = [...tags]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newTags.length) return
    ;[newTags[index], newTags[swapIndex]] = [newTags[swapIndex], newTags[index]]
    const items = newTags.map((t, i) => ({ id: t.id, sortOrder: i }))
    await fetch(`${API}/tags/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
    await fetchGroups()
  }

  // ─── Watch Table Toggle ──────────────────────────────────────────────────────
  const toggleWatch = async (tag) => {
    if (!selectedGroup.assignedDevices || selectedGroup.assignedDevices.length === 0) {
      alert("Please assign a device to this group first to add its variables to the watch table.")
      return
    }
    
    const tagKeys = selectedGroup.assignedDevices.map(d => `${d.name}.${selectedGroup.name}.${tag.name}`)
    const watchedMatches = watchItems.filter(wi => tagKeys.includes(wi.tagKey))

    try {
      if (watchedMatches.length > 0) {
        for (const wi of watchedMatches) {
          await fetch(`${API}/watch/${wi.id}`, { method: 'DELETE' })
        }
      } else {
        for (const tagKey of tagKeys) {
          await fetch(`${API}/watch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagKey, dataType: tag.dataType }) })
        }
      }
      await fetchWatchItems()
    } catch (err) {
      console.error("Failed to toggle watch table", err)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const { tags: tagsWithOffsets, totalRegisters: usedRegisters } = selectedGroup 
    ? calcOffsets(selectedGroup.tags || []) 
    : { tags: [], totalRegisters: 0 }
  const regPercent = Math.min((usedRegisters / 125) * 100, 100)
  const assignedDeviceIds = selectedGroup ? (selectedGroup.assignedDevices || []).map(d => d.id) : []

  return (
    <div className="fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: '#f59e0b', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Layers size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Modbus TCP</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Configure variable groups and parameters</p>
          </div>
        </div>
        <button className="btn" onClick={() => setGroupModal('create')} style={{ background: '#f59e0b', color: '#fff', padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> New Variable Group
        </button>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, flex: 1, minHeight: 0 }}>

        {/* Left — Group List */}
        <div className="card flex-col" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', gap: 0, display: 'flex', maxHeight: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0, background: 'var(--bg-card)' }}>
            Variable Groups ({groups.length})
          </div>
          {groups.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No groups yet.<br />Create your first variable group.</div>
          )}
          <div className="flex-col" style={{ gap: 0, overflowY: 'auto', flex: 1 }}>
            {groups.map(g => {
              const regs = calcOffsets(g.tags || []).totalRegisters
              const isSelected = g.id === selectedGroupId
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{ padding: '14px 20px', cursor: 'pointer', background: isSelected ? 'rgba(245,158,11,0.08)' : 'transparent', borderLeft: `3px solid ${isSelected ? '#f59e0b' : 'transparent'}`, borderBottom: '1px solid var(--border)', transition: 'all 0.15s' }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 600, fontSize: 14, color: isSelected ? '#f59e0b' : 'var(--text-primary)' }}>{g.name}</span>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setGroupModal(g) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', borderRadius: 6 }}><Edit2 size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'group', item: g }) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', borderRadius: 6 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10 }}>
                    <span>Addr: {g.startAddress}</span>
                    <span>{regs * 2}/250 bytes</span>
                    <span>{g.readInterval}ms</span>
                  </div>
                  {(g.assignedDevices || []).length > 0 && (
                    <div className="flex gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {g.assignedDevices.map(d => (
                        <span key={d.id} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 4 }}>{d.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — Group Detail */}
        {!selectedGroup ? (
          <div className="card flex-col items-center justify-center" style={{ padding: 48, borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Layers size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 15 }}>Select a variable group to configure its fields and device assignments.</p>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: 20, minHeight: 0, display: 'flex' }}>

            {/* Variables Table */}
            <div className="card flex-col gap-0" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flex: 1, minHeight: 0 }}>
              <div className="flex justify-between items-center" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Variables ({tagsWithOffsets.length})</div>
                <button className="btn" onClick={() => setTagModal('create')} style={{ background: '#3b82f6', color: '#fff', padding: '8px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, border: 'none', fontSize: 13 }}>
                  <Plus size={15} /> Add Variable
                </button>
              </div>

              {tagsWithOffsets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No variables yet. Add one to start building this variable group.
                </div>
              ) : (
              <div style={{ overflow: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 16px', width: 50 }}>Order</th>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Data Type</th>
                      <th style={{ padding: '12px 16px' }}>Adres</th>
                      <th style={{ padding: '12px 16px' }}>Unit</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagsWithOffsets.map((tag, index) => {
                      const absAddr = (selectedGroup?.startAddress || 0) + tag.registerOffset
                      const isWatched = watchItems.some(wi => (selectedGroup?.assignedDevices || []).some(d => wi.tagKey === `${d.name}.${selectedGroup.name}.${tag.name}`))
                      return (
                      <tr key={tag.id} style={{ borderBottom: '1px solid var(--border)', background: tag.isBool ? 'rgba(59,130,246,0.03)' : 'transparent' }}>
                        <td style={{ padding: '12px' }}>
                          <div className="flex-col gap-1">
                            <button onClick={() => moveTag(selectedGroup.tags, index, -1)} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: 2 }}><ChevronUp size={14} /></button>
                            <button onClick={() => moveTag(selectedGroup.tags, index, 1)} disabled={index === tagsWithOffsets.length - 1} style={{ background: 'none', border: 'none', cursor: index === tagsWithOffsets.length - 1 ? 'default' : 'pointer', opacity: index === tagsWithOffsets.length - 1 ? 0.3 : 1, padding: 2 }}><ChevronDown size={14} /></button>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div className="flex items-center gap-2">
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.isBool ? '#f59e0b' : '#3b82f6', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{tag.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            background: tag.isBool ? 'rgba(245,158,11,0.12)' : '#dbeafe',
                            color: tag.isBool ? '#f59e0b' : '#3b82f6',
                            padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-block', width: 'fit-content'
                          }}>{tag.dataType}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {tag.isBool 
                              ? `${(absAddr * 2) + Math.floor((tag.bitPosition ?? tag.bitOffset ?? 0) / 8)}.${(tag.bitPosition ?? tag.bitOffset ?? 0) % 8}` 
                              : (absAddr * 2)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-muted)' }}>
                          {tag.unit || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggleWatch(tag)} className="btn btn-ghost" style={{ padding: '6px', borderRadius: 8, color: isWatched ? '#3b82f6' : '#9ca3af', background: isWatched ? 'rgba(59,130,246,0.1)' : 'transparent' }} title={isWatched ? "Remove from Watch Table" : "Add to Watch Table"}>
                              {isWatched ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => setTagModal(tag)} className="btn btn-ghost" style={{ padding: '6px', borderRadius: 8, color: '#10b981' }} title="Edit"><Edit2 size={14} /></button>
                            <button onClick={() => setConfirmModal({ type: 'tag', item: tag })} className="btn btn-ghost" style={{ padding: '6px', borderRadius: 8, color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {groupModal && <GroupModal group={groupModal !== 'create' ? groupModal : null} onClose={() => setGroupModal(null)} onSave={saveGroup} />}
      {tagModal && <TagModal tag={tagModal !== 'create' ? tagModal : null} onClose={() => setTagModal(null)} onSave={saveTag} />}
      {confirmModal?.type === 'group' && (
        <ConfirmModal
          title="Delete Group"
          message={`Are you sure you want to delete "${confirmModal.item.name}"? All variables in this group will also be deleted.`}
          onConfirm={() => deleteGroup(confirmModal.item)}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal?.type === 'tag' && (
        <ConfirmModal
          title="Delete Variable"
          message={`Are you sure you want to delete "${confirmModal.item.name}"?`}
          onConfirm={() => deleteTag(confirmModal.item)}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
})

export default TagManagement
