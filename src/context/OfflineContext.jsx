import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Network } from '@capacitor/network'
import { getQueue, dequeue, queueSize } from '../lib/offlineDB'
import { supabase } from '../lib/supabase'

const OfflineContext = createContext(null)

async function runQueueItem({ table, action, data, recordId }) {
  if (action === 'insert') {
    const { error } = await supabase.from(table).insert([data])
    if (error) throw error
  } else if (action === 'update') {
    const { error } = await supabase.from(table).update(data).eq('id', recordId)
    if (error) throw error
  } else if (action === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', recordId)
    if (error) throw error
  }
}

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
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

    busy.current = true
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
        // Fallback for web without Capacitor
        setIsOnline(navigator.onLine)
        const up   = () => { setIsOnline(true);  syncNow() }
        const down = () => setIsOnline(false)
        window.addEventListener('online',  up)
        window.addEventListener('offline', down)
      }
    }

    init()

    return () => {
      netListener?.remove()
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
