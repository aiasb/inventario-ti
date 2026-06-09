import { useMemo } from 'react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { resolveIcon } from '../utils/categoryIcons'
import { Box } from 'lucide-react'
import { Link } from 'react-router-dom'

function CategoryCard({ category, assets, situacoesItems }) {
  const Icon = resolveIcon(category.icon)
  const total = assets.length

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-slate-100 ${category.color}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category.color}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{category.label}</h3>
            <p className="text-sm text-slate-500">{total} {total === 1 ? 'ativo' : 'ativos'}</p>
          </div>
        </div>
      </div>

      {/* Stats por status */}
      <div className="px-5 py-4 grid grid-cols-3 gap-2 border-b border-slate-100">
        {situacoesItems.map(s => {
          const count = assets.filter(a => a.status === s.id).length
          return (
            <div key={s.id} className="text-center">
              <p className="text-xl font-bold text-slate-800">{count}</p>
              <p className="text-xs text-slate-400">{s.nome}</p>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="px-5 py-3 flex items-center justify-end">
        <Link
          to={`/assets?category=${category.id}`}
          className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
        >
          Ver ativos →
        </Link>
      </div>

      {/* Asset preview */}
      {assets.length > 0 && (
        <div className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {assets.slice(0, 3).map(asset => {
            const status = situacoesItems.find(s => s.id === asset.status)
            return (
              <div key={asset.id} className="flex items-center justify-between">
                <p className="text-xs text-slate-600 truncate flex-1 mr-2">{asset.name}</p>
                {status && <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${status.cor}`}>{status.nome}</span>}
              </div>
            )
          })}
          {assets.length > 3 && (
            <p className="text-xs text-slate-400">+{assets.length - 3} mais...</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Categories() {
  const { assets } = useAssets()
  const { categorias, situacoes } = useMasterData()

  // Only categories that exist in the cadastro
  const byCategory = useMemo(() =>
    categorias.items.map(cat => ({
      category: cat,
      assets: assets.filter(a => a.category === cat.id),
    })),
    [categorias.items, assets]
  )

  // Only show categories that have at least one asset
  const withAssets = byCategory.filter(b => b.assets.length > 0)
  const empty = byCategory.filter(b => b.assets.length === 0)

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-sm text-slate-500">Categorias cadastradas</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{categorias.items.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-sm text-slate-500">Com ativos</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{withAssets.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-sm text-slate-500">Total de ativos</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{assets.length}</p>
        </div>
      </div>

      {/* Categories with assets */}
      {withAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {withAssets.map(({ category, assets: catAssets }) => (
            <CategoryCard key={category.id} category={category} assets={catAssets} situacoesItems={situacoes.items} />
          ))}
        </div>
      )}

      {/* Categories without assets — compact list */}
      {empty.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-500 mb-3">Categorias sem ativos ({empty.length})</p>
          <div className="flex flex-wrap gap-2">
            {empty.map(({ category }) => {
              const Icon = resolveIcon(category.icon)
              return (
                <span key={category.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${category.color}`}>
                  <Icon size={13} />
                  {category.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {categorias.items.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Box size={32} className="mx-auto mb-2 opacity-40" />
          <p>Nenhuma categoria cadastrada.</p>
          <Link to="/cadastros" className="text-blue-500 text-sm hover:underline">Ir para Cadastros →</Link>
        </div>
      )}
    </div>
  )
}
