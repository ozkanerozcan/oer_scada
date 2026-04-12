import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...',
  disabled = false,
  className = '',
  searchable = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) setSearchQuery('')
  }, [isOpen])

  const selectedOption = options.find(o => o.value === value) || null
  const filteredOptions = searchable && searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options

  return (
    <div 
      ref={containerRef} 
      className={`custom-select-container ${className}`} 
      style={{ position: 'relative', width: '100%' }}
    >
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="input"
        style={{ 
          padding: '12px 16px', 
          borderRadius: 12, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px var(--accent-muted)' : 'none',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)'
        }}
      >
        <span style={{ fontSize: 13, fontWeight: selectedOption ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)', 
            transition: 'transform 0.2s', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
          }} 
        />
      </div>

      {isOpen && !disabled && (
        <div 
          className="fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
            maxHeight: 240,
            overflowY: 'auto',
            padding: 4
          }}
        >
          {searchable && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: 8, 
                  border: '1px solid var(--border)', 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)', 
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
          )}
          
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    background: isSelected ? 'var(--accent-muted)' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {option.label}
                  </span>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
