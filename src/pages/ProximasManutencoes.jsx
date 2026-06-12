import { useEffect, useMemo, useState } from 'react'
import { useMasterData } from '../context/MasterDataContext'
import { fetchProximasManutencoes } from '../lib/api'
import {
  Wrench, AlertTriangle, Clock, CheckCircle2, Search,
  CalendarX, CalendarCheck, Settings, ChevronRight, RefreshCw,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function fmtDate(dateStr) {
  if (!dateStr) return null
  const part = dateStr.split('T')[0]
  const [y, m, d] = part.split('-')
  return `${d}/${m}/${y}`
}

const STATUS_ORDER = { nunca: 0, vencido: 1, urgente: 2, atencao: 3, ok: 4 }

const STATUS_BADGE = {
  nunca:   { label: 'Nunca realizado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  vencido: { label: 'Vencido',          cls: 'bg-red-100 text-red-700 border-red-200' },
  urgente: { label: 'Urgente',          cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  atencao: { label: 'Atenção',          cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  ok:      { label: 'Em dia',           cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

function KpiCard({ label, value, icon: Icon, color, sub, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all
        ${active ? `${color.border} ring-2 ${color.ring} shadow-md` : `${color.border} hover:shadow-md hover:scale-[1.02]`}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon size={20} className={color.icon} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  )
}

export default function ProximasManutencoes() {
  const { periodosManutencao, categorias } = useMasterData()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterTipo, setFilterTipo] = useState('todos')

  function loadData() {
    setLoading(true)
    fetchProximasManutencoes()
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          if (so !== 0) return so
          return (a.daysLeft ?? -99999) - (b.daysLeft ?? -99999)
        })
        setRows(sorted)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    vencidos: rows.filter(r => r.status === 'vencido' || r.status === 'nunca').length,
    urgentes: rows.filter(r => r.status === 'urgente').length,
    atencao:  rows.filter(r => r.status === 'atencao').length,
    ok:       rows.filter(r => r.status === 'ok').length,
  }), [rows])

  const tiposDisponiveis = useMemo(() => {
    const seen = new Set()
    return rows.filter(r => { if (seen.has(r.periodoId)) return false; seen.add(r.periodoId); return true })
  }, [rows])

  function toggleCard(value) {
    setFilterStatus(prev => prev === value ? 'todos' : value)
  }

  const filtered = rows.filter(r => {
    const q = normalize(search)
    const matchSearch = !search ||
      normalize(r.assetName).includes(q) ||
      normalize(r.periodoTipo).includes(q)
    const matchStatus =
      filterStatus === 'todos'         ? true :
      filterStatus === 'vencido_nunca' ? (r.status === 'vencido' || r.status === 'nunca') :
      r.status === filterStatus
    const matchTipo = filterTipo === 'todos' || r.periodoId === filterTipo
    return matchSearch && matchStatus && matchTipo
  })

  // Empty state when no periods configured
  if (!loading && periodosManutencao.items.filter(p => p.periodico && p.dias).length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <Wrench size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">Nenhum período configurado</h3>
        <p className="text-sm text-slate-400 max-w-sm mb-5">
          Configure os períodos de manutenção em Configurações &rsaquo; Cadastros Base para visualizar o calendário de próximas manutenções.
        </p>
        <NavLink
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Settings size={15} />
          Ir para Configurações
          <ChevronRight size={14} />
        </NavLink>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Wrench size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Próximas Manutenções</h2>
            <p className="text-sm text-slate-500">
              Calendário preventivo baseado nos períodos configurados e no histórico de cada ativo
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Vencidos / Nunca feitos"
          value={stats.vencidos}
          icon={CalendarX}
          color={{ border: 'border-red-100', bg: 'bg-red-50', icon: 'text-red-500', ring: 'ring-red-300' }}
          sub="Clique para filtrar"
          onClick={() => toggleCard('vencido_nunca')}
          active={filterStatus === 'vencido_nunca'}
        />
        <KpiCard
          label="Urgentes (≤ 30 dias)"
          value={stats.urgentes}
          icon={AlertTriangle}
          color={{ border: 'border-orange-100', bg: 'bg-orange-50', icon: 'text-orange-500', ring: 'ring-orange-300' }}
          sub="Clique para filtrar"
          onClick={() => toggleCard('urgente')}
          active={filterStatus === 'urgente'}
        />
        <KpiCard
          label="Atenção (≤ 90 dias)"
          value={stats.atencao}
          icon={Clock}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-300' }}
          sub="Clique para filtrar"
          onClick={() => toggleCard('atencao')}
          active={filterStatus === 'atencao'}
        />
        <KpiCard
          label="Em dia"
          value={stats.ok}
          icon={CheckCircle2}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-300' }}
          sub="Clique para filtrar"
          onClick={() => toggleCard('ok')}
          active={filterStatus === 'ok'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ativo ou tipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors"
        >
          <option value="todos">Todas as situações</option>
          <option value="vencido_nunca">Vencidos / Nunca feitos</option>
          <option value="nunca">Nunca realizado</option>
          <option value="vencido">Vencido</option>
          <option value="urgente">Urgente (≤ 30d)</option>
          <option value="atencao">Atenção (≤ 90d)</option>
          <option value="ok">Em dia</option>
        </select>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors"
        >
          <option value="todos">Todos os tipos</option>
          {tiposDisponiveis.map(r => (
            <option key={r.periodoId} value={r.periodoId}>{r.periodoTipo}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <RefreshCw size={22} className="animate-spin" />
            <p className="text-sm">Calculando manutenções...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ativo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de Manutenção</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Última Realizada</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Periodicidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Próxima Prevista</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Situação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : filtered.map((row) => {
                  const badge = STATUS_BADGE[row.status]
                  const rowBg = row.status === 'vencido' ? 'bg-red-50/40' :
                                row.status === 'nunca'   ? 'bg-slate-50/60' :
                                row.status === 'urgente' ? 'bg-orange-50/30' : ''

                  return (
                    <tr
                      key={`${row.assetId}-${row.periodoId}`}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${rowBg}`}
                    >
                      {/* Ativo */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{row.assetName}</p>
                        {row.assetCategory && (
                          <p className="text-xs text-slate-400 capitalize mt-0.5">
                            {categorias.items.find(c => c.id === row.assetCategory)?.label ?? row.assetCategory}
                          </p>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 text-slate-600">{row.periodoTipo}</td>

                      {/* Última */}
                      <td className="px-4 py-3">
                        {row.lastDate ? (
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <CalendarCheck size={13} className="text-slate-400" />
                            {fmtDate(row.lastDate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Nunca realizado</span>
                        )}
                      </td>

                      {/* Periodicidade */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {row.dias} dias
                        </span>
                      </td>

                      {/* Próxima */}
                      <td className="px-4 py-3">
                        {row.nextDue ? (
                          <span className={`text-sm font-medium ${
                            row.status === 'vencido' ? 'text-red-600' :
                            row.status === 'urgente' ? 'text-orange-600' :
                            row.status === 'atencao' ? 'text-amber-600' :
                            'text-slate-600'
                          }`}>
                            {fmtDate(row.nextDue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {row.daysLeft !== null && (
                            <span className="text-xs text-slate-400 pl-1">
                              {row.daysLeft < 0
                                ? `${Math.abs(row.daysLeft)} dias em atraso`
                                : `${row.daysLeft} dias restantes`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-400">{filtered.length} de {rows.length} registros</p>
          </div>
        )}
      </div>

    </div>
  )
}
