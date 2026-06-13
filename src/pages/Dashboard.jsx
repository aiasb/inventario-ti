import { useMemo, useState } from 'react'
import { useAssets } from '../context/AssetsContext'
import { useMasterData } from '../context/MasterDataContext'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Label,
} from 'recharts'
import {
  Package, ShieldAlert, Wrench, AlertTriangle,
  ChevronRight, TrendingUp, Calendar, ArrowRight, X,
} from 'lucide-react'

const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b', '#ef4444', '#64748b']

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-sm">
      {label && <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: <span className="text-slate-800">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function DonutCenter({ viewBox, total }) {
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: '#1e293b' }}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', letterSpacing: 1 }}>
        ATIVOS
      </text>
    </g>
  )
}

function KpiCard({ label, sub, value, icon: Icon, color, extra, onClick, active }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`w-full text-left relative overflow-hidden bg-white rounded-2xl p-5 border shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''}
        ${active ? `${color.activeBorder ?? color.border} ring-2 ring-offset-1 ${color.ring ?? 'ring-blue-200'} shadow-md` : color.border}`}
    >
      <div className={`absolute -top-5 -right-5 w-28 h-28 rounded-full opacity-60 ${color.orb}`} />
      <div className="relative flex flex-col gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${color.icon}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className={`text-3xl font-bold tracking-tight ${color.value}`}>{value}</p>
          <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
          {extra ?? <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Comp>
  )
}

