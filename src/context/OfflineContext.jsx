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
  const busy = useRef(false)

  const refreshCount = useCallback(async () => {
    const n = await queueSize()
    setPendingCount(n)
  }, [])

  const syncNow = useCallback(async () => {
    if (busy.current) return
    const n = await queueSize()
    if (n === 0) return

    busy.current  = true
    setIsSyncing(true)

    try {
      const queue = await getQueue()
      for (const item of queue) {
        try {
          await runQueueItem(item)
          await dequeue(item.qid)
        } catch (err) {
          console.warn('[Offline] sync item failed:', err.message)
        }
      }
      window.dispatchEvent(new CustomEvent('offline:synced'))
    } finally {
      busy.current = false
      setIsSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  useEffect(() => {
    refreshCount()

    let netListener

    const init = async () => {
      try {
        const status = await Network.getStatus()
        setIsOnline(status.connected)
        netListener = await Network.addListener('networkStatusChange', s => {
          setIsOnline(s.connected)
          if (s.connected) syncNow()
        })
      } catch {
        setIsOnline(navigator.onLine)
        const up   = () => { setIsOnline(true); syncNow() }
        const down = () => setIsOnline(false)
        window.addEventListener('online',  up)
        window.addEventListener('offline', down)
      }
    }

    init()
    return () => { netListener?.remove() }
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
