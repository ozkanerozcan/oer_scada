export default function SegmentedToggle({ 
  value, 
  onChange, 
  options = [], 
  className = ''
}) {
  return (
    <div className={`flex gap-2 ${className}`} style={{ background: 'var(--bg-tertiary)', padding: 6, borderRadius: 14 }}>
      {options.map((opt) => {
        const isActive = value === opt.value
        const bg = opt.color || '#3b82f6'
        const shadowColor = opt.shadow || 'rgba(59, 130, 246, 0.3)'
        const shadow = isActive ? `0 4px 12px ${shadowColor}` : 'none'
        
        return (
           <button 
             key={opt.value}
             type="button"
             onClick={() => onChange(opt.value)} 
             style={{ 
               flex: 1, 
               padding: '10px 16px', 
               borderRadius: 10, 
               background: isActive ? bg : 'transparent', 
               color: isActive ? '#fff' : 'var(--text-secondary)', 
               fontWeight: 600, 
               border: 'none', 
               cursor: 'pointer', 
               transition: '0.2s', 
               boxShadow: shadow 
             }}>
             {opt.label}
           </button>
        )
      })}
    </div>
  )
}
