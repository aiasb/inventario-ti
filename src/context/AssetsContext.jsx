import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  fetchAtivos,
  insertAtivo,
  updateAtivo,
  deleteAtivo,
  insertManutencao,
  deleteManutencao,
} from '../lib/api'

const AssetsContext = createContext(null)

export function AssetsProvider({ children, onReady, onError }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  // Carrega todos os ativos (com manutenções) ao montar
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAtivos()
      .then(data => {
        if (!cancelled) {
          setAssets(data)
          setLoading(false)
          onReady?.()
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoading(false)
          onError?.(err.message)
        }
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addAsset = useCallback(async (asset) => {
    const newAsset = await insertAtivo(asset)
    setAssets(prev => [...prev, newAsset])
    return newAsset
  }, [])

  const updateAsset = useCallback(async (id, updates) => {
    const updated = await updateAtivo(id, updates)
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
  }, [])

  const deleteAsset = useCallback(async (id) => {
    await deleteAtivo(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const addMaintenance = useCallback(async (assetId, maintenance, assetUpdates = {}) => {
    const record = await insertManutencao(assetId, maintenance, assetUpdates)
    setAssets(prev => prev.map(a => {
      if (a.id !== assetId) return a
      return {
        ...a,
        ...assetUpdates,
        maintenances: [...(a.maintenances ?? []), record],
      }
    }))
    return record
  }, [])

  const deleteMaintenance = useCallback(async (assetId, maintenanceId) => {
    await deleteManutencao(maintenanceId)
    setAssets(prev => prev.map(a =>
      a.id === assetId
        ? { ...a, maintenances: (a.maintenances ?? []).filter(m => m.id !== maintenanceId) }
        : a
    ))
  }, [])

  return (
    <AssetsContext.Provider value={{
      assets,
      loading,
      addAsset,
      updateAsset,
      deleteAsset,
      addMaintenance,
      deleteMaintenance,
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
