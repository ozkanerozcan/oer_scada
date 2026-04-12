import { useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import ValueCard from '../widgets/ValueCard'
import LEDIndicator from '../widgets/LEDIndicator'
import DonutChart from '../widgets/DonutChart'
import LineChartWidget from '../widgets/LineChartWidget'
import TextWidget from '../widgets/TextWidget'
import useDashboardStore from '@/pages/DashboardBuilder/useDashboardStore'

const WIDGET_MAP = {
  ValueCard,
  LEDIndicator,
  DonutChart,
  LineChartWidget,
  TextWidget,
}

const HANDLE_POSITIONS = [
  { cursor: 'se-resize', style: { bottom: 0, right: 0 }, dir: 'se' },
  { cursor: 'sw-resize', style: { bottom: 0, left: 0 },  dir: 'sw' },
  { cursor: 'ne-resize', style: { top: 0, right: 0 },    dir: 'ne' },
  { cursor: 'nw-resize', style: { top: 0, left: 0 },     dir: 'nw' },
  { cursor: 'e-resize',  style: { top: '50%', right: 0, transform: 'translateY(-50%)' }, dir: 'e' },
  { cursor: 'w-resize',  style: { top: '50%', left: 0,  transform: 'translateY(-50%)' }, dir: 'w' },
  { cursor: 's-resize',  style: { bottom: 0, left: '50%', transform: 'translateX(-50%)' }, dir: 's' },
  { cursor: 'n-resize',  style: { top: 0, left: '50%', transform: 'translateX(-50%)' }, dir: 'n' },
]

export default function WidgetWrapper({
  widget,
  isSelected,
  onSelect,
  cellW,
  cellH,
  isEditing,
}) {
  const resizeWidget = useDashboardStore(s => s.resizeWidget)
  const moveWidget   = useDashboardStore(s => s.moveWidget)

  const dragRef  = useRef(null)
  const resRef   = useRef(null)
  const selfRef  = useRef(null)

  const WidgetComponent = WIDGET_MAP[widget.type]
  if (!WidgetComponent) return null

  // ── Move via drag ───────────────────────────────────────────────
  const handleMouseDownMove = useCallback((e) => {
    if (!isEditing) return
    if (e.target.dataset.resize) return  // let resize handle it
    e.stopPropagation()
    onSelect(widget.id)

    const startX = e.clientX
    const startY = e.clientY
    const origX  = widget.x
    const origY  = widget.y

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / cellW)
      const dy = Math.round((me.clientY - startY) / cellH)
      const nx = Math.max(0, origX + dx)
      const ny = Math.max(0, origY + dy)
      moveWidget(widget.id, nx, ny)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isEditing, widget, cellW, cellH, moveWidget, onSelect])

  // ── Resize via handle ───────────────────────────────────────────
  const handleMouseDownResize = useCallback((e, dir) => {
    if (!isEditing) return
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const origW  = widget.w
    const origH  = widget.h
    const origX  = widget.x
    const origY  = widget.y

    const onMove = (me) => {
      const dx = Math.round((me.clientX - startX) / cellW)
      const dy = Math.round((me.clientY - startY) / cellH)

      let newW = origW, newH = origH, newX = origX, newY = origY

      if (dir.includes('e')) newW = Math.max(1, origW + dx)
      if (dir.includes('s')) newH = Math.max(1, origH + dy)
      if (dir.includes('w')) { newW = Math.max(1, origW - dx); newX = origX + dx }
      if (dir.includes('n')) { newH = Math.max(1, origH - dy); newY = origY + dy }

      resizeWidget(widget.id, newW, newH)
      if (dir.includes('w') || dir.includes('n')) {
        moveWidget(widget.id, Math.max(0, newX), Math.max(0, newY))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isEditing, widget, cellW, cellH, resizeWidget, moveWidget])

  const left   = widget.x * cellW
  const top    = widget.y * cellH
  const width  = widget.w * cellW
  const height = widget.h * cellH

  return (
    <div
      ref={selfRef}
      onMouseDown={handleMouseDownMove}
      onClick={(e) => { e.stopPropagation(); onSelect(widget.id) }}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        cursor: isEditing ? 'move' : 'default',
        userSelect: 'none',
        zIndex: isSelected ? 10 : 1,
        transition: dragRef.current ? 'none' : 'box-shadow 0.2s',
      }}
    >
      {/* Card shell */}
      <div style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-card)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isSelected
          ? '0 0 0 2px var(--accent), 0 8px 32px rgba(59,130,246,0.15)'
          : '0 2px 12px rgba(0,0,0,0.15)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <WidgetComponent config={widget.config} />
      </div>

      {/* Resize handles - only when selected and editing */}
      {isSelected && isEditing && HANDLE_POSITIONS.map(({ cursor, style, dir }) => (
        <div
          key={dir}
          data-resize={dir}
          onMouseDown={(e) => handleMouseDownResize(e, dir)}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 3,
            background: 'var(--accent)',
            border: '2px solid #fff',
            cursor,
            zIndex: 20,
            boxShadow: '0 0 6px rgba(59,130,246,0.6)',
            ...style,
          }}
        />
      ))}

      {/* Selected label chip */}
      {isSelected && isEditing && (
        <div style={{
          position: 'absolute',
          top: -24,
          left: 0,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px 4px 0 0',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {widget.type}
        </div>
      )}
    </div>
  )
}

WidgetWrapper.propTypes = {
  widget:    PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onSelect:   PropTypes.func.isRequired,
  cellW:      PropTypes.number.isRequired,
  cellH:      PropTypes.number.isRequired,
  isEditing:  PropTypes.bool,
}
