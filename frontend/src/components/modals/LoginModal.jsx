import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'
import useUiStore from '@/stores/uiStore'

export default function LoginModal() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loginSuccess } = useAuthStore()
  const { loginModalOpen, closeLoginModal, loginRedirectPath } = useUiStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!loginModalOpen) return null

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    setTimeout(() => {
      let success = false
      if (username === 'admin' && password === 'admin') {
        loginSuccess({ id: 'u1', username: 'admin', role: 'admin', fullName: 'Sistem Yöneticisi' }, 'mock-jwt-token')
        success = true
      } else if (username === 'operator' && password === '123') {
        loginSuccess({ id: 'u2', username: 'operator', role: 'operator', fullName: 'Vardiya Operatörü' }, 'mock-jwt-token')
        success = true
      } else {
        setError(t('auth.loginError'))
      }
      
      setLoading(false)
      
      if (success) {
        if (loginRedirectPath) {
          navigate(loginRedirectPath)
        }
        closeLoginModal()
      }
    }, 600)
  }

  const handleClose = () => {
    setError('')
    setUsername('')
    setPassword('')
    closeLoginModal()
  }

  return (
    <div 
      className="flex items-center" 
      style={{ 
        justifyContent: 'center', 
        position: 'fixed', 
        top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div 
        className="card fade-in" 
        style={{ width: '100%', maxWidth: 360 }}
        onClick={e => e.stopPropagation()} // Prevent close when clicking inside modal
      >
        <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20 }}>{t('auth.login')}</h2>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={handleClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex-col gap-3">
          <div>
            <input 
              className="input" 
              type="text" 
              placeholder={t('auth.username')}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input 
              className="input" 
              type="password" 
              placeholder={t('auth.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px 16px', marginTop: 8 }}>
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  )
}