export default function Dashboard() {
  const { assets } = useAssets()
  const { categorias, situacoes } = useMasterData()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState({ type: null, value: null })

  function toAssets(state) { navigate('/assets', { state }) }

  function toggleMonth(key) {
    setActiveFilter(prev =>
      prev.type === 'month' && prev.value === key
        ? { type: null, value: null }
        : { type: 'month', value: key }
    )
  }
  function clearFilter() { setActiveFilter({ type: null, value: null }) }

  const data = useMemo(() => {
    const now = new Date()
    const ativos = assets.filter(a => a.status !== 'descartado')
    const descartadosCount = assets.length - ativos.length

    const allMaint = ativos.flatMap(a =>
      (a.maintenances ?? []).map(m => ({
        ...m,
        assetName: a.name,
        assetCategory: a.category,
        assetStatus: a.status,
      }))
    )

    const byStatus = situacoes.items
      .filter(s => s.id !== 'descartado')
      .map(s => ({ id: s.id, nome: s.nome, cor: s.cor, count: ativos.filter(a => a.status === s.id).length }))
      .filter(s => s.count > 0)

    const byCategory = categorias.items
      .map(c => ({ id: c.id, label: c.label, count: ativos.filter(a => a.category === c.id).length }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)

    const inUseStatusId = situacoes.items.find(s => s.nome?.toLowerCase().includes('uso'))?.id ?? null
    const inUseCount = inUseStatusId ? ativos.filter(a => a.status === inUseStatusId).length : 0

    const withWarranty = ativos
      .filter(a => a.warrantyExpiry)
      .map(a => ({ ...a, daysLeft: Math.ceil((new Date(a.warrantyExpiry) - now) / 86400000) }))
    const allActiveWarranty = withWarranty.filter(a => a.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft)
    const expiredWarranty  = withWarranty.filter(a => a.daysLeft <= 0)
    const criticalWarranty = allActiveWarranty.filter(a => a.daysLeft <= 30)
    const warningWarranty  = allActiveWarranty.filter(a => a.daysLeft > 30 && a.daysLeft <= 90)

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      return { label, key, qtd: allMaint.filter(m => m.date?.startsWith(key)).length }
    })

    return {
      total: ativos.length,
      descartadosCount,
      inUseCount,
      inUseStatusId,
      byStatus,
      byCategory,
      allActiveWarranty,
      expiredWarranty,
      criticalWarranty,
      warningWarranty,
      months,
      allMaint,
    }
  }, [assets, categorias.items, situacoes.items])

  // ── Filtered data for bottom tables ─────────────────────────────────────────
  const displayWarranty = data.allActiveWarranty.slice(0, 8)

  const displayRecent = useMemo(() => {
    let list = [...data.allMaint].filter(m => m.date).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (activeFilter.type === 'month') list = list.filter(m => m.date?.startsWith(activeFilter.value))
    return list.slice(0, activeFilter.type === 'month' ? 10 : 6)
  }, [activeFilter, data])

  const filterLabel = useMemo(() => {
    if (activeFilter.type !== 'month') return null
    const m = data.months.find(m => m.key === activeFilter.value)
    return m ? `Mês de ${m.label}` : null
  }, [activeFilter, data.months])

  const inUsePct   = data.total > 0 ? Math.round((data.inUseCount / data.total) * 100) : 0
  const alertCount = data.criticalWarranty.length + data.warningWarranty.length
  const hasCritical = data.criticalWarranty.length > 0

  return (
    <div className="p-6 space-y-6">

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <KpiCard
          label="Total de Ativos"
          value={data.total}
          icon={Package}
          onClick={() => toAssets({})}
          color={{ border: 'border-slate-100', ring: 'ring-blue-200', orb: 'bg-blue-100', icon: 'bg-blue-500 shadow-blue-200', value: 'text-slate-800' }}
          extra={
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-slate-400">Clique para ver inventário</p>
              {data.descartadosCount > 0 && (
                <p className="text-xs text-zinc-400 font-medium">
                  + {data.descartadosCount} descartado{data.descartadosCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          }
        />

        <KpiCard
          label="Em Uso"
          value={data.inUseCount}
          icon={TrendingUp}
          onClick={() => toAssets({ filterStatus: data.inUseStatusId })}
          color={{ border: 'border-slate-100', ring: 'ring-emerald-300', orb: 'bg-emerald-100', icon: 'bg-emerald-500 shadow-emerald-200', value: 'text-slate-800' }}
          extra={
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${inUsePct}%` }} />
              </div>
              <p className="text-xs font-semibold text-emerald-600">{inUsePct}% do parque</p>
            </div>
          }
        />

        <KpiCard
          label="Garantias em Alerta"
          sub={
            hasCritical
              ? `${data.criticalWarranty.length} crítica${data.criticalWarranty.length > 1 ? 's' : ''} ≤ 30 dias`
              : data.warningWarranty.length > 0
              ? `${data.warningWarranty.length} vencendo em 90 dias`
              : 'Sem alertas ativos'
          }
          value={alertCount}
          icon={ShieldAlert}
          onClick={alertCount > 0 ? () => toAssets({ filterWarranty: 'ativa' }) : undefined}
          color={{
            border: hasCritical ? 'border-red-100' : 'border-slate-100',
            ring: 'ring-red-300',
            orb: hasCritical ? 'bg-red-100' : 'bg-amber-100',
            icon: hasCritical ? 'bg-red-500 shadow-red-200' : 'bg-amber-500 shadow-amber-200',
            value: hasCritical ? 'text-red-600' : 'text-slate-800',
          }}
        />

        <KpiCard
          label="Manutenções"
          sub="Registros no histórico"
          value={data.allMaint.length}
          icon={Wrench}
          color={{ border: 'border-slate-100', ring: 'ring-violet-300', orb: 'bg-violet-100', icon: 'bg-violet-500 shadow-violet-200', value: 'text-slate-800' }}
        />

      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar — Ativos por Categoria */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Ativos por Categoria</h2>
                <p className="text-xs text-slate-400 mt-0.5">Clique para ver no inventário</p>
              </div>
              <Link to="/assets" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
                Ver inventário <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8, right: 36, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} width={96} />
                <Tooltip content={<TooltipContent />} cursor={{ fill: '#f8fafc', radius: 6 }} />
                <Bar
                  dataKey="count"
                  name="Ativos"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={26}
                  cursor="pointer"
                  onClick={(barData) => toAssets({ filterCategory: barData.id })}
                >
                  {data.byCategory.map((entry, i) => (
                    <Cell key={entry.id} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut — Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Status dos Ativos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Clique para ver no inventário</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="count"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={74}
                  paddingAngle={3}
                  strokeWidth={0}
                  cursor="pointer"
                  onClick={(pieData) => toAssets({ filterStatus: pieData.id })}
                >
                  {data.byStatus.map((s, i) => (
                    <Cell key={s.id} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                  <Label content={<DonutCenter total={data.total} />} position="center" />
                </Pie>
                <Tooltip content={<TooltipContent />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-1 mt-2">
              {data.byStatus.map((s, i) => {
                const pct = data.total > 0 ? Math.round((s.count / data.total) * 100) : 0
                return (
                  <button
                    key={s.id}
                    onClick={() => toAssets({ filterStatus: s.id })}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left hover:bg-slate-50"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{s.nome}</span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">{s.count}</span>
                    <span className="text-xs tabular-nums w-9 text-right font-medium" style={{ color: PALETTE[i % PALETTE.length] }}>
                      {pct}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── Area — Manutenções por Mês ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Manutenções por Mês</h2>
              <p className="text-xs text-slate-400 mt-0.5">Clique em um mês para filtrar o histórico</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs font-medium text-violet-600">Manutenções</span>
            </div>
          </div>
        </div>
        <div className="px-5 pt-4 pb-5">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={data.months}
              margin={{ left: -10, right: 8, top: 4, bottom: 0 }}
              style={{ cursor: 'pointer' }}
              onClick={(chartData) => {
                if (chartData?.activePayload?.[0] != null) {
                  const key = data.months[chartData.activeTooltipIndex]?.key
                  if (key) toggleMonth(key)
                }
              }}
            >
              <defs>
                <linearGradient id="gmaint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={({ x, y, payload, index }) => {
                  const isActive = activeFilter.type === 'month' && data.months[index]?.key === activeFilter.value
                  return (
                    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isActive ? '#8b5cf6' : '#94a3b8'} fontWeight={isActive ? 700 : 400}>
                      {payload.value}
                    </text>
                  )
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipContent />} />
              <Area
                type="monotone"
                dataKey="qtd"
                name="Manutenções"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#gmaint)"
                dot={(props) => {
                  const { cx, cy, index } = props
                  const isActive = activeFilter.type === 'month' && data.months[index]?.key === activeFilter.value
                  return (
                    <circle
                      key={index}
                      cx={cx} cy={cy}
                      r={isActive ? 6 : 4}
                      fill={isActive ? '#8b5cf6' : '#fff'}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={{ fill: '#8b5cf6', r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filter badge ── */}
      {activeFilter.type && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 font-medium flex-1">
            Filtrando por: <span className="font-bold">{filterLabel}</span>
          </p>
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-blue-100"
          >
            <X size={12} />
            Limpar
          </button>
        </div>
      )}

      {/* ── Bottom tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Garantias a Vencer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Garantias a Vencer</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFilter.type ? `${displayWarranty.length} resultado${displayWarranty.length !== 1 ? 's' : ''}` : 'Ordenado pelos mais urgentes'}
              </p>
            </div>
            <Link to="/assets" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          <div className="p-4">
            {displayWarranty.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">
                {activeFilter.type ? 'Nenhuma garantia para este filtro' : 'Nenhuma garantia ativa registrada'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {displayWarranty.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-l-2 transition-colors ${
                      a.daysLeft <= 30
                        ? 'bg-red-50/60 border-l-red-400 hover:bg-red-50'
                        : a.daysLeft <= 90
                        ? 'bg-amber-50/60 border-l-amber-400 hover:bg-amber-50'
                        : 'bg-slate-50 border-l-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {[a.brand, a.model, a.department].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-xs text-slate-400 tabular-nums hidden sm:block">
                        {new Date(a.warrantyExpiry).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg tabular-nums min-w-[42px] text-center ${
                        a.daysLeft <= 30 ? 'bg-red-100 text-red-700' :
                        a.daysLeft <= 90 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {a.daysLeft}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.expiredWarranty.length > 0 && !activeFilter.type && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-red-500 font-medium">
                <div className="w-5 h-5 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={11} className="text-red-500" />
                </div>
                {data.expiredWarranty.length} ativo{data.expiredWarranty.length > 1 ? 's' : ''} com garantia vencida
              </div>
            )}
          </div>
        </div>

        {/* Últimas Manutenções */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Últimas Manutenções</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFilter.type ? `${displayRecent.length} resultado${displayRecent.length !== 1 ? 's' : ''}` : 'Atividade recente registrada'}
              </p>
            </div>
            <Link to="/manutencoes" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
              Ver calendário <ChevronRight size={12} />
            </Link>
          </div>

          <div className="p-4">
            {displayRecent.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">
                {activeFilter.type ? 'Nenhuma manutenção para este filtro' : 'Nenhuma manutenção registrada'}
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-1">
                  {displayRecent.map((m, idx) => (
                    <div key={m.id} className="flex items-start gap-3 group">
                      <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        idx === 0 ? 'bg-violet-500 shadow-sm shadow-violet-200' : 'bg-slate-100 group-hover:bg-violet-100'
                      }`}>
                        <Wrench size={13} className={idx === 0 ? 'text-white' : 'text-slate-400 group-hover:text-violet-500'} />
                      </div>
                      <div className="flex-1 min-w-0 py-2">
                        <p className="text-sm font-medium text-slate-700 truncate leading-tight">{m.assetName}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {[m.type, m.description].filter(Boolean).join(' · ') || 'Manutenção'}
                        </p>
                      </div>
                      <div className="shrink-0 pt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={11} />
                        <span className="tabular-nums">
                          {m.date ? new Date(m.date).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
