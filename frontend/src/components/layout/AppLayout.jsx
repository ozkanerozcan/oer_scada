import { memo, useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { connectWS } from '@/services/ws.service'
import Sidebar from './Sidebar'
import LoginModal from '@/components/modals/LoginModal'
import useDashboardPagesStore from '@/stores/dashboardPagesStore'

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })
  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) setMatches(media.matches)
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])
  return matches
}

function BottomNavLink({ icon, label, to, isActive }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px',
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? '#fff' : 'var(--text-muted)',
        textDecoration: 'none',
        borderRadius: 8,
        minWidth: 60,
        minHeight: 60,
        fontSize: 10,
        fontWeight: 600
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

const AppLayout = memo(() => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isMobile = useMediaQuery('(max-width: 639px)')
  const location = useLocation()
  const safeBottom = isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '0px'
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const backendBase = apiUrl.replace(/\/api\/?$/, '')
    const wsUrl = backendBase.replace(/^http/, 'ws') + '/ws'
    connectWS(wsUrl)
    
    // Load dashboards from backend on startup
    useDashboardPagesStore.getState().loadDashboards()
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <>
      <style>{`
        body {
          margin: 0;
          overflow: hidden;
        }
        .app-container {
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        .main-content {
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        .main-content::-webkit-scrollbar {
          width: 6px;
        }
        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
      
      <div className="app-container flex" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {isDesktop && !isFullscreen && <Sidebar />}
        
        {isMobile && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            padding: '8px 16px',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom))'
          }}>
            <BottomNavLink icon="📊" label="Dashboard" to="/press-500t-pres-1" isActive={location.pathname === '/press-500t-pres-1'} />
          </div>
        )}
        
        <main className="main-content" style={{ 
          flex: isDesktop ? 1 : 'auto',
          marginLeft: isDesktop ? 0 : 0,
          paddingLeft: isDesktop ? 0 : '16px',
          paddingRight: isDesktop ? 0 : '16px',
          paddingBottom: safeBottom,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'var(--bg-primary)'
        }}>
          <Outlet />
        </main>
      </div>
      <LoginModal />
    </>
  )
})

export default AppLayout
