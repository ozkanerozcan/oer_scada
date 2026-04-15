import { memo, useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'
import useDeviceStore from '@/stores/deviceStore'
import { Radio, ChevronRight, ChevronDown, Eye, EyeOff, Loader2, Wifi, RefreshCw, X, FolderOpen, Folder, Tag, Database } from 'lucide-react'
import { browseOpcUaNode, testOpcUaConnection, addWatchItem, deleteWatchItem, getWatchItems } from '@/services/api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// ─── Data type badge ──────────────────────────────────────────────────────────
function DataTypeBadge({ dataType }) {
  const colors = {
    Bool:    { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    Int16:   { bg: '#dbeafe', color: '#3b82f6' },
    UInt16:  { bg: '#dbeafe', color: '#3b82f6' },
    Int32:   { bg: '#ede9fe', color: '#8b5cf6' },
    UInt32:  { bg: '#ede9fe', color: '#8b5cf6' },
    Float32: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    String:  { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
    Unknown: { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' },
  }
  const c = colors[dataType] || colors.Unknown
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      display: 'inline-block', whiteSpace: 'nowrap'
    }}>
      {dataType || 'Unknown'}
    </span>
  )
}

// ─── Node Row ─────────────────────────────────────────────────────────────────
const NodeRow = memo(({ node, depth, deviceId, deviceName, watchItems, onWatchToggle, onExpand, expanded, loadingNodeId }) => {
  const tagKey = `${deviceName}.OPCUA.${node.nodeId}`
  const isWatched = watchItems.some(w => w.tagKey === tagKey)
  const isExpanding = loadingNodeId === node.nodeId

  const indent = depth * 20

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        background: depth % 2 ? 'rgba(0,0,0,0.015)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = depth % 2 ? 'rgba(0,0,0,0.015)' : 'transparent'}
    >
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        paddingLeft: 16 + indent,
        gap: 8,
      }}>
        {/* Expand toggle — show for any node that has children (including
            Variable nodes that are Siemens S7 structs / UDTs with members) */}
        <div style={{ width: 20, flexShrink: 0 }}>
          {node.hasChildren ? (
            <button
              onClick={() => onExpand(node)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              {isExpanding
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : null}
        </div>

        {/* Icon — folder for containers, tag for leaf variables */}
        <div style={{ flexShrink: 0, color: node.isFolder ? '#f59e0b' : node.hasChildren ? '#a78bfa' : 'var(--text-muted)' }}>
          {node.isFolder
            ? (expanded ? <FolderOpen size={16} /> : <Folder size={16} />)
            : node.hasChildren
              ? (expanded ? <FolderOpen size={14} /> : <Folder size={14} />)
              : <Tag size={14} />}
        </div>

        {/* Display Name */}
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.displayName}
        </span>

        {/* Node ID */}
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {node.nodeId}
        </span>

        {/* DataType badge (only for variables) */}
        {node.isVariable && (
          <DataTypeBadge dataType={node.dataType} />
        )}

        {/* Current value */}
        {node.isVariable && node.value !== null && node.value !== undefined && (
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'right' }}>
            {String(node.value).substring(0, 20)}
          </span>
        )}

        {/* Watch toggle — only for variable nodes */}
        {node.isVariable && (
          <button
            onClick={() => onWatchToggle(node, tagKey, isWatched)}
            className="btn btn-ghost"
            style={{
              padding: '6px', borderRadius: 8,
              color: isWatched ? '#3b82f6' : '#9ca3af',
              background: isWatched ? 'rgba(59,130,246,0.1)' : 'transparent',
              flexShrink: 0,
            }}
            title={isWatched ? 'Remove from Watch Table' : 'Add to Watch Table'}
          >
            {isWatched ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
})

// ─── Main Page ────────────────────────────────────────────────────────────────
const OpcUaBrowser = memo(() => {
  const currentUser = useAuthStore(s => s.user)
  const isGuest = useAuthStore(s => s.isGuest)
  const devices = useDeviceStore(s => s.devices)

  const opcDevices = devices.filter(d => d.type === 'OPC UA')

  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [nodeTree, setNodeTree] = useState({}) // nodeId -> children[]
  const [rootNodes, setRootNodes] = useState([])
  const [expanded, setExpanded] = useState({}) // nodeId -> bool
  const [loadingNodeId, setLoadingNodeId] = useState(null)
  const [watchItems, setWatchItems] = useState([])
  const [status, setStatus] = useState(null) // null | { type: 'loading'|'error'|'ok', message }
  const [pingResult, setPingResult] = useState(null)
  const [pinging, setPinging] = useState(false)

  const selectedDevice = opcDevices.find(d => d.id === selectedDeviceId) || null

  const fetchWatchItems = useCallback(async () => {
    try {
      const res = await getWatchItems()
      setWatchItems(Array.isArray(res) ? res : (res?.data || []))
    } catch {}
  }, [])

  useEffect(() => {
    useDeviceStore.getState().fetchDevices()
    fetchWatchItems()
  }, [fetchWatchItems])

  // Auto-select first OPC UA device
  useEffect(() => {
    if (opcDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(opcDevices[0].id)
    }
  }, [opcDevices.length])

  // Browse root on device select
  useEffect(() => {
    if (!selectedDeviceId) return
    setRootNodes([])
    setNodeTree({})
    setExpanded({})
    browseRoot(selectedDeviceId)
  }, [selectedDeviceId])

  const browseRoot = async (deviceId) => {
    setStatus({ type: 'loading', message: 'Connecting to OPC UA server...' })
    try {
      const res = await browseOpcUaNode({ deviceId, nodeId: null })
      if (!res.success) throw new Error(res.error || 'Browse failed')
      setRootNodes(res.nodes)
      setStatus({ type: 'ok', message: `${res.nodes.length} root nodes loaded` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleExpand = async (node) => {
    const nodeId = node.nodeId
    if (expanded[nodeId]) {
      // Collapse
      setExpanded(prev => ({ ...prev, [nodeId]: false }))
      return
    }
    if (nodeTree[nodeId]) {
      // Already loaded — just expand
      setExpanded(prev => ({ ...prev, [nodeId]: true }))
      return
    }

    setLoadingNodeId(nodeId)
    try {
      const res = await browseOpcUaNode({ deviceId: selectedDeviceId, nodeId })
      if (!res.success) throw new Error(res.error)
      setNodeTree(prev => ({ ...prev, [nodeId]: res.nodes }))
      setExpanded(prev => ({ ...prev, [nodeId]: true }))
    } catch (err) {
      alert('Browse error: ' + err.message)
    } finally {
      setLoadingNodeId(null)
    }
  }

  const handleWatchToggle = async (node, tagKey, isWatched) => {
    try {
      if (isWatched) {
        const wi = watchItems.find(w => w.tagKey === tagKey)
        if (wi) await deleteWatchItem(wi.id)
      } else {
        await addWatchItem({ tagKey, dataType: node.dataType || 'Unknown' })
      }
      await fetchWatchItems()
    } catch (err) {
      alert('Watch toggle error: ' + err.message)
    }
  }

  const handlePing = async () => {
    if (!selectedDevice) return
    setPinging(true)
    setPingResult(null)
    try {
      const res = await testOpcUaConnection({ deviceId: selectedDevice.id })
      setPingResult({ success: res.success, message: res.success ? res.message : res.error })
    } catch (err) {
      setPingResult({ success: false, message: err.message })
    } finally {
      setPinging(false)
    }
  }

  // ─── Recursive render ───────────────────────────────────────────────────────
  const renderNodes = (nodes, depth = 0) => {
    return nodes.map(node => (
      <div key={node.nodeId}>
        <NodeRow
          node={node}
          depth={depth}
          deviceId={selectedDeviceId}
          deviceName={selectedDevice?.name || ''}
          watchItems={watchItems}
          onWatchToggle={handleWatchToggle}
          onExpand={handleExpand}
          expanded={!!expanded[node.nodeId]}
          loadingNodeId={loadingNodeId}
        />
        {expanded[node.nodeId] && nodeTree[node.nodeId] && (
          renderNodes(nodeTree[node.nodeId], depth + 1)
        )}
      </div>
    ))
  }

  if (isGuest || currentUser?.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24, flexShrink: 0 }}>
        <div className="flex items-center gap-4">
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Radio size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>OPC UA Browser</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Browse OPC UA node tree and add variables to Watch Table</p>
          </div>
        </div>

        {selectedDevice && (
          <div className="flex items-center gap-3">
            {pingResult && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: pingResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: pingResult.success ? '#10b981' : '#ef4444',
                border: `1px solid ${pingResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <Wifi size={14} />
                {pingResult.success ? 'Connected' : 'Failed'}
                <button onClick={() => setPingResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}>
                  <X size={12} />
                </button>
              </div>
            )}
            <button
              onClick={handlePing}
              disabled={pinging}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
            >
              {pinging ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={16} />}
              Test Connection
            </button>
            <button
              onClick={() => browseRoot(selectedDeviceId)}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        )}
      </div>

      {opcDevices.length === 0 ? (
        <div className="card flex-col items-center justify-center" style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted)', padding: 48, borderRadius: 16 }}>
          <Radio size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>No OPC UA Devices</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Go to <strong>Devices</strong> and add a device with the <strong>OPC UA</strong> protocol to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, flex: 1, minHeight: 0 }}>

          {/* Left — Device List */}
          <div className="card flex-col" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', gap: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-card)' }}>
              OPC UA Devices ({opcDevices.length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {opcDevices.map(device => {
                const isSelected = device.id === selectedDeviceId
                return (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDeviceId(device.id)}
                    style={{
                      padding: '14px 20px', cursor: 'pointer',
                      background: isSelected ? 'rgba(139,92,246,0.08)' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? '#8b5cf6' : 'transparent'}`,
                      borderBottom: '1px solid var(--border)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: device.enabled ? '#10b981' : '#6b7280', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: isSelected ? '#8b5cf6' : 'var(--text-primary)' }}>{device.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {device.opcuaEndpoint || 'No endpoint set'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right — Node Tree */}
          <div className="card flex-col" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', gap: 0, minHeight: 0 }}>
            {/* Tree Header */}
            <div className="flex items-center justify-between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
              <div className="flex items-center gap-3">
                <Database size={18} style={{ color: '#8b5cf6' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  {selectedDevice?.name || 'Select a device'}
                </span>
                {selectedDevice && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {selectedDevice.opcuaEndpoint}
                  </span>
                )}
              </div>
              {status && (
                <div style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  background: status.type === 'error' ? 'rgba(239,68,68,0.1)' : status.type === 'loading' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  color: status.type === 'error' ? '#ef4444' : status.type === 'loading' ? '#f59e0b' : '#10b981',
                  display: 'flex', alignItems: 'center', gap: 5
                }}>
                  {status.type === 'loading' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                  {status.message}
                </div>
              )}
            </div>

            {/* Column headers */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
              <div style={{ width: 20, marginRight: 8, flexShrink: 0 }} />
              <div style={{ width: 20, marginRight: 8, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>Display Name</div>
              <div style={{ width: 200, marginRight: 16 }}>Node ID</div>
              <div style={{ width: 80, marginRight: 16 }}>Data Type</div>
              <div style={{ width: 80, textAlign: 'right', marginRight: 16 }}>Value</div>
              <div style={{ width: 32 }} />
            </div>

            {/* Tree */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {status?.type === 'loading' && rootNodes.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                  <p style={{ margin: 0 }}>Connecting to OPC UA server...</p>
                </div>
              ) : status?.type === 'error' ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>
                  <Radio size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Connection Failed</p>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{status.message}</p>
                  <button className="btn" onClick={() => browseRoot(selectedDeviceId)} style={{ marginTop: 16, background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8 }}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : rootNodes.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Radio size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                  <p style={{ margin: 0 }}>Select a device to browse its nodes</p>
                </div>
              ) : (
                renderNodes(rootNodes)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default OpcUaBrowser
