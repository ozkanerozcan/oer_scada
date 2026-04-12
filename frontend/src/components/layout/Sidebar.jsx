import { memo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useUiStore from '@/stores/uiStore'
import useAuthStore from '@/stores/authStore'
import useDashboardPagesStore from '@/stores/dashboardPagesStore'
import { LayoutDashboard, Users, Settings, X, Moon, Sun, Globe, LogOut, LogIn, User, Building2, Menu, HardDrive, Tags, Activity, ChevronDown, ChevronRight, Maximize, LayoutTemplate, SlidersHorizontal } from 'lucide-react'

// Static nav items (non-dashboard)
const STATIC_NAV = [
  { path: '/devices', label: 'Devices', icon: HardDrive },
  {
    label: 'Tags',
    icon: Tags,
    subItems: [
      { path: '/tags-management', label: 'Management', icon: Settings },
      { path: '/tags', label: 'Watch Table', icon: Activity },
    ]
  },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const Sidebar = memo(() => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const toggleSidebar = useUiStore(s => s.toggleSidebar)
  const theme = useUiStore(s => s.theme)
  const toggleTheme = useUiStore(s => s.toggleTheme)
  const lang = useUiStore(s => s.lang)
  const setLang = useUiStore(s => s.setLang)
  const openLoginModal = useUiStore(s => s.openLoginModal)

  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const hasRole = useAuthStore(s => s.hasRole)
  const isAdmin = hasRole('admin')

  const allPages = useDashboardPagesStore(s => s.pages)
  const visiblePages = isAdmin ? allPages : allPages.filter(p => p.isVisible)

  // Build dynamic nav: admin sees builder + management; all users see published dashboards
  const dashboardSubItems = visiblePages.map(p => ({
    path: `/dashboards/${p.id}`,
    label: p.name,
    icon: LayoutDashboard,
  }))

  const [openMenus, setOpenMenus] = useState({ Dashboards: visiblePages.length > 0 })

  const width = sidebarOpen ? '260px' : '88px'

  const toggleLang = () => {
    setLang(lang === 'tr' ? 'en' : 'tr')
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const toggleSubMenu = (label) => {
    if (!sidebarOpen) toggleSidebar()
    // Accordion style: close others, toggle the clicked one
    setOpenMenus(p => p[label] ? {} : { [label]: true })
  }

  return (
    <aside
      style={{
        width,
        backgroundColor: 'var(--bg-card)',
        transition: 'width var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        height: '100%',
        color: 'var(--text-secondary)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
        position: 'relative',
        borderRight: '1px solid var(--border)'
      }}
    >
      {/* Brand Header */}
      <div
        className="flex items-center"
        style={{
          padding: sidebarOpen ? '24px 24px 0 24px' : '24px 0 0 0',
          justifyContent: sidebarOpen ? 'space-between' : 'flex-start',
          flexDirection: sidebarOpen ? 'row' : 'column',
          alignItems: 'center',
          gap: sidebarOpen ? '0' : '24px',
          minHeight: '80px'
        }}
      >
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Menu Toggle"
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            color: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: sidebarOpen ? 'auto' : '40px', height: sidebarOpen ? 'auto' : '40px',
            background: sidebarOpen ? 'transparent' : 'var(--bg-card)',
            border: sidebarOpen ? 'none' : '1px solid var(--border)',
            borderRadius: sidebarOpen ? '0' : '10px',
            boxShadow: sidebarOpen ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <Building2 size={24} strokeWidth={2.5} />
          </div>
          {sidebarOpen && (
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              Barcode Track
            </span>
          )}
        </div>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Section */}
      <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ── Dashboards accordion (Builder, Management + dynamic saved pages) ───── */}
        {(visiblePages.length > 0 || isAdmin) && (() => {
          const isSubActive = visiblePages.some(p => pathname === `/dashboards/${p.id}`) || pathname === '/' || pathname === '/dashboard-management'
          const isOpen = openMenus['Dashboards'] || false
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                onClick={() => toggleSubMenu('Dashboards')}
                title={!sidebarOpen ? 'Dashboards' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '12px 16px', borderRadius: '12px',
                  color: isSubActive ? '#14b8a6' : 'var(--text-muted)',
                  background: isSubActive && !isOpen ? 'linear-gradient(90deg, rgba(20,184,166,0.1) 0%, rgba(20,184,166,0) 100%)' : 'transparent',
                  fontWeight: isSubActive ? 600 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
                  transition: 'all 0.2s', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => { if (!isSubActive) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { if (!isSubActive) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <LayoutDashboard size={22} strokeWidth={isSubActive || isOpen ? 2.5 : 2} style={{ color: isSubActive || isOpen ? '#14b8a6' : 'var(--text-secondary)', flexShrink: 0 }} />
                {sidebarOpen && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <span style={{ fontSize: '15px' }}>Dashboards</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 100, color: 'var(--text-muted)' }}>
                        {visiblePages.length}
                      </span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>
                )}
              </div>
              {isOpen && sidebarOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: 34 }}>

                  {/* Admin Tools inside accordion */}
                  {isAdmin && (
                    <>


                      <Link
                        to="/dashboard-management"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '7px 12px', borderRadius: '8px',
                          color: pathname === '/dashboard-management' ? '#a855f7' : 'var(--text-secondary)',
                          background: pathname === '/dashboard-management' ? 'rgba(168,85,247,0.08)' : 'transparent',
                          fontWeight: pathname === '/dashboard-management' ? 600 : 500,
                          textDecoration: 'none', fontSize: '13px', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (pathname !== '/dashboard-management') e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { if (pathname !== '/dashboard-management') e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <SlidersHorizontal size={14} style={{ flexShrink: 0 }} />
                        <span>Management</span>
                      </Link>

                      {/* Divider for saved dashboards */}
                      {visiblePages.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px 4px 0', opacity: 0.5 }} />}
                    </>
                  )}

                  {/* Dynamic Saved Dashboards */}
                  {visiblePages.map(p => {
                    const isActive = pathname === `/dashboards/${p.id}`
                    return (
                      <Link
                        key={p.id}
                        to={`/dashboards/${p.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '7px 12px', borderRadius: '8px',
                          color: isActive ? '#14b8a6' : 'var(--text-secondary)',
                          background: isActive ? 'rgba(20,184,166,0.08)' : 'transparent',
                          fontWeight: isActive ? 600 : 500,
                          textDecoration: 'none', fontSize: '13px',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                        title={p.name}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <LayoutDashboard size={14} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        {!p.isVisible && isAdmin && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--warning)', background: 'var(--warning-muted)', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>HIDDEN</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Static nav items ─────────────────────────────── */}
        {STATIC_NAV.map((item) => {
          if (item.subItems) {
            const isSubActive = item.subItems.some(sub => pathname === sub.path || (sub.path !== '/' && pathname.startsWith(sub.path)))
            const isOpen = openMenus[item.label] || false
            const Icon = item.icon
            return (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  onClick={() => toggleSubMenu(item.label)}
                  title={!sidebarOpen ? item.label : ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '12px 16px', borderRadius: '12px',
                    color: isSubActive ? '#14b8a6' : 'var(--text-muted)',
                    background: isSubActive && !isOpen ? 'linear-gradient(90deg, rgba(20,184,166,0.1) 0%, rgba(20,184,166,0) 100%)' : 'transparent',
                    fontWeight: isSubActive ? 600 : 500,
                    cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
                    transition: 'all 0.2s', justifyContent: sidebarOpen ? 'flex-start' : 'center', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSubActive) e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { if (!isSubActive) e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Icon size={22} strokeWidth={isSubActive || isOpen ? 2.5 : 2} style={{ color: isSubActive || isOpen ? '#14b8a6' : 'var(--text-secondary)', flexShrink: 0 }} />
                  {sidebarOpen && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <span style={{ fontSize: '15px' }}>{item.label}</span>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  )}
                </div>
                {isOpen && sidebarOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 34 }}>
                    {item.subItems.map(sub => {
                      const isActive = pathname === sub.path
                      const SubIcon = sub.icon
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={e => {
                            if (sub.path === '/tags-management' && !isAdmin) {
                              e.preventDefault(); openLoginModal(sub.path)
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', borderRadius: '8px',
                            color: isActive ? '#14b8a6' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(20,184,166,0.08)' : 'transparent',
                            fontWeight: isActive ? 600 : 500,
                            textDecoration: 'none', fontSize: '14px', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                        >
                          <SubIcon size={16} /><span>{sub.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={e => {
                setOpenMenus({})
                if ((item.path === '/users' || item.path === '/devices') && !isAdmin) {
                  e.preventDefault(); openLoginModal(item.path)
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '12px 16px', borderRadius: '12px',
                color: isActive ? '#14b8a6' : 'var(--text-muted)',
                background: isActive ? 'linear-gradient(90deg, rgba(20,184,166,0.1) 0%, rgba(20,184,166,0) 100%)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                transition: 'all 0.2s', justifyContent: sidebarOpen ? 'flex-start' : 'center', position: 'relative',
              }}
              title={!sidebarOpen ? item.label : ''}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4, background: '#14b8a6', borderRadius: '0 4px 4px 0' }} />}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? '#14b8a6' : 'var(--text-secondary)', flexShrink: 0 }} />
              {sidebarOpen && <span style={{ fontSize: '15px' }}>{item.label}</span>}
            </Link>
          )
        })}
      </nav>


      {/* Footer Section */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* User Profile */}
        <div
          onClick={() => navigate('/settings')}
          title={user?.role === 'guest' ? 'Giriş yapınız' : 'Profile Git'}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            cursor: 'pointer'
          }}
        >
          {sidebarOpen ? (
            <>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: '#14b8a6', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <User size={20} />
              </div>
              <div className="flex-col" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.role === 'guest' ? 'Ziyaretçi' : (user?.fullName || user?.username)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.role === 'admin' ? 'Admin' : (user?.role === 'guest' ? 'Misafir' : 'Operatör')}
                </span>
              </div>
            </>
          ) : (
            <div style={{ background: '#14b8a6', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} />
            </div>
          )}
        </div>

        {/* Settings row: Theme & Lang & Logout */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            flexDirection: sidebarOpen ? 'row' : 'column',
            gap: sidebarOpen ? 0 : 12,
            marginTop: '4px'
          }}
        >
          <button
            onClick={toggleTheme}
            title="Theme Toggle"
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', flexShrink: 0
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={toggleLang}
            title="Language Toggle"
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '0 12px', height: '40px', display: sidebarOpen || true ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: '6px',
              cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', flexShrink: 0
            }}
          >
            <Globe size={16} />
            {sidebarOpen && <span>{lang.toUpperCase()}</span>}
          </button>

          <button
            onClick={toggleFullscreen}
            title="Tam Ekran"
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', flexShrink: 0
            }}
          >
            <Maximize size={18} />
          </button>

          {user?.role === 'guest' ? (
            <button
              onClick={openLoginModal}
              title="Giriş Yap"
              style={{
                background: '#e0f2fe', border: '1px solid transparent', borderRadius: '10px',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#0284c7', flexShrink: 0
              }}
            >
              <LogIn size={18} />
            </button>
          ) : (
            <button
              onClick={logout}
              title="Çıkış Yap"
              style={{
                background: 'var(--danger-muted)', border: '1px solid transparent', borderRadius: '10px',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--danger)', flexShrink: 0
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

      </div>
    </aside>
  )
})

export default Sidebar
