import PropTypes from 'prop-types'
import { Lock } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import useUiStore from '@/stores/uiStore'

export default function AdminGuard({ children }) {
  const hasRole      = useAuthStore(s => s.hasRole)
  const openLoginModal = useUiStore(s => s.openLoginModal)

  if (hasRole('admin')) return children

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      background: 'var(--bg-primary)',
      padding: 32,
    }}>
      {/* Icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'var(--danger-muted)',
        border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--danger)',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        <Lock size={32} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
          Admin Access Required
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          This page is restricted to administrators only. Please sign in with an admin account to continue.
        </p>
      </div>

      <button
        onClick={() => openLoginModal()}
        className="btn btn-primary"
        style={{ padding: '10px 28px', fontSize: 14 }}
      >
        Sign In
      </button>
    </div>
  )
}

AdminGuard.propTypes = {
  children: PropTypes.node.isRequired,
}
