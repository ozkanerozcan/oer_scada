import { memo, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Monitor, Server, HardDrive, Smartphone, Plus, Search, Edit2, Trash2, Cpu, Wifi, Loader2 } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import { testDevicePing } from '@/services/api'
import SegmentedToggle from '@/components/SegmentedToggle'
import CustomSelect from '@/components/CustomSelect'

import useDeviceStore from '@/stores/deviceStore'

const STATS = [
  { label: 'All Devices', icon: Server, color: '#3b82f6', bg: '#dbeafe', key: 'all' },
  { label: 'Active Devices', icon: Wifi, color: '#10b981', bg: '#d1fae5', key: 'active' },
  { label: 'Passive Devices', icon: HardDrive, color: '#64748b', bg: '#f1f5f9', key: 'passive' },
]

const Devices = memo(() => {
  const currentUser = useAuthStore(s => s.user)
  const isGuest = useAuthStore(s => s.isGuest)

  const devices = useDeviceStore(s => s.devices)
  const addDevice = useDeviceStore(s => s.addDevice)
  const updateDevice = useDeviceStore(s => s.updateDevice)
  const deleteDevice = useDeviceStore(s => s.deleteDevice)

  const [searchTerm, setSearchTerm] = useState('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState(null)
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState(null)
  const [pingResult, setPingResult] = useState(null)
  const [pingingDeviceId, setPingingDeviceId] = useState(null)
  const [groups, setGroups] = useState([])
  
  const [formData, setFormData] = useState({
    name: '', ip: '', port: 502, slaveId: 1, type: 'Modbus TCP', enabled: 1, variableGroupId: ''
  })

  useEffect(() => {
    fetch('http://localhost:3000/api/groups')
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(err => console.error('Failed to fetch groups', err))
    useDeviceStore.getState().fetchDevices()
  }, [])

  // Sadece admin görebilir
  if (isGuest || currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const openCreateModal = () => {
    setEditingDevice(null)
    setFormData({ name: '', ip: '', port: 502, slaveId: 1, type: 'Modbus TCP', enabled: 1, variableGroupId: '' })
    setModalOpen(true)
  }

  const openEditModal = (device) => {
    setEditingDevice(device)
    setFormData({ ...device })
    setModalOpen(true)
  }

  const handlePing = async (device) => {
    setPingingDeviceId(device.id);
    try {
      const res = await testDevicePing({ ip: device.ip, port: device.port || 502, unitId: device.slaveId || 1 });
      setPingResult({ 
         success: res.success, 
         message: res.success ? `Successfully connected to ${device.name} at ${device.ip}:${device.port || 502}` : res.error,
         device
      });
    } catch(e) {
      setPingResult({ success: false, message: e.message, device });
    } finally {
      setPingingDeviceId(null);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingDevice) {
      updateDevice({ ...formData, id: editingDevice.id })
    } else {
      addDevice(formData)
    }
    setModalOpen(false)
    
    // Update stats based on full list (Not fully dynamic in STATS constant, but list updates)
  }

  const filteredDevices = devices.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.ip || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusStyle = (enabled) => {
    switch(enabled) {
      case 1: return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
      case 0: return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
      default: return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
    }
  }

  return (
    <div className="fade-in" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <HardDrive size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Device Management
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>
              Manage PLCs, HMIs, and Edge Devices
            </p>
          </div>
        </div>
        <button 
          className="btn"
          onClick={openCreateModal}
          style={{ 
            background: '#3b82f6', color: '#fff', padding: '10px 16px', borderRadius: '8px', 
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' 
          }}
        >
          <Plus size={18} /> Add New Device
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24, flexShrink: 0 }}>
        {STATS.map(stat => (
          <div key={stat.label} className="card flex items-center gap-4" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ background: stat.bg, color: stat.color, padding: '16px', borderRadius: '14px', display: 'flex' }}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {stat.key === 'all' ? devices.length : stat.key === 'active' ? devices.filter(d => d.enabled === 1).length : devices.filter(d => d.enabled === 0).length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
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
              placeholder="Search by name or IP..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', borderRadius: '10px', background: 'var(--bg-primary)' }}
            />
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: 14 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px' }}>DEVICE NAME</th>
                <th style={{ padding: '16px 24px' }}>IP ADDRESS</th>
                <th style={{ padding: '16px 24px' }}>PORT</th>
                <th style={{ padding: '16px 24px' }}>VARIABLE GROUP</th>
                <th style={{ padding: '16px 24px' }}>STATUS</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(d => {
                const TypeIcon = Server
                const statusStyle = getStatusStyle(d.enabled)
                
                return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ background: '#0ea5e9', color: '#fff', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TypeIcon size={18} />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {d.ip || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {d.port || 502}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                    {groups.find(g => g.id === d.variableGroupId)?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      color: statusStyle.color,
                      background: statusStyle.bg,
                      padding: '4px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                       <div style={{width: 6, height: 6, borderRadius: '50%', background: statusStyle.color}} />
                       {d.enabled === 1 ? 'Active' : 'Passive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handlePing(d)} 
                        className="btn btn-ghost" 
                        style={{ padding: '8px', borderRadius: '8px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)', opacity: pingingDeviceId !== null ? 0.6 : 1 }} 
                        title="Ping Device"
                        disabled={pingingDeviceId !== null}
                      >
                        {pingingDeviceId === d.id ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                      </button>
                      <button onClick={() => openEditModal(d)} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }} title="Edit" disabled={pingingDeviceId !== null}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteConfirmDevice(d)} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} title="Delete" disabled={pingingDeviceId !== null}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          {filteredDevices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No devices found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)'
        }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card fade-in" style={{ width: 480, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{editingDevice ? 'Edit Device' : 'Add New Device'}</h2>
              <button 
                onClick={() => setModalOpen(false)} 
                style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', fontSize: 18, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
              >✕</button>
            </div>
            
            <div className="flex-col" style={{ gap: 24 }}>
              <div className="flex-col gap-2">
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Device Name</label>
                <input className="input w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Primary PLC" style={{ padding: '12px 16px', borderRadius: 12 }} />
              </div>
              
              <div className="flex-col gap-2">
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Communication Type</label>
                <CustomSelect
                  value={formData.type || 'Modbus TCP'}
                  onChange={val => setFormData({...formData, type: val})}
                  options={[
                    { label: 'Modbus TCP', value: 'Modbus TCP' },
                    { label: 'Modbus RTU (Coming Soon)', value: 'Modbus RTU', disabled: true },
                    { label: 'OPC UA (Coming Soon)', value: 'OPC UA', disabled: true },
                  ]}
                  placeholder="Select Protocol..."
                  searchable
                />
              </div>

              {(!formData.type || formData.type === 'Modbus TCP') && (
                <>
                  <div className="flex-col gap-2" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Variable Group</label>
                    <CustomSelect
                      value={formData.variableGroupId || ''}
                      onChange={val => setFormData({...formData, variableGroupId: val ? Number(val) : ''})}
                      options={[
                        { label: 'None (Unassigned)', value: '' },
                        ...groups.map(g => ({ label: g.name, value: g.id }))
                      ]}
                      placeholder="Assign to Group..."
                      searchable
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '70% 1fr', gap: 20 }}>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>IP Address</label>
                      <input className="input w-full" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} placeholder="e.g. 192.168.1.170" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                    <div className="flex-col gap-2">
                      <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Port</label>
                      <input type="number" className="input w-full" value={formData.port} onChange={e => setFormData({...formData, port: Number(e.target.value)})} placeholder="502" style={{ padding: '12px 16px', borderRadius: 12 }} />
                    </div>
                  </div>

                  <div className="flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Slave ID</label>
                    <input type="number" className="input w-full" value={formData.slaveId} onChange={e => setFormData({...formData, slaveId: Number(e.target.value)})} placeholder="1" style={{ padding: '12px 16px', borderRadius: 12 }} />
                  </div>
                </>
              )}

              <div className="flex-col gap-2">
                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Polling Status</label>
                <SegmentedToggle 
                  value={formData.enabled} 
                  onChange={val => setFormData({...formData, enabled: val})} 
                  options={[
                    { label: 'Active', value: 1, color: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' },
                    { label: 'Passive', value: 0, color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.2)' }
                  ]}
                />
              </div>
              
              <div className="flex gap-3 mt-4" style={{borderTop: '1px solid var(--border)', paddingTop: 28}}>
                 <button onClick={() => setModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, padding: '14px', justifyContent: 'center', fontWeight: 600, borderRadius: 12 }}>Cancel</button>
                 <button onClick={handleSubmit} className="btn" style={{ background: '#3b82f6', color: '#fff', flex: 1, padding: '14px', justifyContent: 'center', fontWeight: 600, border: 'none', borderRadius: 12, boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)' }}>
                   {editingDevice ? 'Save Changes' : 'Add Device'}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDevice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }} onClick={() => setDeleteConfirmDevice(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card fade-in flex-col gap-4" style={{ width: 360, padding: 24, textAlign: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Device</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmDevice.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3" style={{ marginTop: '12px' }}>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600 }}
                onClick={() => setDeleteConfirmDevice(null)}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={() => {
                  deleteDevice(deleteConfirmDevice.id)
                  setDeleteConfirmDevice(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ping Result Modal */}
      {pingResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)'
        }} onClick={() => setPingResult(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card fade-in flex-col gap-4" style={{ width: 360, padding: 32, textAlign: 'center', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ background: pingResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: pingResult.success ? '#10b981' : '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              {pingResult.success ? <Wifi size={32} /> : <Server size={32} />}
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {pingResult.success ? 'Connection OK' : 'Connection Failed'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
              {pingResult.message}
            </p>
            <div className="flex" style={{ marginTop: '24px', justifyContent: 'center' }}>
              <button 
                className="btn" 
                style={{ width: '140px', padding: '12px', justifyContent: 'center', fontWeight: 600, background: pingResult.success ? '#10b981' : 'var(--bg-hover)', color: pingResult.success ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: 12, boxShadow: pingResult.success ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none' }}
                onClick={() => setPingResult(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
})

export default Devices
