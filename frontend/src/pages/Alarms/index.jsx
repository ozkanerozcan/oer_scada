import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useAlarmStore from '@/stores/alarmStore'
import useTagStore from '@/stores/tagStore'
import useAuthStore from '@/stores/authStore'
import useUiStore from '@/stores/uiStore'

export default function Alarms() {
  const { t } = useTranslation()
  const { alarms, ackAlarm } = useAlarmStore()
  const tags = useTagStore(s => s.tags)
  const isOperatorOrHigher = useAuthStore(s => s.hasRole('operator'))
  const user = useAuthStore(s => s.user)

  const [tab, setTab] = useState('active') // active | history

  const activeRecords = alarms.filter(a => !a.ackAt || !a.clearedAt)
  const historyRecords = alarms.filter(a => a.ackAt && a.clearedAt)

  const displayList = tab === 'active' ? activeRecords : historyRecords

  const handleAck = (id) => {
    if (!isOperatorOrHigher) {
      useUiStore.getState().openLoginModal()
      return
    }
    ackAlarm(id, user?.username || 'unknown')
  }

  const formatTime = (ts) => ts ? new Date(ts).toLocaleString() : '—'

  return (
    <div className="fade-in" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <h2>{t('alarms.title')}</h2>
      </div>

      <div className="card flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <button 
            className={`btn ${tab === 'active' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ borderRadius: 20 }}
            onClick={() => setTab('active')}
          >
            {t('alarms.active')} ({activeRecords.length})
          </button>
          <button 
            className={`btn ${tab === 'history' ? 'btn-ghost' : 'btn-ghost'}`}
            style={{ borderRadius: 20, background: tab === 'history' ? 'var(--bg-tertiary)' : 'transparent', color: tab === 'history' ? '#fff': '' }}
            onClick={() => setTab('history')}
          >
            {t('alarms.history')}
          </button>
        </div>

        {/* List */}
        <div className="flex-col gap-3">
          {displayList.map(a => {
            const tag = tags.find(t => t.id === a.tagId)
            const isCritical = a.severity === 'critical'
            
            return (
              <div key={a.id} className="card flex justify-between items-center" style={{ padding: '12px 16px', borderLeft: `4px solid var(--${isCritical ? 'danger' : 'warning'})` }}>
                <div className="flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-${isCritical ? 'danger' : 'warning'}`}>
                      {t(`alarms.type.${a.type}`)}
                    </span>
                    <span style={{ fontWeight: 600 }}>{tag?.name || a.tagId}</span>
                    <span className="text-muted" style={{ fontSize: 13 }}>{a.message}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-secondary" style={{ fontSize: 12 }}>
                    <span>{t('alarms.triggeredAt')}: <span className="mono text-primary">{formatTime(a.triggeredAt)}</span></span>
                    {a.clearedAt && <span>{t('alarms.clearedAt')}: <span className="mono text-primary">{formatTime(a.clearedAt)}</span></span>}
                    {a.ackAt && <span>{t('alarms.ackedBy')}: <span className="text-primary">{a.ackBy}</span></span>}
                  </div>
                </div>

                {tab === 'active' && !a.ackAt && (
                  <button 
                    className="btn btn-ghost"
                    onClick={() => handleAck(a.id)}
                  >
                    ✓ {t('alarms.acknowledge')}
                  </button>
                )}
              </div>
            )
          })}

          {displayList.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              {t(tab === 'active' ? 'alarms.noActive' : 'common.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
