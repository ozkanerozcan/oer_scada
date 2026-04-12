import { memo, useState } from 'react'
import { wsSend } from '@/services/ws.service'
import useAuthStore from '@/stores/authStore'
import useUiStore from '@/stores/uiStore'

const ControlButton = memo(({ tag, valueObj, disabled }) => {
  const [loading, setLoading] = useState(false)
  const isChecked = Boolean(valueObj?.value)
  
  const hasRole = useAuthStore(s => s.hasRole)
  const openLoginModal = useUiStore(s => s.openLoginModal)

  const handleToggle = () => {
    if (disabled || loading) return
    
    // Popup login modal if they do not have sufficient privileges
    if (!hasRole('operator')) {
      openLoginModal()
      return
    }
    
    // Simple confirm dialog logic can be expanded
    if (window.confirm(`"${tag.name}" değerini ${isChecked ? 'Kapat' : 'Aç'} olarak değiştirmek istediğinize emin misiniz?`)) {
      setLoading(true)
      wsSend('tag:write', { tagId: tag.id, value: !isChecked })
      
      // Reset loading state after a timeout in case WS response is lost
      setTimeout(() => setLoading(false), 1500)
    }
  }

  // Cancel loading when actual value updates to match the pending state
  if (loading && valueObj && Boolean(valueObj.value) !== isChecked) {
    setLoading(false)
  }

  const btnClass = isChecked ? 'btn-danger' : 'btn-primary'
  
  return (
    <button 
      className={`btn ${btnClass}`} 
      onClick={handleToggle} 
      disabled={disabled || loading}
      style={{ minWidth: 80, justifyContent: 'center' }}
    >
      {loading ? '...' : isChecked ? 'Kapat' : 'Aç'}
    </button>
  )
})

export default ControlButton

