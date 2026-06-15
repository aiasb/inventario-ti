import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  fetchAtivos,
  insertAtivo,
  updateAtivo,
  deleteAtivo,
  insertManutencao,
  deleteManutencao,
  assetToDb,
  maintenanceToDb,
} from '../lib/api'
import { useOffline } from './OfflineContext'
import { useAuth } from './AuthContext'
import { cacheAll, getAll, putOne, delOne, enqueue } from '../lib/offlineDB'

const AssetsContext = createContext(null)

export function AssetsProvider({ children, onReady, onError }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOnline, refreshCount } = useOffline()
  const { profile } = useAuth()

  const canWriteRef = useRef(false)
  canWriteRef.current = profile?.role === 'admin' || profile?.role === 'user'

  function requireWrite() {
    if (!canWriteRef.current) throw new Error('Sem permissão para esta operação.')
  }

  // Ref to read current assets without stale closure
  const assetsRef = useRef([])
  useEffect(() => { assetsRef.current = assets }, [assets])

  const loadData = useCallback(async () => {
    let hadCache = false

    // 1. Show cached data immediately for instant feedback
    try {
      const cached = await getAll('assets')
      if (cached.length > 0) {
        hadCache = true
        setAssets(cached)
        setLoading(false)
        onReady?.()
      }
    } catch (_) {}

    // 2. Refresh from server in background
    try {
      const fresh = await fetchAtivos()
      // Preserve pending (not-yet-synced) maintenances so they stay visible
      // while they're still waiting in the sync queue.
      // Exclude pending items whose ID already exists on the server (already synced).
      const withPending = fresh.map(serverAsset => {
        const local = assetsRef.current.find(a => a.id === serverAsset.id)
        if (!local) return serverAsset
        const serverMaints = serverAsset.maintenances ?? []
        const serverIds = new Set(serverMaints.map(m => m.id))
        const pendingMaints = (local.maintenances ?? []).filter(m => m._pending && !serverIds.has(m.id))
        if (pendingMaints.length === 0) return serverAsset
        return { ...serverAsset, maintenances: [...serverMaints, ...pendingMaints] }
      })
      setAssets(withPending)
      cacheAll('assets', withPending)
      setLoading(false)
      onReady?.()
    } catch (err) {
      setLoading(false)
      if (!hadCache) onError?.(err.message)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    let active = true
    loadData()
    const onSynced = () => { if (active) loadData() }
    window.addEventListener('offline:synced', onSynced)
    return () => {
      active = false
      window.removeEventListener('offline:synced', onSynced)
    }
  }, []) // eslint-disable-line

  // ─── addAsset ───────────────────────────────────────────────────────────────

  const addAsset = useCallback(async (asset) => {
    requireWrite()
    if (isOnline) {
      const newAsset = await insertAtivo(asset)
      setAssets(prev => [...prev, newAsset])
      putOne('assets', newAsset)
      return newAsset
    }

    const id = crypto.randomUUID()
    const newAsset = { id, ...asset, maintenances: [], _pending: true }
    setAssets(prev => [...prev, newAsset])
    await putOne('assets', newAsset)
    await enqueue({ table: 'ativos', action: 'insert', data: { id, ...assetToDb(asset) } })
    await refreshCount()
    return newAsset
  }, [isOnline, refreshCount])

  // ─── updateAsset ────────────────────────────────────────────────────────────

  const updateAsset = useCallback(async (id, updates) => {
    requireWrite()
    if (isOnline) {
      const updated = await updateAtivo(id, updates)
      setAssets(prev => {
        const next = prev.map(a => a.id === id ? { ...a, ...updated } : a)
        const full = next.find(a => a.id === id)
        if (full) putOne('assets', full)
        return next
      })
      return
    }

    const current = assetsRef.current.find(a => a.id === id)
    const merged = { ...current, ...updates, _pending: true }
    setAssets(prev => prev.map(a => a.id === id ? merged : a))
    await putOne('assets', merged)
    await enqueue({ table: 'ativos', action: 'update', recordId: id, data: assetToDb(updates) })
    await refreshCount()
  }, [isOnline, refreshCount])

  // ─── deleteAsset ────────────────────────────────────────────────────────────

  const deleteAsset = useCallback(async (id) => {
    requireWrite()
    if (isOnline) {
      await deleteAtivo(id)
    } else {
      await enqueue({ table: 'ativos', action: 'delete', recordId: id })
      await refreshCount()
    }
    setAssets(prev => prev.filter(a => a.id !== id))
    delOne('assets', id)
  }, [isOnline, refreshCount])

  // ─── addMaintenance ─────────────────────────────────────────────────────────

  const addMaintenance = useCallback(async (assetId, maintenance, assetUpdates = {}) => {
    requireWrite()
    if (isOnline) {
      const record = await insertManutencao(assetId, maintenance, assetUpdates)
      setAssets(prev => {
        const next = prev.map(a => {
          if (a.id !== assetId) return a
          const full = { ...a, ...assetUpdates, maintenances: [...(a.maintenances ?? []), record] }
          putOne('assets', full)
          return full
        })
        return next
      })
      return record
    }

    const id = crypto.randomUUID()
    const record = { id, ...maintenance, createdAt: new Date().toISOString(), _pending: true }
    const current = assetsRef.current.find(a => a.id === assetId)
    const merged = {
      ...current,
      ...assetUpdates,
      maintenances: [...(current?.maintenances ?? []), record],
      _pending: true,
    }
    setAssets(prev => prev.map(a => a.id === assetId ? merged : a))
    await putOne('assets', merged)
    await enqueue({ table: 'manutencoes', action: 'insert', data: { id, ...maintenanceToDb(assetId, maintenance) } })
    if (Object.keys(assetUpdates).length > 0) {
      await enqueue({ table: 'ativos', action: 'update', recordId: assetId, data: assetToDb(assetUpdates) })
    }
    await refreshCount()
    return record
  }, [isOnline, refreshCount])

  // ─── deleteMaintenance ──────────────────────────────────────────────────────

  const deleteMaintenance = useCallback(async (assetId, maintenanceId) => {
    requireWrite()
    if (isOnline) {
      await deleteManutencao(maintenanceId)
    } else {
      await enqueue({ table: 'manutencoes', action: 'delete', recordId: maintenanceId })
      await refreshCount()
    }
    setAssets(prev => {
      const next = prev.map(a =>
        a.id === assetId
          ? { ...a, maintenances: (a.maintenances ?? []).filter(m => m.id !== maintenanceId) }
          : a
      )
      const full = next.find(a => a.id === assetId)
      if (full) putOne('assets', full)
      return next
    })
  }, [isOnline, refreshCount])

  return (
    <AssetsContext.Provider value={{
      assets,
      loading,
      addAsset,
      updateAsset,
      deleteAsset,
      addMaintenance,
      deleteMaintenance,
      reload: loadData,
    }}>
      {children}
    </AssetsContext.Provider>
  )
}

export function useAssets() {
  const ctx = useContext(AssetsContext)
  if (!ctx) throw new Error('useAssets must be used within AssetsProvider')
  return ctx
}
