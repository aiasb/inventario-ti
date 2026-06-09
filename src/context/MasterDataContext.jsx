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

const MasterDataContext = createContext(null)

// Gera o objeto CRUD para cada entidade: { items, loading, add, update, remove }
function useCrudEntity(api, onError) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.fetch()
      .then(data => { if (!cancelled) { setItems(data); setLoading(false) } })
      .catch(err => {
        if (!cancelled) {
          setLoading(false)
          onError?.(err.message)
        }
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(async (item) => {
    const created = await api.insert(item)
    setItems(prev => [...prev, created])
    return created
  }, [api])

  const update = useCallback(async (id, patch) => {
    const updated = await api.update(id, patch)
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
  }, [api])

  const remove = useCallback(async (id) => {
    await api.delete(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [api])

  return { items, loading, add, update, remove }
}

export function MasterDataProvider({ children, onReady, onError }) {
  const responsaveis = useCrudEntity(responsaveisApi, onError)
  const setores = useCrudEntity(setoresApi, onError)
  const categorias = useCrudEntity(categoriasApi, onError)
  const marcas = useCrudEntity(marcasApi, onError)
  const situacoes = useCrudEntity(situacoesApi, onError)
  const analistas = useCrudEntity(analistasApi, onError)
  const periodosManutencao = useCrudEntity(periodosManutencaoApi, onError)

  // Indica se alguma entidade ainda está carregando
  const loading =
    responsaveis.loading ||
    setores.loading ||
    categorias.loading ||
    marcas.loading ||
    situacoes.loading ||
    analistas.loading ||
    periodosManutencao.loading

  const readyFired = useRef(false)
  useEffect(() => {
    if (!loading && !readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

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
