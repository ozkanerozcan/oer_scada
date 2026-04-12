import { memo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import useUiStore from '@/stores/uiStore'
import useAlarmStore from '@/stores/alarmStore'
import AlarmBadge from '@/components/common/AlarmBadge'

const NAV_LABELS = {
  '/': 'nav.dashboard',
  '/tags': 'nav.tags',
  '/trends': 'nav.trends',
  '/alarms': 'nav.alarms',
  '/reports': 'nav.reports',
  '/devices': 'nav.devices',
  '/settings': 'nav.settings',
}

const TopHeader = memo(({ isFullscreen }) => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  
  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const activeAlarmCount = useAlarmStore(s => s.getActiveCount())

  const getPageTitle = () => {
    // Exact match
    if (NAV_LABELS[pathname]) return t(NAV_LABELS[pathname])
    // Partial match for subroutes
    const matchedKey = Object.keys(NAV_LABELS).find(k => k !== '/' && pathname.startsWith(k))
    if (matchedKey) return t(NAV_LABELS[matchedKey])
    
    return t('nav.dashboard')
  }

  return (
    <header 
      className="flex items-center justify-between"
      style={{ 
        height: 'var(--header-height)', 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div className="flex items-center gap-4">
        {/* Hamburger */}
        <button 
          className="btn btn-ghost" 
          onClick={toggleSidebar}
          style={{ padding: '6px 10px', fontSize: 18, color: 'var(--text-secondary)' }}
          title={t('common.toggleMenu')}
        >
          ☰
        </button>
        
        {/* Breadcrumb / Page Title */}
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AlarmBadge count={activeAlarmCount} severity="critical" />
        {isFullscreen && (
          <button
            onClick={() => document.exitFullscreen()}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
            }}
          >
            <X size={24} />
          </button>
        )}
      </div>
    </header>
  )
})

export default TopHeader
