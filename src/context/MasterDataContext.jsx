import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  responsaveisApi,
  setoresApi,
  categoriasApi,
  marcasApi,
  situacoesApi,
  analistasApi,
  periodosManutencaoApi,
} from '../lib/api'
import { useOffline } from './OfflineContext'
import { useAuth } from './AuthContext'
import { cacheAll, getAll, putOne, delOne } from '../lib/offlineDB'

const MasterDataContext = createContext(null)

function useCrudEntity(api, storeName, onError) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const { isOnline } = useOffline()
  const { profile } = useAuth()

  const loadData = useCallback(async () => {
    let hadCache = false

    try {
      const cached = await getAll(storeName)
      if (cached.length > 0) {
        hadCache = true
        setItems(cached)
        setLoading(false)
      }
    } catch (_) {}

    try {
      const fresh = await api.fetch()
      setItems(fresh)
      cacheAll(storeName, fresh)
      setLoading(false)
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

  const canWrite = profile?.role === 'admin' || profile?.role === 'user'

  const requirePermission = () => {
    if (!canWrite) throw new Error('Sem permissão para esta operação.')
    if (!isOnline) throw new Error('Esta operação requer conexão com a internet.')
  }

  const add = useCallback(async (item) => {
    requirePermission()
    const created = await api.insert(item)
    setItems(prev => [...prev, created])
    putOne(storeName, created)
    return created
  }, [api, isOnline, storeName]) // eslint-disable-line

  const update = useCallback(async (id, patch) => {
    requirePermission()
    const updated = await api.update(id, patch)
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...updated } : i)
      const full = next.find(i => i.id === id)
      if (full) putOne(storeName, full)
      return next
    })
  }, [api, isOnline, storeName]) // eslint-disable-line

  const remove = useCallback(async (id) => {
    requirePermission()
    await api.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
    delOne(storeName, id)
  }, [api, isOnline, storeName]) // eslint-disable-line

  return { items, loading, add, update, remove }
}

export function MasterDataProvider({ children, onReady, onError }) {
  const responsaveis     = useCrudEntity(responsaveisApi,      'responsaveis',        onError)
  const setores          = useCrudEntity(setoresApi,           'setores',             onError)
  const categorias       = useCrudEntity(categoriasApi,        'categorias',          onError)
  const marcas           = useCrudEntity(marcasApi,            'marcas',              onError)
  const situacoes        = useCrudEntity(situacoesApi,         'situacoes',           onError)
  const analistas        = useCrudEntity(analistasApi,         'analistas',           onError)
  const periodosManutencao = useCrudEntity(periodosManutencaoApi, 'periodos_manutencao', onError)

  const loading =
    responsaveis.loading     ||
    setores.loading          ||
    categorias.loading       ||
    marcas.loading           ||
    situacoes.loading        ||
    analistas.loading        ||
    periodosManutencao.loading

  const readyFired = useRef(false)
  useEffect(() => {
    if (!loading && !readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [loading]) // eslint-disable-line

  return (
    <MasterDataContext.Provider value={{
      responsaveis,
      setores,
      categorias,
      marcas,
      situacoes,
      analistas,
      periodosManutencao,
      loading,
    }}>
      {children}
    </MasterDataContext.Provider>
  )
}

export function useMasterData() {
  const ctx = useContext(MasterDataContext)
  if (!ctx) throw new Error('useMasterData must be used within MasterDataProvider')
  return ctx
}
