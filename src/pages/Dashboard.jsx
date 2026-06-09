import { useMemo } from 'react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Label,
} from 'recharts'
import { Package, ShieldAlert, Wrench, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react'

const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b', '#ef4444', '#64748b']

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      {label && <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}:{' '}
          <span className="text-slate-800">
            {p.name?.toString().includes('R$') ? `R$ ${Number(p.value).toFixed(2)}` : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function DonutCenter({ viewBox, total }) {
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: '#1e293b' }}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
        ativos
      </text>
    </g>
  )
}

export default function Dashboard() {
  const { assets } = useAssets()
  const { categorias, situacoes } = useMasterData()

  const data = useMemo(() => {
    const now = new Date()

    const allMaint = assets.flatMap(a =>
      (a.maintenances ?? []).map(m => ({ ...m, assetName: a.name }))
    )

    const byStatus = situacoes.items
      .map(s => ({ id: s.id, nome: s.nome, cor: s.cor, count: assets.filter(a => a.status === s.id).length }))
      .filter(s => s.count > 0)

    const byCategory = categorias.items
      .map(c => ({ id: c.id, label: c.label, count: assets.filter(a => a.category === c.id).length }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)

    const inUseStatus = situacoes.items.find(s => s.id === 'em_uso' || s.nome?.toLowerCase().includes('uso'))
    const inUseCount = assets.filter(a => a.status === (inUseStatus?.id ?? 'em_uso')).length

    const withWarranty = assets
      .filter(a => a.warrantyExpiry)
      .map(a => ({ ...a, daysLeft: Math.ceil((new Date(a.warrantyExpiry) - now) / 86400000) }))
    const activeWarranty = withWarranty.filter(a => a.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft)
    const expiredWarranty = withWarranty.filter(a => a.daysLeft <= 0)
    const criticalWarranty = activeWarranty.filter(a => a.daysLeft <= 30)
    const warningWarranty = activeWarranty.filter(a => a.daysLeft > 30 && a.daysLeft <= 90)

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      const ms = allMaint.filter(m => m.date?.startsWith(key))
      return { label, qtd: ms.length }
    })

    const recent = [...allMaint]
      .filter(m => m.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6)

    return {
      total: assets.length,
      inUseCount,
      byStatus,
      byCategory,
      activeWarranty: activeWarranty.slice(0, 8),
      expiredWarranty,
      criticalWarranty,
      warningWarranty,
      months,
      allMaint,
      recent,
    }
  }, [assets, categorias.items, situacoes.items])

  const inUsePct = data.total > 0 ? Math.round((data.inUseCount / data.total) * 100) : 0
  const alertCount = data.criticalWarranty.length + data.warningWarranty.length

  return (
    <div className="p-6 space-y-6">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total de Ativos</p>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package size={16} className="text-blue-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-800">{data.total}</p>
          <p className="text-xs text-slate-400 mt-1.5">Cadastrados no inventário</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Em Uso</p>
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-800">{data.inUseCount}</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${inUsePct}%` }}
            />
          </div>
          <p className="text-xs text-emerald-500 font-medium mt-1.5">{inUsePct}% do parque de TI</p>
        </div>

        <div className={`bg-white rounded-2xl p-5 border shadow-sm ${data.criticalWarranty.length > 0 ? 'border-red-100' : 'border-slate-100'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Garantias em Alerta</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.criticalWarranty.length > 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
              <ShieldAlert size={16} className={data.criticalWarranty.length > 0 ? 'text-red-500' : 'text-amber-500'} />
            </div>
          </div>
          <p className={`text-4xl font-bold ${data.criticalWarranty.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {alertCount}
          </p>
          <p className={`text-xs mt-1.5 font-medium ${data.criticalWarranty.length > 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {data.criticalWarranty.length > 0
              ? `${data.criticalWarranty.length} crítica${data.criticalWarranty.length > 1 ? 's' : ''} ≤ 30 dias`
              : data.warningWarranty.length > 0
              ? `${data.warningWarranty.length} vencendo em 90 dias`
              : 'Sem alertas ativos'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Manutenções</p>
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
              <Wrench size={16} className="text-violet-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-800">{data.allMaint.length}</p>
          <p className="text-xs text-slate-400 mt-1.5">Registros no histórico</p>
        </div>

      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800">Ativos por Categoria</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">{data.total} ativos cadastrados</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                width={92}
              />
              <Tooltip content={<TooltipContent />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Ativos" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {data.byCategory.map((entry, i) => (
                  <Cell key={entry.id} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800">Status dos Ativos</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-3">Distribuição atual</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.byStatus}
                dataKey="count"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
              >
                {data.byStatus.map((s, i) => (
                  <Cell key={s.id} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <Label content={<DonutCenter total={data.total} />} position="center" />
              </Pie>
              <Tooltip content={<TooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {data.byStatus.map((s, i) => {
              const pct = data.total > 0 ? Math.round((s.count / data.total) * 100) : 0
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-xs text-slate-600">{s.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{s.count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Charts row 2 — Maintenance ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-800">Manutenções por Mês</h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-5">Quantidade nos últimos 6 meses</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.months} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gmaint" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<TooltipContent />} />
            <Area
              type="monotone"
              dataKey="qtd"
              name="Manutenções"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#gmaint)"
              dot={{ fill: '#8b5cf6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Warranty table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Garantias a Vencer</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ordenado pelos mais urgentes</p>
            </div>
            <Link to="/assets" className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          {data.activeWarranty.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma garantia ativa registrada</p>
          ) : (
            <div className="space-y-2">
              {data.activeWarranty.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {[a.brand, a.model, a.department].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(a.warrantyExpiry).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[40px] text-center ${
                      a.daysLeft <= 30
                        ? 'bg-red-100 text-red-600'
                        : a.daysLeft <= 90
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {a.daysLeft}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.expiredWarranty.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle size={12} />
              {data.expiredWarranty.length} ativo{data.expiredWarranty.length > 1 ? 's' : ''} com garantia vencida
            </div>
          )}
        </div>

        {/* Recent maintenances */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800">Últimas Manutenções</h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Atividade recente registrada</p>

          {data.recent.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma manutenção registrada</p>
          ) : (
            <div className="space-y-2">
              {data.recent.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Wrench size={13} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.assetName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {[m.type, m.description].filter(Boolean).join(' · ') || 'Manutenção'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 tabular-nums shrink-0">
                    {m.date ? new Date(m.date).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
