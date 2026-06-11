import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react'
import { useOffline } from '../context/OfflineContext'

export default function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOffline()
  const [justSynced, setJustSynced] = useState(false)

  useEffect(() => {
    const handle = () => {
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 3000)
    }
    window.addEventListener('offline:synced', handle)
    return () => window.removeEventListener('offline:synced', handle)
  }, [])

  if (isOnline && !isSyncing && !justSynced && pendingCount === 0) return null

  // Offline
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium shrink-0">
        <WifiOff size={13} className="shrink-0" />
        <span className="flex-1">Sem conexão — exibindo dados em cache</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  // Syncing
  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-xs font-medium shrink-0">
        <RefreshCw size={13} className="shrink-0 animate-spin" />
        <span>Sincronizando {pendingCount} alteraç{pendingCount === 1 ? 'ão' : 'ões'}...</span>
      </div>
    )
  }

  // Online with pending (manual sync available)
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-xs font-medium shrink-0">
        <CloudUpload size={13} className="shrink-0" />
        <span className="flex-1">{pendingCount} alteraç{pendingCount === 1 ? 'ão pendente' : 'ões pendentes'}</span>
        <button
          onClick={syncNow}
          className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold hover:bg-blue-700 transition-colors"
        >
          Sincronizar
        </button>
      </div>
    )
  }

  // Just synced
  if (justSynced) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs font-medium shrink-0">
        <span>✓ Sincronizado com sucesso</span>
      </div>
    )
  }

  return null
}
