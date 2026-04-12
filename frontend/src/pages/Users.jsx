import { memo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Shield, ShieldCheck, User as UserIcon, UserPlus, Search, Edit2, Trash2, Users as UsersIcon } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import CustomSelect from '@/components/CustomSelect'
import SegmentedToggle from '@/components/SegmentedToggle'

const INITIAL_USERS = [
  { id: 1, username: 'user5', fullName: 'User Kullanıcı 5', role: 'Operator', status: 'Active' },
  { id: 2, username: 'user3', fullName: 'User Kullanıcı 3', role: 'Operator', status: 'Inactive' },
  { id: 3, username: 'user2', fullName: 'Kullanıcı 2', role: 'Supervisor', status: 'Active' },
  { id: 4, username: 'user1', fullName: 'User Kullanıcı 1', role: 'Operator', status: 'Active' },
]

const ROLE_CONFIG = {
  Admin: { icon: Shield, color: '#0ea5e9', bg: '#e0f2fe' },
  Supervisor: { icon: ShieldCheck, color: '#3b82f6', bg: '#eff6ff' },
  Operator: { icon: UserIcon, color: '#14b8a6', bg: '#e6fffa' },
}

const STATS = [
  { label: 'Admin', count: 1, ...ROLE_CONFIG.Admin },
  { label: 'Supervisor', count: 1, ...ROLE_CONFIG.Supervisor },
  { label: 'Operator', count: 3, ...ROLE_CONFIG.Operator },
]

const Users = memo(() => {
  const currentUser = useAuthStore(s => s.user)
  const isGuest = useAuthStore(s => s.isGuest)

  const [users, setUsers] = useState(INITIAL_USERS)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null)
  
  const [formData, setFormData] = useState({
    username: '', fullName: '', role: 'Operator', status: 'Active'
  })

  // Sadece admin görebilir
  if (isGuest || currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({ username: '', fullName: '', role: 'Operator', status: 'Active' })
    setModalOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({ ...user })
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u))
    } else {
      setUsers([...users, { ...formData, id: Date.now() }])
    }
    setModalOpen(false)
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fade-in" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: '#14b8a6', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <UsersIcon size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              User Management
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>
              Manage all system users
            </p>
          </div>
        </div>
        <button 
          className="btn"
          onClick={openCreateModal}
          style={{ 
            background: '#14b8a6', color: '#fff', padding: '10px 16px', borderRadius: '8px', 
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' 
          }}
        >
          <UserPlus size={18} /> Create New User
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
                {stat.count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="card flex-col gap-0" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', flex: 1, display: 'flex' }}>
        <div className="flex justify-between items-center" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            User Management ({users.length})
          </h2>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input" 
              type="text" 
              placeholder="Search users..." 
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
                <th style={{ padding: '16px 24px' }}>USERNAME</th>
                <th style={{ padding: '16px 24px' }}>FULL NAME</th>
                <th style={{ padding: '16px 24px' }}>ROLE</th>
                <th style={{ padding: '16px 24px' }}>STATUS</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.Operator
                const RoleIcon = roleCfg.icon
                return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ background: roleCfg.color, color: '#fff', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RoleIcon size={18} />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                    {u.fullName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belirtilmedi</span>}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      color: roleCfg.color,
                      background: roleCfg.bg,
                      padding: '4px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                       <div style={{width: 6, height: 6, borderRadius: '50%', background: roleCfg.color}} />
                       {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      color: u.status === 'Active' ? '#10b981' : '#ef4444',
                      background: u.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      padding: '4px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                       <div style={{width: 6, height: 6, borderRadius: '50%', background: u.status === 'Active' ? '#10b981' : '#ef4444'}} />
                       {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', whiteSpace: 'nowrap', width: '1%' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(u)} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteConfirmUser(u)} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No users found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card fade-in" style={{ width: 400, padding: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Username</label>
                <input required className="input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div className="flex-col gap-1">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Full Name (Optional)</label>
                <input className="input" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="flex-col gap-1" style={{ zIndex: 11 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Role</label>
                <CustomSelect 
                  value={formData.role} 
                  onChange={val => setFormData({...formData, role: val})} 
                  options={[
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Supervisor', value: 'Supervisor' },
                    { label: 'Operator', value: 'Operator' }
                  ]}
                />
              </div>
              <div className="flex-col gap-1" style={{ zIndex: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Status</label>
                <SegmentedToggle 
                  value={formData.status} 
                  onChange={val => setFormData({...formData, status: val})} 
                  options={[
                    { label: 'Active', value: 'Active', color: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' },
                    { label: 'Inactive', value: 'Inactive', color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.2)' }
                  ]}
                />
              </div>
              <button type="submit" className="btn" style={{ background: '#14b8a6', color: '#fff', padding: '10px', justifyContent: 'center', fontWeight: 600, border: 'none', marginTop: 12 }}>
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }} onClick={() => setDeleteConfirmUser(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card fade-in flex-col gap-4" style={{ width: 360, padding: 24, textAlign: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Kullanıcıyı Sil</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmUser.username}</strong> adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3" style={{ marginTop: '12px' }}>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600 }}
                onClick={() => setDeleteConfirmUser(null)}
              >
                İptal
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={() => {
                  setUsers(users.filter(u => u.id !== deleteConfirmUser.id))
                  setDeleteConfirmUser(null)
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
})

export default Users
