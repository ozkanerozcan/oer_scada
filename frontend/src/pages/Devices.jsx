import { memo, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Server, HardDrive, Plus, Search, Edit2, Trash2, Wifi, WifiOff, Radio, Clock, CheckCircle2, XCircle } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import useDeviceStore from '@/stores/deviceStore'
import SegmentedToggle from '@/components/SegmentedToggle'
import CustomSelect from '@/components/CustomSelect'

// ─── Unified Status Badge ────────────────────────────────────────────────────
// When polling is disabled: shows Passive regardless of comms.
// When polling is enabled: shows live comm status from WebSocket data flow.
function StatusBadge({ enabled, commStatus }) {
  if (!enabled) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#6b7280', background: 'rgba(107,114,128,0.1)',
        padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6b7280' }} />
        Passive
      </span>
    )
  }

  if (commStatus === 'connected') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#10b981', background: 'rgba(16,185,129,0.1)',
        padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: '#10b981',
          display: 'inline-block',
          animation: 'commPulse 2s ease-in-out infinite',
        }} />
        Connected
      </span>
    )
  }

  if (commStatus === 'disconnected') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#ef4444', background: 'rgba(239,68,68,0.1)',
        padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
        Disconnected
      </span>
    )
  }

  // Polling is active but no status yet — engine is starting
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', background: '#f59e0b',
        animation: 'commPulse 1.2s ease-in-out infinite',
        display: 'inline-block',
      }} />
      Connecting…
    </span>
  )
}

