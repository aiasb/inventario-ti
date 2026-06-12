import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useAssets } from './AssetsContext'
import { useMasterData } from './MasterDataContext'
import { useAuth } from './AuthContext'
import { fetchProximasManutencoes } from '../lib/api'

export const ALERT_DEFAULTS = {
  warrantyEnabled:          true,
  warrantyDays:             30,
  maintenanceEnabled:       true,
  disabledMaintenanceTypes: [],
  dismissReminderDays:      7,
}

const CONFIG_KEY   = 'alert_config'
const dismissed_key = (userId) => `alert_dismissed_${userId}`

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const { user }               = useAuth()
  const { assets }             = useAssets()
  const { periodosManutencao } = useMasterData()

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY)
      return saved ? { ...ALERT_DEFAULTS, ...JSON.parse(saved) } : { ...ALERT_DEFAULTS }
    } catch {
      return { ...ALERT_DEFAULTS }
    }
  })

  const [dismissedRaw, setDismissedRaw] = useState([])
  const [maintenanceRows, setMaintenanceRows] = useState([])

  // Carrega dismissed do usuário logado
  useEffect(() => {
    if (!user?.id) { setDismissedRaw([]); return }
    try {
      const saved = localStorage.getItem(dismissed_key(user.id))
      setDismissedRaw(saved ? JSON.parse(saved) : [])
    } catch {
      setDismissedRaw([])
    }
  }, [user?.id])

  useEffect(() => {
    fetchProximasManutencoes()
      .then(rows => setMaintenanceRows(rows))
      .catch(() => {})
  }, [])

  const activeDismissed = useMemo(() => {
    const now       = Date.now()
    const windowMs  = config.dismissReminderDays * 86_400_000
    return dismissedRaw.filter(d => {
      const expiresAt = new Date(d.dismissed_at).getTime() + windowMs
      return expiresAt > now
    })
  }, [dismissedRaw, config.dismissReminderDays])

  const dismissedIds = useMemo(
    () => new Set(activeDismissed.map(d => d.alert_id)),
    [activeDismissed]
  )

  function persistDismissed(userId, next) {
    setDismissedRaw(next)
    localStorage.setItem(dismissed_key(userId), JSON.stringify(next))
  }

  async function saveConfig(patch) {
    const next = { ...config, ...patch }
    setConfig(next)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
  }

  async function dismissAlert(id) {
    if (!user?.id) return
    const now     = new Date().toISOString()
    const without = dismissedRaw.filter(d => d.alert_id !== id)
    persistDismissed(user.id, [...without, { alert_id: id, dismissed_at: now }])
  }

  async function clearDismissed() {
    if (!user?.id) return
    persistDismissed(user.id, [])
  }

  const periodicTypes = useMemo(
    () => periodosManutencao.items.filter(p => p.periodico && p.dias),
    [periodosManutencao.items]
  )

  const warrantyAlerts = useMemo(() => {
    if (!config.warrantyEnabled) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + config.warrantyDays)

    return assets
      .filter(a => a.status !== 'descartado' && a.warrantyExpiry)
      .flatMap(a => {
        const exp = new Date(a.warrantyExpiry.split('T')[0] + 'T00:00:00')
        if (exp > cutoff) return []
        const id = `warranty-${a.id}`
        if (dismissedIds.has(id)) return []
        const expired  = exp < today
        const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
        return [{
          id,
          type:      'warranty',
          severity:  expired ? 'error' : 'warning',
          assetId:   a.id,
          assetName: a.name,
          label: expired
            ? `Garantia vencida há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? 's' : ''}`
            : `Garantia vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`,
          date: a.warrantyExpiry,
        }]
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [assets, config.warrantyEnabled, config.warrantyDays, dismissedIds])

  const maintenanceAlerts = useMemo(() => {
    if (!config.maintenanceEnabled) return []
    return maintenanceRows
      .filter(r => r.status === 'vencido' || r.status === 'urgente')
      .filter(r => !(config.disabledMaintenanceTypes ?? []).includes(r.periodoTipo))
      .flatMap(r => {
        const id = `manut-${r.assetId}-${r.periodoId}`
        if (dismissedIds.has(id)) return []
        return [{
          id,
          type:        'maintenance',
          severity:    r.status === 'vencido' ? 'error' : 'warning',
          assetId:     r.assetId,
          assetName:   r.assetName,
          periodoTipo: r.periodoTipo,
          label: r.status === 'vencido'
            ? `${r.periodoTipo} vencida${r.daysLeft !== null ? ` (${Math.abs(r.daysLeft)}d)` : ''}`
            : `${r.periodoTipo} em ${r.daysLeft}d`,
        }]
      })
  }, [maintenanceRows, config.maintenanceEnabled, config.disabledMaintenanceTypes, dismissedIds])

  const allAlerts = useMemo(
    () => [...warrantyAlerts, ...maintenanceAlerts],
    [warrantyAlerts, maintenanceAlerts]
  )

  return (
    <AlertsContext.Provider value={{
      config,        saveConfig,
      allAlerts,     warrantyAlerts,  maintenanceAlerts,
      periodicTypes,
      dismissed:     activeDismissed,
      dismissAlert,  clearDismissed,
    }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}
