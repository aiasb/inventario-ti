import { useMemo } from 'react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { Download, AlertCircle } from 'lucide-react'

function BarChart({ data, max, color }) {
  if (data.length === 0) return <p className="text-sm text-slate-400 py-4">Sem dados.</p>
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(({ label, value }) => {
        const pct = max > 0 ? (value / max) * 100 : 0
        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-700">{value}</span>
            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${pct}%`, backgroundColor: color, minHeight: value > 0 ? 4 : 0 }} />
            <span className="text-xs text-slate-400 truncate w-full text-center">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Reports() {
  const { assets } = useAssets()
  const { categorias, setores, situacoes } = useMasterData()

  const stats = useMemo(() => {
    // Only categories that are registered AND have at least 1 asset
    const byCategory = categorias.items
      .map(c => ({ label: c.label, value: assets.filter(a => a.category === c.id).length }))
      .filter(c => c.value > 0)

    const byStatus = situacoes.items.map(s => ({
      id: s.id,
      label: s.nome,
      cor: s.cor,
      value: assets.filter(a => a.status === s.id).length,
    }))

    // Only sectors that are registered AND have at least 1 asset
    const byDept = setores.items
      .map(s => ({ label: s.nome, value: assets.filter(a => a.department === s.nome).length }))
      .filter(d => d.value > 0)

    const expiredWarranty = assets.filter(a => {
      if (!a.warrantyExpiry) return false
      return new Date(a.warrantyExpiry) < new Date()
    })

    const expiringSoon = assets.filter(a => {
      if (!a.warrantyExpiry) return false
      const days = (new Date(a.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24)
      return days > 0 && days <= 90
    })

    return { byCategory, byStatus, byDept, expiredWarranty, expiringSoon }
  }, [assets, categorias.items, setores.items, situacoes.items])

  function exportCSV() {
    const headers = ['Hostname', 'Categoria', 'Status', 'Setor', 'Responsável', 'Serial', 'Marca', 'Modelo', 'Localização', 'Data Compra', 'Garantia', 'Memória', 'Disco', 'Observações']
    const rows = assets.map(a => [
      a.name, a.category, a.status, a.department, a.assignedTo, a.serialNumber,
      a.brand, a.model, a.location, a.purchaseDate, a.warrantyExpiry,
      a.memory, a.storage, a.notes,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const el = document.createElement('a')
    el.href = URL.createObjectURL(blob)
    el.download = `inventario-ti-${new Date().toISOString().split('T')[0]}.csv`
    el.click()
  }

  const maxCat = Math.max(...stats.byCategory.map(d => d.value), 1)
  const maxDept = Math.max(...stats.byDept.map(d => d.value), 1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Relatórios e Análises</h2>
          <p className="text-sm text-slate-500">{assets.length} ativos registrados</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Ativos por Categoria
            <span className="ml-2 text-xs font-normal text-slate-400">({stats.byCategory.length} com ativos)</span>
          </h3>
          <BarChart data={stats.byCategory} max={maxCat} color="#3b82f6" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Ativos por Setor
            <span className="ml-2 text-xs font-normal text-slate-400">({stats.byDept.length} com ativos)</span>
          </h3>
          <BarChart data={stats.byDept} max={maxDept} color="#8b5cf6" />
        </div>
      </div>

      {/* Status + Warranty */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Status dos Ativos</h3>
          <div className="space-y-3">
            {stats.byStatus.map(({ id, label, cor, value }) => {
              const pct = assets.length > 0 ? Math.round((value / assets.length) * 100) : 0
              const barColor = cor?.includes('emerald') ? 'bg-emerald-400' : cor?.includes('blue') ? 'bg-blue-400' : cor?.includes('red') ? 'bg-red-400' : cor?.includes('amber') ? 'bg-amber-400' : 'bg-slate-400'
              return (
                <div key={id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-800">{value} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" />
              Garantias Vencidas
            </span>
          </h3>
          {stats.expiredWarranty.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma garantia vencida.</p>
          ) : (
            <div className="space-y-2">
              {stats.expiredWarranty.slice(0, 6).map(a => (
                <div key={a.id} className="text-xs">
                  <p className="font-medium text-slate-700 truncate">{a.name}</p>
                  <p className="text-slate-400">{new Date(a.warrantyExpiry + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
              {stats.expiredWarranty.length > 6 && (
                <p className="text-xs text-slate-400">+{stats.expiredWarranty.length - 6} mais</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500" />
              Vencendo em 90 dias
            </span>
          </h3>
          {stats.expiringSoon.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma garantia vencendo em breve.</p>
          ) : (
            <div className="space-y-2">
              {stats.expiringSoon.slice(0, 6).map(a => {
                const days = Math.round((new Date(a.warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={a.id} className="text-xs">
                    <p className="font-medium text-slate-700 truncate">{a.name}</p>
                    <p className="text-amber-600">{days} dias restantes</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
