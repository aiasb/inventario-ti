import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Network } from '@capacitor/network'
import { getQueue, dequeue, queueSize } from '../lib/offlineDB'
import { apiFetch } from '../lib/api-client'

const OfflineContext = createContext(null)

async function runQueueItem({ table, action, data, recordId }) {
  if (table === 'ativos') {
    if (action === 'insert') {
      await apiFetch('/api/ativos', { method: 'POST', body: JSON.stringify(data) })
    } else if (action === 'update') {
      await apiFetch(`/api/ativos/${recordId}`, { method: 'PUT', body: JSON.stringify(data) })
    } else if (action === 'delete') {
      await apiFetch(`/api/ativos/${recordId}`, { method: 'DELETE' })
    }
  } else if (table === 'manutencoes') {
    if (action === 'insert') {
      const { ativo_id, ...rest } = data
      await apiFetch(`/api/ativos/${ativo_id}/manutencoes`, { method: 'POST', body: JSON.stringify(rest) })
    } else if (action === 'delete') {
      await apiFetch(`/api/manutencoes/${recordId}`, { method: 'DELETE' })
    }
  }
}

export function OfflineProvider({ children }) {
  const [isOnline,     setIsOnline]     = useState(true)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const busy       = useRef(false)
  const retryTimer = useRef(null)

  const refreshCount = useCallback(async () => {
    const n = await queueSize()
    setPendingCount(n)
  }, [])

  const syncNow = useCallback(async () => {
    if (busy.current) return
    const n = await queueSize()
    if (n === 0) return

    busy.current = true
    setIsSyncing(true)
    clearTimeout(retryTimer.current)

    let anySuccess = false
    try {
      const queue = await getQueue()
      for (const item of queue) {
        try {
          await runQueueItem(item)
          await dequeue(item.qid)
          anySuccess = true
        } catch (err) {
          console.warn('[Offline] sync item failed:', err.message)
        }
      }
      // Only notify if at least one item synced — avoids overwriting local state when all fail
      if (anySuccess) {
        window.dispatchEvent(new CustomEvent('offline:synced'))
      }
    } finally {
      busy.current = false
      setIsSyncing(false)
      await refreshCount()

      // Schedule retry for any items that still failed
      const remaining = await queueSize()
      if (remaining > 0) {
        retryTimer.current = setTimeout(() => syncNow(), 30_000)
      }
    }
  }, [refreshCount])

  useEffect(() => {
    refreshCount()

    let netListener

    // Small delay lets the Android network stack stabilize before hitting the server
    const scheduleSync = () => {
      clearTimeout(retryTimer.current)
      retryTimer.current = setTimeout(() => syncNow(), 1500)
    }

    const init = async () => {
      try {
        const status = await Network.getStatus()
        setIsOnline(status.connected)
        netListener = await Network.addListener('networkStatusChange', s => {
          setIsOnline(s.connected)
          if (s.connected) scheduleSync()
          else clearTimeout(retryTimer.current)
        })
      } catch {
        setIsOnline(navigator.onLine)
        const up   = () => { setIsOnline(true);  scheduleSync() }
        const down = () => { setIsOnline(false); clearTimeout(retryTimer.current) }
        window.addEventListener('online',  up)
        window.addEventListener('offline', down)
      }

      // Also sync after the user logs in (covers the case where they had to re-authenticate)
      const onAuthReady = () => scheduleSync()
      window.addEventListener('auth:signed-in', onAuthReady)
    }

    init()
    return () => {
      netListener?.remove()
      clearTimeout(retryTimer.current)
    }
  }, []) // eslint-disable-line

  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, pendingCount, syncNow, refreshCount }}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}
