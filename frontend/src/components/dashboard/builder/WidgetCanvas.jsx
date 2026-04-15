import { useRef, useCallback, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'
import WidgetWrapper from './WidgetWrapper'

const COLS    = 12
const CELL_H  = 30

// Draw a crosshatch/grid overlay on the canvas
function GridOverlay({ cellW, cellH, cols, rows }) {
  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    >
      {/* Vertical lines */}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * cellW} y1={0}
          x2={i * cellW} y2="100%"
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 6"
          opacity={0.5}
        />
      ))}
      {/* Horizontal lines */}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0} y1={i * cellH}
          x2="100%" y2={i * cellH}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 6"
          opacity={0.5}
        />
      ))}
    </svg>
  )
}

export default function WidgetCanvas({ selectedId, onSelect, isEditing }) {
  const widgets   = useDashboardStore(s => s.widgets)
  const addWidget = useDashboardStore(s => s.addWidget)
  const bringToFront = useDashboardStore(s => s.bringToFront)

  const containerRef = useRef(null)
  const [cellW, setCellW]   = useState(100)
  const [canvasH, setCanvasH] = useState(0)

  // Measure container width → derive cellW
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setCellW(el.clientWidth / COLS)
      setCanvasH(el.clientHeight)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const rows = Math.max(10, Math.ceil(canvasH / CELL_H) + 2)

  // ── Drop handler ───────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('widgetType')
    if (!type) return
    const rect = containerRef.current.getBoundingClientRect()
    const col  = Math.floor((e.clientX - rect.left) / cellW)
    const row  = Math.floor((e.clientY - rect.top)  / CELL_H)
    const safeCol = Math.max(0, Math.min(col, COLS - 1))
    const safeRow = Math.max(0, row)
    addWidget(type, safeCol, safeRow)
  }, [addWidget, cellW])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleCanvasClick = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  const handleSelect = useCallback((id) => {
    onSelect(id)
    bringToFront(id)
  }, [onSelect, bringToFront])

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        background: 'var(--bg-primary)',
        minHeight: 0,
      }}
    >
      {/* Inner scrollable area */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: rows * CELL_H,
      }}>
        {/* Grid overlay when editing */}
        {isEditing && (
          <GridOverlay cellW={cellW} cellH={CELL_H} cols={COLS} rows={rows} />
        )}

        {/* Empty state */}
        {widgets.length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              border: '2px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 28,
            }}>
              +
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Canvas is empty
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Drag components from the library on the right
              </div>
            </div>
          </div>
        )}

        {/* Widgets */}
        {widgets.map((w) => (
          <WidgetWrapper
            key={w.id}
            widget={w}
            isSelected={selectedId === w.id}
            onSelect={handleSelect}
            cellW={cellW}
            cellH={CELL_H}
            isEditing={isEditing}
          />
        ))}
      </div>
    </div>
  )
}

WidgetCanvas.propTypes = {
  selectedId: PropTypes.string,
  onSelect:   PropTypes.func.isRequired,
  isEditing:  PropTypes.bool,
}

GridOverlay.propTypes = {
  cellW: PropTypes.number,
  cellH: PropTypes.number,
  cols:  PropTypes.number,
  rows:  PropTypes.number,
}
