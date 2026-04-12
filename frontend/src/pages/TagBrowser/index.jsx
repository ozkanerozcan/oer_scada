import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import useTagStore from '@/stores/tagStore'
import useDeviceStore from '@/stores/deviceStore'
import useAuthStore from '@/stores/authStore'
import ControlButton from '@/components/controls/ControlButton'
import CustomSelect from '@/components/CustomSelect'
import { getWatchItems, addWatchItem, deleteWatchItem, reorderWatchItems, testModbusDirect } from '@/services/api'
import { Plus, Trash2, Eye, X, ChevronUp, ChevronDown, Activity, Edit3, Search } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function WatchTable() {
  const { t } = useTranslation()
  const values = useTagStore(s => s.values)
  const devices = useDeviceStore(s => s.devices)
  const hasRole = useAuthStore(s => s.hasRole)
  
  const [groups, setGroups] = useState([])
  const [watchDb, setWatchDb] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [selectedPlc, setSelectedPlc] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)

  const [modifyModal, setModifyModal] = useState(null)
  const [modifyValue, setModifyValue] = useState('')
  const [modifyLoading, setModifyLoading] = useState(false)

  const fetchGroups = () => {
    fetch(`${API}/groups`).then(r => r.json()).then(setGroups).catch(console.error)
  }

  const fetchWatch = () => {
    getWatchItems().then(res => {
      if (Array.isArray(res)) setWatchDb(res)
      else if (res && Array.isArray(res.data)) setWatchDb(res.data)
      else setWatchDb([])
    }).catch(err => {
      console.error('Fetch watch items failed', err)
      setWatchDb([])
    })
  }

  useEffect(() => {
    fetchGroups()
    fetchWatch()
  }, [])

  // Flatten instances
  const tagInstances = useMemo(() => {
    const list = []
    groups.forEach(group => {
      if (!group.assignedDevices || !group.tags) return
      group.assignedDevices.forEach(device => {
        group.tags.forEach(tag => {
          const uniqueKey = `${device.name}.${group.name}.${tag.name}`
          list.push({
            uniqueKey,
            deviceName: device.name,
            groupName: group.name,
            tagName: tag.name,
            dataType: tag.dataType,
            unit: tag.unit,
            address: group.startAddress + tag.registerOffset,
            bitOffset: tag.bitOffset ?? tag.bitPosition,
            type: tag.dataType.includes('Bool') ? 'Coil/Discrete' : 'Register',
            writable: true
          })
        })
      })
    })
    return list
  }, [groups])

  // Watched Tags ordered by DB and filtered by Search
  const watchedTags = useMemo(() => {
    const base = watchDb.map(w => {
      const instance = tagInstances.find(t => t.uniqueKey === w.tagKey)
      return { ...w, instance }
    }).filter(w => w.instance !== undefined)

    if (!searchTerm) return base
    
    const s = searchTerm.toLowerCase()
    return base.filter(w => 
      w.instance.deviceName.toLowerCase().includes(s) ||
      w.instance.groupName.toLowerCase().includes(s) ||
      w.instance.tagName.toLowerCase().includes(s)
    )
  }, [watchDb, tagInstances, searchTerm])

  // Available tags for the Add dropdown
  const availableTags = useMemo(() => {
    const existing = new Set(watchDb.map(w => w.tagKey))
    return tagInstances.filter(t => !existing.has(t.uniqueKey))
  }, [tagInstances, watchDb])

  // Derived options for Cascading Dropdowns
  const plcOptions = useMemo(() => {
    const plcs = new Set(availableTags.map(t => t.deviceName))
    return Array.from(plcs).map(p => ({ label: p, value: p }))
  }, [availableTags])

  const groupOptions = useMemo(() => {
    if (!selectedPlc) return []
    const grps = new Set(availableTags.filter(t => t.deviceName === selectedPlc).map(t => t.groupName))
    return Array.from(grps).map(g => ({ label: g, value: g }))
  }, [availableTags, selectedPlc])

  const tagOptions = useMemo(() => {
    if (!selectedPlc || !selectedGroup) return []
    return availableTags
      .filter(t => t.deviceName === selectedPlc && t.groupName === selectedGroup)
      .map(t => ({ label: t.tagName, value: t.uniqueKey }))
  }, [availableTags, selectedPlc, selectedGroup])

  // Handlers
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!selectedTagToAdd) return
    await addWatchItem({ tagKey: selectedTagToAdd })
    setAddModal(false)
    setSelectedPlc('')
    setSelectedGroup('')
    setSelectedTagToAdd('')
    fetchWatch()
  }

  const handleRemove = async (id) => {
    await deleteWatchItem(id)
    fetchWatch()
  }

  const handleMove = async (index, direction) => {
    const newItems = [...watchedTags]
    const swap = index + direction
    if (swap < 0 || swap >= newItems.length) return
    
    ;[newItems[index], newItems[swap]] = [newItems[swap], newItems[index]]
    
    // update sort orders visually and push
    const payload = newItems.map((w, i) => ({ id: w.id, sortOrder: i }))
    // optimistic
    setWatchDb(newItems)
    setIsOrdering(true)
    await reorderWatchItems(payload)
    setIsOrdering(false)
    fetchWatch()
  }

  const handleModifySubmit = async (e) => {
    e.preventDefault()
    if (!modifyModal) return
    if (!hasRole('operator')) return alert('Yetkiniz yok!')

    const device = devices.find(d => d.name === modifyModal.tag.deviceName)
    if (!device) return alert('Kayıtlı cihaz bulunamadı!')
    
    // Type str mapping (Modbus direct api expects 'Bool', 'Int', 'Real')
    let typeStr = 'Int'
    const dt = modifyModal.tag.dataType.toLowerCase()
    if (dt.includes('bool')) typeStr = 'Bool'
    else if (dt.includes('float') || dt.includes('real')) typeStr = 'Real'
    
    setModifyLoading(true)
    try {
       const res = await testModbusDirect({
          ip: device.ip,
          port: device.port,
          unitId: device.slaveId,
          address: modifyModal.tag.address,
          bitOffset: modifyModal.tag.bitOffset,
          type: typeStr,
          operation: 'Write',
          value: dt.includes('bool') ? (modifyValue === 1 || modifyValue === '1' || modifyValue === true || modifyValue === 'true') : modifyValue
       })
       if (!res.success) throw new Error(res.error)
       // Successfully written. Wait for next WebSocket tick to reflect in UI.
       setModifyModal(null)
    } catch (err) {
       alert('Yazma hatası: ' + err.message)
    } finally {
       setModifyLoading(false)
    }
  }

  return (
    <div className="fade-in" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div className="flex items-center justify-between" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: '#ec4899', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Activity size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Watch Table</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Monitor specific variables in real-time</p>
          </div>
        </div>
        <button className="btn" onClick={() => setAddModal(true)} style={{ background: '#ec4899', color: '#fff', padding: '10px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Add to Watch
        </button>
      </div>

      <div className="card flex-col gap-0" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', flex: 1, display: 'flex' }}>
        <div className="flex justify-between items-center" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            İzleme Listesi ({watchedTags.length}{searchTerm ? ` / ${watchDb.length}` : ''})
          </h2>
          <div className="flex items-center gap-3">
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                type="text" 
                placeholder="Cihaz, grup veya tag ara..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', borderRadius: '10px', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 24px', width: 60 }}>Sıra</th>
                <th style={{ padding: '12px 24px' }}>Cihaz / Grup</th>
                <th style={{ padding: '12px 24px' }}>Tag Adı</th>
                <th style={{ padding: '12px 24px' }}>Değer</th>
                <th style={{ padding: '12px 24px', width: 100, textAlign: 'right' }}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {watchedTags.map((wTag, index) => {
                const tag = wTag.instance
                const valObj = values[tag.uniqueKey]
                
                return (
                  <tr key={wTag.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex-col gap-1">
                        <button onClick={() => handleMove(index, -1)} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: 2 }}><ChevronUp size={16} /></button>
                        <button onClick={() => handleMove(index, 1)} disabled={index === watchedTags.length - 1} style={{ background: 'none', border: 'none', cursor: index === watchedTags.length - 1 ? 'default' : 'pointer', opacity: index === watchedTags.length - 1 ? 0.3 : 1, padding: 2 }}><ChevronDown size={16} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex-col gap-1">
                        <span style={{ fontWeight: 600, color: '#ec4899' }}>{tag.deviceName}</span>
                        <span className="text-muted" style={{ fontSize: 12 }}>{tag.groupName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{tag.tagName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex items-center gap-2">
                        <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                           {valObj?.value !== undefined 
                             ? (typeof valObj.value === 'number' 
                                 ? parseFloat(valObj.value.toFixed(2)) 
                                 : valObj.value) 
                             : '—'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tag.unit || ''}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div className="flex justify-end gap-2 items-center">
                        {tag.writable ? (
                          <button 
                             onClick={() => { setModifyModal({ tag, valObj }); setModifyValue(valObj?.value ?? '') }}
                             className="btn btn-ghost" 
                             style={{ padding: 6, color: '#3b82f6', borderRadius: 8 }}
                             title="Değiştir"
                          >
                             <Edit3 size={16} />
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: 12, marginRight: 8, height: 32, display: 'flex', alignItems: 'center' }}>Salt Okunur</span>
                        )}
                        <button onClick={() => handleRemove(wTag.id)} className="btn btn-ghost" style={{ padding: 6, color: '#ef4444', borderRadius: 8 }} title="Kaldır">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {watchedTags.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="flex-col items-center gap-3">
                      <Eye size={48} style={{ opacity: 0.2 }} />
                      <span>İzleme tablonuzda gösterilecek değişken bulunmuyor.</span>
                      <button onClick={() => setAddModal(true)} className="btn" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: 600, marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none' }}>+ Değişken Ekle</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => setAddModal(false)}>
          <div onClick={e => e.stopPropagation()} className="card fade-in" style={{ width: 440, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
               <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>İzlemeye Değişken Ekle</h2>
               <button onClick={() => { setAddModal(false); setSelectedPlc(''); setSelectedGroup(''); setSelectedTagToAdd(''); }} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleAdd} className="flex-col gap-4">
              <div className="flex-col gap-2" style={{ zIndex: 102 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>1. PLC Seçimi</label>
                 <CustomSelect 
                    value={selectedPlc}
                    onChange={val => { setSelectedPlc(val); setSelectedGroup(''); setSelectedTagToAdd(''); }}
                    options={plcOptions}
                    placeholder="PLC Arayın veya Seçin..."
                    searchable
                 />
              </div>

              <div className="flex-col gap-2" style={{ zIndex: 101, opacity: selectedPlc ? 1 : 0.5 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>2. Grup Seçimi</label>
                 <CustomSelect 
                    value={selectedGroup}
                    onChange={val => { setSelectedGroup(val); setSelectedTagToAdd(''); }}
                    options={groupOptions}
                    placeholder="Grup Arayın veya Seçin..."
                    disabled={!selectedPlc}
                    searchable
                 />
              </div>

              <div className="flex-col gap-2" style={{ zIndex: 100, opacity: selectedGroup ? 1 : 0.5 }}>
                 <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>3. Değişken (Tag) Seçimi</label>
                 <CustomSelect 
                    value={selectedTagToAdd}
                    onChange={setSelectedTagToAdd}
                    options={tagOptions}
                    placeholder="Değişken Arayın veya Seçin..."
                    disabled={!selectedGroup}
                    searchable
                 />
              </div>

              <button 
                type="submit" 
                className="btn" 
                disabled={!selectedTagToAdd}
                style={{ background: '#ec4899', color: '#fff', padding: '12px', justifyContent: 'center', fontWeight: 600, border: 'none', borderRadius: 12, marginTop: 12, opacity: selectedTagToAdd ? 1 : 0.5 }}
              >
                 İzlemeye Ekle
              </button>
            </form>
          </div>
        </div>
      )}

      {modifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => setModifyModal(null)}>
          <div onClick={e => e.stopPropagation()} className="card fade-in" style={{ width: 400, padding: 32, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
               <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Değer Değiştir</h2>
               <button onClick={() => setModifyModal(null)} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>
            
            <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
               <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Değişken Bilgisi</div>
               <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{modifyModal.tag.uniqueKey}</div>
               <div className="flex gap-4 mt-2">
                 <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tip: <b>{modifyModal.tag.dataType}</b></span>
                 <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Adres: <b>{modifyModal.tag.address}</b></span>
               </div>
            </div>

            <form onSubmit={handleModifySubmit} className="flex-col gap-4">
              <div className="flex-col gap-2">
                 <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Yeni Değer {modifyModal.tag.unit ? `(${modifyModal.tag.unit})` : ''}</label>
                 {modifyModal.tag.dataType.toLowerCase().includes('bool') ? (
                    <CustomSelect 
                       value={modifyValue}
                       onChange={setModifyValue}
                       options={[
                         { label: 'Açık (1)', value: 1 },
                         { label: 'Kapalı (0)', value: 0 }
                       ]}
                    />
                 ) : (
                    <input 
                      type={modifyModal.tag.dataType.toLowerCase().includes('float') || modifyModal.tag.dataType.toLowerCase().includes('real') ? 'number' : 'text'}
                      step={modifyModal.tag.dataType.toLowerCase().includes('float') || modifyModal.tag.dataType.toLowerCase().includes('real') ? '0.01' : '1'}
                      className="input" 
                      autoFocus
                      placeholder="Yeni değeri giriniz..."
                      value={modifyValue}
                      onChange={e => setModifyValue(e.target.value)}
                    />
                 )}
              </div>
              <button 
                type="submit" 
                className="btn" 
                disabled={modifyLoading || modifyValue === '' || modifyValue === null}
                style={{ background: '#3b82f6', color: '#fff', padding: '12px', justifyContent: 'center', fontWeight: 600, border: 'none', borderRadius: 12, marginTop: 8 }}
              >
                 {modifyLoading ? 'Yazılıyor...' : 'Gönder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
