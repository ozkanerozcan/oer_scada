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

  // ── Unified watch list (Modbus + OPC UA in one sorted list) ─────────────
  const allWatchedTags = useMemo(() => {
    const enriched = watchDb.map(w => {
      const isOpcua = w.tagKey.includes('.OPCUA.')
      if (isOpcua) {
        const sep = w.tagKey.indexOf('.OPCUA.')
        const deviceName = sep > -1 ? w.tagKey.slice(0, sep) : ''
        const nodePath   = sep > -1 ? w.tagKey.slice(sep + 7) : w.tagKey
        return { ...w, isOpcua: true, deviceName, nodePath, tagLabel: nodePath, groupName: 'OPC UA', dataTypeLabel: w.dataType || 'Unknown' }
      } else {
        const instance = tagInstances.find(t => t.uniqueKey === w.tagKey)
        if (!instance) return null
        return { ...w, isOpcua: false, deviceName: instance.deviceName, groupName: instance.groupName, tagLabel: instance.tagName, instance, dataTypeLabel: instance.dataType || w.dataType || 'Unknown' }
      }
    }).filter(Boolean)

    if (!searchTerm) return enriched
    const s = searchTerm.toLowerCase()
    return enriched.filter(w =>
      w.deviceName.toLowerCase().includes(s) ||
      w.groupName.toLowerCase().includes(s) ||
      w.tagLabel.toLowerCase().includes(s)
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
    const newItems = [...allWatchedTags]
    const swap = index + direction
    if (swap < 0 || swap >= newItems.length) return
    ;[newItems[index], newItems[swap]] = [newItems[swap], newItems[index]]
    const payload = newItems.map((w, i) => ({ id: w.id, sortOrder: i }))
    setWatchDb(prev => {
      const map = Object.fromEntries(newItems.map(w => [w.id, w]))
      return prev.map(w => map[w.id] ? { ...w, sortOrder: map[w.id].sortOrder } : w)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    })
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
            İzleme Listesi ({allWatchedTags.length}{searchTerm ? ` / ${watchDb.length}` : ''})
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
                <th style={{ padding: '12px 16px', width: 60 }}>Sıra</th>
                <th style={{ padding: '12px 16px', width: 160 }}>Cihaz</th>
                <th style={{ padding: '12px 16px' }}>Tag Adı</th>
                <th style={{ padding: '12px 16px', width: 100 }}>Data Type</th>
                <th style={{ padding: '12px 16px', width: 140 }}>Değer</th>
                <th style={{ padding: '12px 16px', width: 100, textAlign: 'right' }}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {allWatchedTags.map((w, index) => {
                // ── Value lookup ─────────────────────────────────────────────
                const valueKey = w.isOpcua ? w.tagKey : (w.instance?.uniqueKey || w.tagKey)
                const valObj   = values[valueKey]
                const rawVal   = valObj?.value
                const displayVal = rawVal === undefined
                  ? '—'
                  : typeof rawVal === 'number'
                    ? parseFloat(rawVal.toFixed(4))
                    : String(rawVal)

                // ── Data type badge colours ───────────────────────────────────
                const dtColors = {
                  Bool:    { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
                  Int16:   { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
                  UInt16:  { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
                  Int32:   { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
                  UInt32:  { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
                  Float32: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
                  String:  { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
                }
                const dtC = dtColors[w.dataTypeLabel] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }

                return (
                  <tr key={w.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* ── Sıra ── */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => handleMove(index, -1)} disabled={index === 0}
                          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.25 : 1, padding: 2, color: 'var(--text-muted)' }}>
                          <ChevronUp size={15} />
                        </button>
                        <button onClick={() => handleMove(index, 1)} disabled={index === allWatchedTags.length - 1}
                          style={{ background: 'none', border: 'none', cursor: index === allWatchedTags.length - 1 ? 'default' : 'pointer', opacity: index === allWatchedTags.length - 1 ? 0.25 : 1, padding: 2, color: 'var(--text-muted)' }}>
                          <ChevronDown size={15} />
                        </button>
                      </div>
                    </td>

                    {/* ── Cihaz ── */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontWeight: 600, color: w.isOpcua ? '#8b5cf6' : '#ec4899', fontSize: 13 }}>
                        {w.deviceName}
                      </span>
                    </td>

                    {/* ── Tag Adı ── */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {w.isOpcua ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                                letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
                              }}>OPC UA</span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                              {w.nodePath}
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                              {w.groupName}
                              <span style={{ color: 'var(--text-muted)', fontWeight: 400, margin: '0 4px' }}>|</span>
                              {w.tagLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* ── Data Type ── */}
                    <td style={{ padding: '10px 16px' }}>
                      {w.dataTypeLabel && w.dataTypeLabel !== 'Unknown' ? (
                        <span style={{ background: dtC.bg, color: dtC.color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          {w.dataTypeLabel}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* ── Değer ── */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {displayVal}
                        </span>
                        {!w.isOpcua && w.instance?.unit && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.instance.unit}</span>
                        )}
                      </div>
                    </td>

                    {/* ── Aksiyon ── */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                        {!w.isOpcua && w.instance?.writable && (
                          <button
                            onClick={() => { setModifyModal({ tag: w.instance, valObj }); setModifyValue(rawVal ?? '') }}
                            className="btn btn-ghost"
                            style={{ padding: 6, color: '#3b82f6', borderRadius: 8 }}
                            title="Değiştir"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                        <button onClick={() => handleRemove(w.id)} className="btn btn-ghost"
                          style={{ padding: 6, color: '#ef4444', borderRadius: 8 }} title="Kaldır">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {allWatchedTags.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
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
