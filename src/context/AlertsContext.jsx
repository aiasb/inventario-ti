import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useAssets } from './AssetsContext'
import { useMasterData } from './MasterDataContext'
import { useAuth } from './AuthContext'
import { fetchProximasManutencoes } from '../lib/api'
import { supabase } from '../lib/supabase'

export const ALERT_DEFAULTS = {
  warrantyEnabled:          true,
  warrantyDays:             30,
  maintenanceEnabled:       true,
  disabledMaintenanceTypes: [],
  dismissReminderDays:      7,
}

function rowToConfig(row) {
  return {
    warrantyEnabled:          row.warranty_enabled,
    warrantyDays:             row.warranty_days,
    maintenanceEnabled:       row.maintenance_enabled,
    disabledMaintenanceTypes: row.disabled_maintenance_types ?? [],
    dismissReminderDays:      row.dismiss_reminder_days,
  }
}

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const { user }               = useAuth()
  const { assets }             = useAssets()
  const { periodosManutencao } = useMasterData()

  const [config, setConfig]         = useState({ ...ALERT_DEFAULTS })
  const [dismissedRaw, setDismissedRaw] = useState([]) // { alert_id, dismissed_at }[]
  const [maintenanceRows, setMaintenanceRows] = useState([])

  // Carrega config global
  useEffect(() => {
    supabase
      .from('alert_config')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') return // sem row = defaults
        if (data) setConfig(rowToConfig(data))
      })
  }, [])

  // Carrega dismissed do usuário logado
  useEffect(() => {
    if (!user?.id) { setDismissedRaw([]); return }
    supabase
      .from('alert_dismissed')
      .select('alert_id, dismissed_at')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) { console.error('alert_dismissed load:', error); return }
        setDismissedRaw(data ?? [])
      })
  }, [user?.id])

  useEffect(() => {
    fetchProximasManutencoes()
      .then(rows => setMaintenanceRows(rows))
      .catch(() => {})
  }, [])

  // Filtra dispensados ainda dentro da janela de snooze
  const activeDismissed = useMemo(() => {
    const now = Date.now()
    const windowMs = config.dismissReminderDays * 86_400_000
    return dismissedRaw.filter(d => {
      const expiresAt = new Date(d.dismissed_at).getTime() + windowMs
      return expiresAt > now
    })
  }, [dismissedRaw, config.dismissReminderDays])

  const dismissedIds = useMemo(
    () => new Set(activeDismissed.map(d => d.alert_id)),
    [activeDismissed]
  )

  // Salva config global (admin only via SECURITY DEFINER RPC)
  async function saveConfig(patch) {
    const next = { ...config, ...patch }
    setConfig(next) // optimistic
    const { error } = await supabase.rpc('save_alert_config', {
      p_warranty_enabled:            next.warrantyEnabled,
      p_warranty_days:               next.warrantyDays,
      p_maintenance_enabled:         next.maintenanceEnabled,
      p_disabled_maintenance_types:  next.disabledMaintenanceTypes,
      p_dismiss_reminder_days:       next.dismissReminderDays,
    })
    if (error) {
      setConfig(config) // rollback
      throw new Error(error.message)
    }
  }

  async function dismissAlert(id) {
    if (!user?.id) return
    const now = new Date().toISOString()
    setDismissedRaw(prev => {
      const without = prev.filter(d => d.alert_id !== id)
      return [...without, { alert_id: id, dismissed_at: now }]
    })
    const { error } = await supabase
      .from('alert_dismissed')
      .upsert(
        { user_id: user.id, alert_id: id, dismissed_at: now },
        { onConflict: 'user_id,alert_id' }
      )
    if (error) {
      console.error('dismissAlert:', error)
      setDismissedRaw(prev => prev.filter(d => d.alert_id !== id)) // rollback
    }
  }

  async function clearDismissed() {
    if (!user?.id) return
    const backup = dismissedRaw
    setDismissedRaw([]) // optimistic
    const { error } = await supabase
      .from('alert_dismissed')
      .delete()
      .eq('user_id', user.id)
    if (error) {
      console.error('clearDismissed:', error)
      setDismissedRaw(backup) // rollback
    }
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
        const exp = new Date(a.warrantyExpiry + 'T00:00:00')
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
      dismissed:     activeDismissed, // { alert_id, dismissed_at }[]
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