// ─── Protocol type pill ────────────────────────────────────────────────────────
function ProtocolBadge({ type }) {
  const isOpcUa = type === 'OPC UA'
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '2px 8px', borderRadius: 6,
      background: isOpcUa ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)',
      color: isOpcUa ? '#8b5cf6' : '#3b82f6',
      border: `1px solid ${isOpcUa ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.15)'}`,
    }}>
      {type || 'Modbus TCP'}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Devices = memo(() => {
  const currentUser = useAuthStore(s => s.user)
  const isGuest = useAuthStore(s => s.isGuest)

  const devices  = useDeviceStore(s => s.devices)
  const statuses = useDeviceStore(s => s.statuses)
  const addDevice    = useDeviceStore(s => s.addDevice)
  const updateDevice = useDeviceStore(s => s.updateDevice)
  const deleteDevice = useDeviceStore(s => s.deleteDevice)

  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState(null)
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState(null)
  const [groups, setGroups] = useState([])

  const [formData, setFormData] = useState({
    name: '', ip: '', port: 502, slaveId: 1, type: 'Modbus TCP', enabled: 1, variableGroupId: '',
    opcuaEndpoint: '', opcuaSecurityMode: 'None', opcuaUsername: '', opcuaPassword: ''
  })

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    fetch(`${apiBase}/groups`)
      .then(r => r.json())
      .then(data => setGroups(data))
      .catch(err => console.error('Failed to fetch groups', err))
    useDeviceStore.getState().fetchDevices()
  }, [])

  if (isGuest || currentUser?.role !== 'admin') return <Navigate to="/" replace />

  // ── Derived counts ─────────────────────────────────────────────────────────
  const passiveCount      = devices.filter(d => !d.enabled).length
  const connectedCount    = devices.filter(d => d.enabled && statuses[d.id] === 'connected').length
  const disconnectedCount = devices.filter(d => d.enabled && statuses[d.id] === 'disconnected').length
  const connectingCount   = devices.filter(d => d.enabled && !statuses[d.id]).length

  const STATS = [
    { label: 'Total Devices',  value: devices.length,      icon: Server,        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'Connected',      value: connectedCount,       icon: CheckCircle2,  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    { label: 'Disconnected',   value: disconnectedCount,    icon: XCircle,       color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
    { label: 'Passive',        value: passiveCount,         icon: Clock,         color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  ]

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingDevice(null)
    setFormData({ name: '', ip: '', port: 502, slaveId: 1, type: 'Modbus TCP', enabled: 1, variableGroupId: '', opcuaEndpoint: '', opcuaSecurityMode: 'None', opcuaUsername: '', opcuaPassword: '' })
    setModalOpen(true)
  }

  const openEditModal = (device) => {
    setEditingDevice(device)
    setFormData({
      ...device,
      opcuaEndpoint:     device.opcuaEndpoint     || '',
      opcuaSecurityMode: device.opcuaSecurityMode || 'None',
      opcuaUsername:     device.opcuaUsername     || '',
      opcuaPassword:     device.opcuaPassword     || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingDevice) {
      updateDevice({ ...formData, id: editingDevice.id })
    } else {
      addDevice(formData)
    }
    setModalOpen(false)
  }

  const filteredDevices = devices.filter(d =>
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.ip   || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.opcuaEndpoint || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fade-in" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes commPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(16,185,129,0.3); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(16,185,129,0.1); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <HardDrive size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Device Management</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>
              Status reflects live communication health via Modbus TCP / OPC UA polling
            </p>
          </div>
        </div>
        <button
          className="btn"
          onClick={openCreateModal}
          style={{ background: '#3b82f6', color: '#fff', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <Plus size={18} /> Add New Device
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24, flexShrink: 0 }}>
        {STATS.map(s => (
          <div key={s.label} className="card flex items-center gap-4" style={{ padding: '20px 24px', borderRadius: '16px' }}>
            <div style={{ background: s.bg, color: s.color, padding: '14px', borderRadius: '12px', display: 'flex', flexShrink: 0 }}>
              <s.icon size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="card flex-col gap-0" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', flex: 1, display: 'flex' }}>
        <div className="flex justify-between items-center" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Devices ({devices.length})
          </h2>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              type="text"
              placeholder="Search by name, IP or endpoint…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', borderRadius: '10px', background: 'var(--bg-primary)' }}
            />
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px', fontSize: 14 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                <th style={{ padding: '14px 24px' }}>Device</th>
                <th style={{ padding: '14px 24px' }}>Protocol</th>
                <th style={{ padding: '14px 24px' }}>Connection</th>
                <th style={{ padding: '14px 24px' }}>Variable Group</th>
                <th style={{ padding: '14px 24px' }}>Status</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', width: '1%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(d => {
                const commStatus = statuses[d.id] // 'connected' | 'disconnected' | undefined
                const isOpcUa   = d.type === 'OPC UA'
                const connInfo  = isOpcUa
                  ? (d.opcuaEndpoint || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No endpoint</span>)
                  : d.ip
                    ? <span style={{ fontFamily: 'monospace' }}>{d.ip}:{d.port || 502}</span>
                    : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not configured</span>

                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Device Name */}
                    <td style={{ padding: '14px 24px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          background: isOpcUa ? 'rgba(139,92,246,0.12)' : 'rgba(14,165,233,0.12)',
                          color: isOpcUa ? '#8b5cf6' : '#0ea5e9',
                          width: '36px', height: '36px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {isOpcUa ? <Radio size={16} /> : <Server size={16} />}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                      </div>
                    </td>

                    {/* Protocol */}
                    <td style={{ padding: '14px 24px' }}>
                      <ProtocolBadge type={d.type} />
                    </td>

                    {/* Connection address */}
                    <td style={{ padding: '14px 24px', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {connInfo}
                      {!isOpcUa && d.slaveId && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                          ID:{d.slaveId}
                        </span>
                      )}
                    </td>

                    {/* Variable Group (Modbus only) */}
                    <td style={{ padding: '14px 24px', color: 'var(--text-secondary)' }}>
                      {isOpcUa
                        ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>N/A</span>
                        : groups.find(g => g.id === d.variableGroupId)?.name
                          || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}
                    </td>

                    {/* Unified Status */}
                    <td style={{ padding: '14px 24px' }}>
                      <StatusBadge enabled={d.enabled} commStatus={commStatus} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 24px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(d)}
                          className="btn btn-ghost"
                          style={{ padding: '7px', borderRadius: '8px', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmDevice(d)}
                          className="btn btn-ghost"
                          style={{ padding: '7px', borderRadius: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredDevices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              {searchTerm ? `No devices matching "${searchTerm}"` : 'No devices configured yet.'}
            </div>
          )}
        </div>

        {/* ── Status legend ── */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
          background: 'var(--bg-tertiary)',
        }}>
          <span style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status Legend:</span>
          {[
            { color: '#10b981', label: 'Connected — data exchange confirmed' },
            { color: '#ef4444', label: 'Disconnected — polling failed or TCP refused' },
            { color: '#f59e0b', label: 'Connecting… — polling engine starting up' },
            { color: '#6b7280', label: 'Passive — polling is disabled' },
          ].map(item => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }} onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="card fade-in" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto', padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingDevice ? 'Edit Device' : 'Add New Device'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 16 }}
              >✕</button>
            </div>

            <div className="flex-col" style={{ gap: 20 }}>
              {/* Device Name */}
              <div className="flex-col gap-2">
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Device Name</label>
                <input className="input w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Primary PLC" style={{ padding: '12px 16px', borderRadius: 12 }} />
              </div>

              {/* Protocol */}
              <div className="flex-col gap-2">
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Communication Protocol</label>
                <CustomSelect
                  value={formData.type || 'Modbus TCP'}
                  onChange={val => setFormData({...formData, type: val, opcuaEndpoint: '', opcuaSecurityMode: 'None', opcuaUsername: '', opcuaPassword: '', ip: '', variableGroupId: ''})}
                  options={[
                    { label: 'Modbus TCP', value: 'Modbus TCP' },
                    { label: 'OPC UA', value: 'OPC UA' },
                    { label: 'Modbus RTU (Coming Soon)', value: 'Modbus RTU', disabled: true },
                  ]}
                  placeholder="Select Protocol…"
                  searchable
                />
              </div>

              {/* ── Modbus TCP fields ── */}
              {(!formData.type || formData.type === 'Modbus TCP') && (
                <>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Variable Group</label>
                    <CustomSelect
                      value={formData.variableGroupId || ''}
                      onChange={val => setFormData({...formData, variableGroupId: val ? Number(val) : ''})}
                      options={[
                        { label: 'None (Unassigned)', value: '' },
                        ...groups.map(g => ({ label: g.name, value: g.id }))
                      ]}
                      placeholder="Assign to Group…"
                      searchable
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16 }}>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>IP Address</label>
                      <input className="input w-full" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} placeholder="192.168.1.170" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Port</label>
                      <input type="number" className="input w-full" value={formData.port} onChange={e => setFormData({...formData, port: Number(e.target.value)})} placeholder="502" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Slave ID</label>
                    <input type="number" className="input w-full" value={formData.slaveId} onChange={e => setFormData({...formData, slaveId: Number(e.target.value)})} placeholder="1" style={{ padding: '12px 16px', borderRadius: 12 }} />
                  </div>
                </>
              )}

              {/* ── OPC UA fields ── */}
              {formData.type === 'OPC UA' && (
                <>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Endpoint URL</label>
                    <input className="input w-full" value={formData.opcuaEndpoint} onChange={e => setFormData({...formData, opcuaEndpoint: e.target.value})} placeholder="opc.tcp://192.168.1.100:4840" style={{ padding: '12px 16px', borderRadius: 12 }} />
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Security Mode</label>
                    <CustomSelect
                      value={formData.opcuaSecurityMode || 'None'}
                      onChange={val => setFormData({...formData, opcuaSecurityMode: val})}
                      options={[
                        { label: 'None (Anonymous)', value: 'None' },
                        { label: 'Sign (Coming Soon)', value: 'Sign', disabled: true },
                        { label: 'Sign & Encrypt (Coming Soon)', value: 'SignAndEncrypt', disabled: true },
                      ]}
                      placeholder="Security Mode"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Username (Optional)</label>
                      <input className="input w-full" value={formData.opcuaUsername} onChange={e => setFormData({...formData, opcuaUsername: e.target.value})} placeholder="admin" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Password (Optional)</label>
                      <input type="password" className="input w-full" value={formData.opcuaPassword} onChange={e => setFormData({...formData, opcuaPassword: e.target.value})} placeholder="••••••" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                  </div>
                </>
              )}

              {/* Polling toggle */}
              <div className="flex-col gap-2">
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Polling Status</label>
                <SegmentedToggle
                  value={formData.enabled}
                  onChange={val => setFormData({...formData, enabled: val})}
                  options={[
                    { label: 'Active', value: 1, color: '#10b981', shadow: 'rgba(16,185,129,0.3)' },
                    { label: 'Passive', value: 0, color: '#ef4444', shadow: 'rgba(239,68,68,0.2)' },
                  ]}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', gap: 12 }}>
                <button onClick={() => setModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, borderRadius: 12 }}>Cancel</button>
                <button onClick={handleSubmit} className="btn" style={{ background: '#3b82f6', color: '#fff', flex: 1, padding: '13px', justifyContent: 'center', fontWeight: 600, border: 'none', borderRadius: 12, boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                  {editingDevice ? 'Save Changes' : 'Add Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmDevice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }} onClick={() => setDeleteConfirmDevice(null)}>
          <div onClick={e => e.stopPropagation()} className="card fade-in flex-col gap-4" style={{ width: 360, padding: 28, textAlign: 'center', borderRadius: 20 }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Delete Device</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmDevice.name}</strong>?
              This will stop its polling. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-ghost" style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600 }} onClick={() => setDeleteConfirmDevice(null)}>Cancel</button>
              <button className="btn" style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={() => { deleteDevice(deleteConfirmDevice.id); setDeleteConfirmDevice(null) }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default Devices
