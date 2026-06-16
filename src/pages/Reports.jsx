import { useState, useMemo, useRef, useEffect } from 'react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { usePlatform } from '../hooks/usePlatform'
import CustomSelect from '../components/CustomSelect'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { RefreshCw, X, Download, Package, Wrench, Shield, AlertTriangle, FileText, Loader2, LayoutGrid, RotateCcw, GripVertical } from 'lucide-react'
import DatePicker from '../components/DatePicker'
import { exportCSV } from '../lib/exportCSV'
import { Capacitor } from '@capacitor/core'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
const LAYOUT_KEY = 'reports-grid-v1'
const ROW_H = 38

const LG_DEFAULT = [
  { i: 'kpi-0',            x: 0,  y: 0,  w: 3,  h: 3,  minW: 2, minH: 2, maxH: 6 },
  { i: 'kpi-1',            x: 3,  y: 0,  w: 3,  h: 3,  minW: 2, minH: 2, maxH: 6 },
  { i: 'kpi-2',            x: 6,  y: 0,  w: 3,  h: 3,  minW: 2, minH: 2, maxH: 6 },
  { i: 'kpi-3',            x: 9,  y: 0,  w: 3,  h: 3,  minW: 2, minH: 2, maxH: 6 },
  { i: 'chart-cat',        x: 0,  y: 3,  w: 4,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-status',     x: 4,  y: 3,  w: 4,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-dept',       x: 8,  y: 3,  w: 4,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-manut-month',x: 0,  y: 12, w: 8,  h: 9,  minW: 4, minH: 5 },
  { i: 'chart-age',        x: 8,  y: 12, w: 4,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-manut-type', x: 0,  y: 21, w: 6,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-warranty',   x: 6,  y: 21, w: 6,  h: 9,  minW: 3, minH: 5 },
  { i: 'chart-age-dept',   x: 0,  y: 30, w: 12, h: 9,  minW: 4, minH: 5 },
]

function makeStackLayout(cols) {
  return LG_DEFAULT.map((it, i) => ({
    i: it.i, x: 0, y: i * (it.h + 1), w: cols, h: it.h, minW: 1, minH: it.minH ?? 5,
  }))
}

// Garante que breakpoints móveis nunca fiquem vazios ao mesclar layouts salvos
function mergeLayouts(saved) {
  if (!saved) return DEFAULT_LAYOUTS
  const result = { ...DEFAULT_LAYOUTS }
  for (const [bp, items] of Object.entries(saved)) {
    if (Array.isArray(items) && items.length > 0) result[bp] = items
  }
  return result
}

const DEFAULT_LAYOUTS = {
  lg: LG_DEFAULT,
  md: [
    { i: 'kpi-0',            x: 0, y: 0,  w: 5,  h: 3 }, { i: 'kpi-1',            x: 5, y: 0,  w: 5, h: 3 },
    { i: 'kpi-2',            x: 0, y: 3,  w: 5,  h: 3 }, { i: 'kpi-3',            x: 5, y: 3,  w: 5, h: 3 },
    { i: 'chart-cat',        x: 0, y: 6,  w: 5,  h: 9 }, { i: 'chart-status',     x: 5, y: 6,  w: 5, h: 9 },
    { i: 'chart-dept',       x: 0, y: 15, w: 5,  h: 9 }, { i: 'chart-manut-month',x: 5, y: 15, w: 5, h: 9 },
    { i: 'chart-age',        x: 0, y: 24, w: 5,  h: 9 }, { i: 'chart-manut-type', x: 5, y: 24, w: 5, h: 9 },
    { i: 'chart-warranty',   x: 0, y: 33, w: 10, h: 9 }, { i: 'chart-age-dept',   x: 0, y: 42, w: 10, h: 9 },
  ],
  sm: makeStackLayout(6),
  xs: makeStackLayout(4),
  xxs: makeStackLayout(2),
}

const PALETTE_LIGHT = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b', '#ef4444', '#64748b']
const PALETTE_DARK  = ['#06d6f0', '#f72585', '#7b2fff', '#0ffe9d', '#ffd60a', '#ff6b35', '#4cc9f0', '#bc5090']
const WARRANTY_COLORS_LIGHT = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#94a3b8']
const WARRANTY_COLORS_DARK  = ['#f72585', '#ff6b35', '#ffd60a', '#0ffe9d', '#7b2fff']

function normStr(s) { return (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') }

function corToHex(cor) {
  if (!cor) return '#94a3b8'
  if (cor.includes('emerald') || cor.includes('green')) return '#10b981'
  if (cor.includes('blue') || cor.includes('indigo')) return '#3b82f6'
  if (cor.includes('red') || cor.includes('rose')) return '#ef4444'
  if (cor.includes('amber') || cor.includes('yellow')) return '#f59e0b'
  if (cor.includes('violet') || cor.includes('purple')) return '#8b5cf6'
  if (cor.includes('orange')) return '#f97316'
  if (cor.includes('cyan') || cor.includes('teal')) return '#06b6d4'
  return '#94a3b8'
}

function getMaintenanceStatus(asset, tipo, dias, today) {
  const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
  if (!matches.length) return 'vencida'
  const last = new Date(matches[0].date)
  const next = new Date(last)
  next.setDate(next.getDate() + dias)
  if (next < today) return 'vencida'
  return (next - today) / 864e5 <= 30 ? 'a_vencer' : 'em_dia'
}

function nextDueLabel(asset, tipo, dias, today) {
  const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
  if (!matches.length) return '—'
  const last = new Date(matches[0].date)
  const next = new Date(last)
  next.setDate(next.getDate() + dias)
  const diff = Math.round((next - today) / 864e5)
  const dateStr = next.toLocaleDateString('pt-BR')
  if (diff < 0) return `${dateStr} (${Math.abs(diff)}d atrás)`
  if (diff === 0) return `${dateStr} (hoje)`
  return `${dateStr} (em ${diff}d)`
}

// ─── Tooltip components ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-3 py-2 text-sm">
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-white">{p.value?.toLocaleString('pt-BR')}</p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-3 py-2 text-sm">
      <p className="font-semibold" style={{ color: p.payload?.color ?? '#94a3b8' }}>
        {p.payload?.label}: <span className="text-white">{p.value?.toLocaleString('pt-BR')}</span>
      </p>
    </div>
  )
}

function AgeDeptTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const years  = Math.floor(d.avg)
  const months = Math.round((d.avg - years) * 12)
  const ageLabel = [
    years  > 0 ? `${years} ano${years !== 1 ? 's' : ''}`     : '',
    months > 0 ? `${months} ${months !== 1 ? 'meses' : 'mês'}` : '',
  ].filter(Boolean).join(' ') || '< 1 mês'
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl px-3 py-2.5 text-sm">
      <p className="text-xs text-slate-400 mb-1">{d.label}</p>
      <p className="font-semibold text-white">{ageLabel}</p>
      <p className="text-xs text-slate-500 mt-0.5">{d.count} ativo{d.count !== 1 ? 's' : ''} com data de compra</p>
    </div>
  )
}

// ─── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, loading, className = '', action, dragHandle }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-slate-50 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandle}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h3>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 p-4 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={18} className="text-slate-300 dark:text-slate-600 animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, colorClass, loading, className = '', dragHandle }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3 ${className}`}>
      {dragHandle}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg mt-1 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {value?.toLocaleString('pt-BR') ?? '—'}
          </p>
        )}
        {sub && !loading && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyChart({ text = 'Sem dados para exibir' }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300">
      <Package size={32} strokeWidth={1} />
      <p className="text-xs">{text}</p>
    </div>
  )
}

// ─── Pie legend ───────────────────────────────────────────────────────────────

function PieLegend({ data }) {
  return (
    <div className="mt-3 space-y-1.5">
      {data.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600 truncate">{s.label}</span>
          </span>
          <span className="font-semibold text-slate-700 ml-2">{(s.value ?? s.count)?.toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { categorias, situacoes, setores, periodosManutencao } = useMasterData()
  const { assets, loading } = useAssets()
  const { isDark } = useTheme()
  const PALETTE = isDark ? PALETTE_DARK : PALETTE_LIGHT
  const WARRANTY_COLORS = isDark ? WARRANTY_COLORS_DARK : WARRANTY_COLORS_LIGHT
  const { loadSettings, saveSettings } = useAuth()
  const { isAndroid } = usePlatform()
  const chartsRef = useRef(null)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [filters, setFilters] = useState({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
  const [customRanges, setCustomRanges] = useState({
    warranty:      { from: '', to: '' },
    manutLimpeza:  { from: '', to: '' },
    manutFormatacao: { from: '', to: '' },
  })

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const limpezaPeriodo    = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('limpez')),  [periodosManutencao.items])
  const formatacaoPeriodo = useMemo(() => periodosManutencao.items.find(p => normStr(p.tipo).includes('format')), [periodosManutencao.items])

  function getNextDueDate(asset, tipo, dias) {
    const matches = (asset.maintenances ?? []).filter(m => m.type === tipo)
    if (!matches.length) return null
    const next = new Date(matches[0].date)
    next.setDate(next.getDate() + dias)
    return next
  }

  // Fallback: última manutenção cujo type contenha a busca (sem período cadastrado)
  function getLastManutDate(asset, search) {
    const matches = (asset.maintenances ?? []).filter(m => normStr(m.type).includes(search))
    return matches.length ? new Date(matches[0].date) : null
  }

  function inRange(date, from, to) {
    if (!date) return false
    if (from && date < new Date(from)) return false
    if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); if (date > t) return false }
    return true
  }

  function applyManutFilter(asset, filterVal, periodo, search, rangeKey) {
    if (!filterVal) return true
    if (filterVal === 'personalizado') {
      const date = periodo
        ? getNextDueDate(asset, periodo.tipo, periodo.dias)
        : getLastManutDate(asset, search)
      return inRange(date, customRanges[rangeKey].from, customRanges[rangeKey].to)
    }
    if (!periodo) return true // sem período, não filtra a_vencer/vencida
    return getMaintenanceStatus(asset, periodo.tipo, periodo.dias, today) === filterVal
  }

  const filteredAssets = useMemo(() => {
    const { category, status, dept, warranty, manutLimpeza, manutFormatacao } = filters
    if (!category && !status && !dept && !warranty && !manutLimpeza && !manutFormatacao) return null
    const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
    return assets.filter(a => {
      if (category && a.category   !== category) return false
      if (status   && a.status     !== status)   return false
      if (dept     && a.department !== dept)     return false
      if (warranty) {
        const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry.split('T')[0] + 'T00:00:00') : null
        if (!exp) return false
        if (warranty === 'vencida'       && exp >= today) return false
        if (warranty === 'a_vencer'      && (exp < today || exp > in90)) return false
        if (warranty === 'personalizado' && !inRange(exp, customRanges.warranty.from, customRanges.warranty.to)) return false
      }
      if (!applyManutFilter(a, manutLimpeza,   limpezaPeriodo,    'limpez',  'manutLimpeza'))   return false
      if (!applyManutFilter(a, manutFormatacao, formatacaoPeriodo, 'format', 'manutFormatacao')) return false
      return true
    })
  }, [assets, filters.category, filters.status, filters.dept,
      filters.warranty, filters.manutLimpeza, filters.manutFormatacao,
      customRanges, limpezaPeriodo, formatacaoPeriodo, today])

  function setFilter(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }
  function setRange(key, field, val) { setCustomRanges(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } })) }
  function clearFilters() {
    setFilters({ category: '', status: '', dept: '', warranty: '', manutLimpeza: '', manutFormatacao: '' })
    setCustomRanges({ warranty: { from: '', to: '' }, manutLimpeza: { from: '', to: '' }, manutFormatacao: { from: '', to: '' } })
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const hasCustom  = filters.warranty === 'personalizado' || filters.manutLimpeza === 'personalizado' || filters.manutFormatacao === 'personalizado'

  const data = useMemo(() => {
    const display = filteredAssets ?? assets
    if (!display.length) return null

    const t = new Date(); t.setHours(0, 0, 0, 0)
    const in30 = new Date(t); in30.setDate(t.getDate() + 30)
    const in90 = new Date(t); in90.setDate(t.getDate() + 90)

    // Warranty buckets
    let active = 0, expired = 0, expiring_30 = 0, expiring_90 = 0, none = 0
    for (const a of display) {
      if (!a.warrantyExpiry) { none++; continue }
      const exp = new Date(a.warrantyExpiry.split('T')[0] + 'T00:00:00')
      if (exp < t)      expired++
      else if (exp <= in30) expiring_30++
      else if (exp <= in90) expiring_90++
      else              active++
    }

    // by_category
    const catMap = {}
    for (const a of display) { if (a.category) catMap[a.category] = (catMap[a.category] || 0) + 1 }
    const by_category = Object.entries(catMap)
      .map(([id, count]) => ({ id, label: categorias.items.find(c => c.id === id)?.label ?? id, count }))
      .sort((a, b) => b.count - a.count)

    // by_status
    const statMap = {}
    for (const a of display) { if (a.status) statMap[a.status] = (statMap[a.status] || 0) + 1 }
    const by_status = Object.entries(statMap)
      .map(([id, value]) => {
        const sit = situacoes.items.find(s => s.id === id)
        return { id, label: sit?.nome ?? id, cor: sit?.cor ?? '', value }
      })
      .sort((a, b) => b.value - a.value)

    // by_department
    const deptMap = {}
    for (const a of display) { if (a.department) deptMap[a.department] = (deptMap[a.department] || 0) + 1 }
    const by_department = Object.entries(deptMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // manut_by_month (últimos 12 meses)
    const monthMap = {}
    for (const a of display) {
      for (const m of (a.maintenances ?? [])) {
        if (!m.date) continue
        const month = m.date.split('T')[0].substring(0, 7)
        monthMap[month] = (monthMap[month] || 0) + 1
      }
    }
    const manut_by_month = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, count]) => ({ month, count }))

    // manut_by_type (top 10)
    const typeMap = {}
    for (const a of display) {
      for (const m of (a.maintenances ?? [])) {
        if (!m.type) continue
        typeMap[m.type] = (typeMap[m.type] || 0) + 1
      }
    }
    const manut_by_type = Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([label, count]) => ({ label, count }))

    return {
      total: display.length,
      total_manut: display.reduce((s, a) => s + (a.maintenances?.length ?? 0), 0),
      warranty: { active, expired, expiring_30, expiring_90, none },
      by_category, by_status, by_department, manut_by_month, manut_by_type,
    }
  }, [filteredAssets, assets, categorias.items, situacoes.items])

  const monthData = useMemo(() =>
    (data?.manut_by_month ?? []).map(m => ({
      ...m,
      label: new Date(m.month + '-02').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    }))
  , [data])

  const assetAgeData = useMemo(() => {
    const now = new Date()
    const withDate = (filteredAssets ?? assets).filter(a => a.purchaseDate)
    if (!withDate.length) return null

    const ageYears = a => (now - new Date(a.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)
    const avg = withDate.reduce((s, a) => s + ageYears(a), 0) / withDate.length

    const brackets = [
      { label: '< 1 ano',  min: 0, max: 1  },
      { label: '1–2 anos', min: 1, max: 2  },
      { label: '2–3 anos', min: 2, max: 3  },
      { label: '3–5 anos', min: 3, max: 5  },
      { label: '5+ anos',  min: 5, max: Infinity },
    ]
    const distribution = brackets.map((b, i) => ({
      label: b.label,
      count: withDate.filter(a => { const y = ageYears(a); return y >= b.min && y < b.max }).length,
      color: PALETTE[i % PALETTE.length],
    })).filter(b => b.count > 0)

    const totalYears  = Math.floor(avg)
    const totalMonths = Math.round((avg - totalYears) * 12)

    return { avg, totalYears, totalMonths, distribution, total: withDate.length }
  }, [assets, filteredAssets])

  const warrantyData = useMemo(() => {
    if (!data?.warranty) return []
    return [
      { label: 'Vencida',   value: data.warranty.expired,     color: WARRANTY_COLORS[0] },
      { label: '≤ 30 dias', value: data.warranty.expiring_30, color: WARRANTY_COLORS[1] },
      { label: '≤ 90 dias', value: data.warranty.expiring_90, color: WARRANTY_COLORS[2] },
      { label: 'Em dia',    value: data.warranty.active,      color: WARRANTY_COLORS[3] },
      { label: 'Sem info',  value: data.warranty.none,        color: WARRANTY_COLORS[4] },
    ].filter(d => d.value > 0)
  }, [data])

  const statusData = useMemo(() => {
    if (!data?.by_status) return []
    return data.by_status.map(s => ({ ...s, color: corToHex(s.cor) }))
  }, [data])

  const warrantyAlert = data ? (data.warranty?.expired ?? 0) + (data.warranty?.expiring_30 ?? 0) : null

  // ─── Layout editável ────────────────────────────────────────────────────────
  const saveLayoutTimeoutRef = useRef(null)
  const { containerRef: gridContainerRef, width: gridWidth } = useContainerWidth({ initialWidth: 1280 })
  const [editMode, setEditMode] = useState(false)
  const [layouts, setLayouts] = useState(() => {
    try { return mergeLayouts(JSON.parse(localStorage.getItem(LAYOUT_KEY))) }
    catch { return DEFAULT_LAYOUTS }
  })

  useEffect(() => {
    loadSettings()
      .then(settings => {
        if (settings?.reportLayout) {
          const merged = mergeLayouts(settings.reportLayout)
          setLayouts(merged)
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged))
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onLayoutChange(_, allLayouts) {
    const merged = mergeLayouts(allLayouts)
    setLayouts(merged)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged))
    if (saveLayoutTimeoutRef.current) clearTimeout(saveLayoutTimeoutRef.current)
    saveLayoutTimeoutRef.current = setTimeout(() => {
      saveSettings({ reportLayout: merged }).catch(() => {})
    }, 1000)
  }
  function resetLayout() {
    setLayouts(DEFAULT_LAYOUTS)
    localStorage.removeItem(LAYOUT_KEY)
    saveSettings({ reportLayout: null }).catch(() => {})
  }

  const handle = editMode ? (
    <GripVertical size={14} className="drag-handle shrink-0 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
  ) : null

  const ageByDeptData = useMemo(() => {
    const now = new Date()
    const display = filteredAssets ?? assets
    const deptMap = {}
    for (const a of display) {
      if (!a.purchaseDate || !a.department) continue
      const ageYears = (now - new Date(a.purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)
      if (!deptMap[a.department]) deptMap[a.department] = { total: 0, count: 0 }
      deptMap[a.department].total += ageYears
      deptMap[a.department].count++
    }
    const result = Object.entries(deptMap)
      .map(([label, { total, count }]) => ({ label, avg: total / count, count }))
      .sort((a, b) => b.avg - a.avg)
    return result.length ? result : null
  }, [assets, filteredAssets])

  async function handleExportPDF() {
    if (!chartsRef.current || exportingPDF) return
    setExportingPDF(true)
    try {
      const domtoimage = (await import('dom-to-image-more')).default
      const { jsPDF }  = await import('jspdf')

      const el   = chartsRef.current
      const rect = el.getBoundingClientRect()

      // dom-to-image-more renders via native browser engine — handles oklch + SVG correctly
      const dataUrl = await domtoimage.toPng(el, {
        scale: 2,
        bgcolor: '#f1f5f9',
        width:  rect.width,
        height: rect.height,
      })

      // Load image to get actual pixel dimensions
      const img = new Image()
      await new Promise(res => { img.onload = res; img.src = dataUrl })
      const actualW = img.naturalWidth
      const actualH = img.naturalHeight

      const pdf         = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW       = pdf.internal.pageSize.getWidth()
      const pageH       = pdf.internal.pageSize.getHeight()
      const margin      = 10
      const usableW     = pageW - margin * 2
      const pixPerMm    = actualW / usableW

      // Paginate
      let srcYpx = 0
      let firstPage = true
      while (srcYpx < actualH) {
        const yMm      = firstPage ? margin : margin
        const availHmm = pageH - yMm - margin
        const sliceHpx = Math.min(Math.floor(availHmm * pixPerMm), actualH - srcYpx)
        if (sliceHpx <= 0) break

        const slice = document.createElement('canvas')
        slice.width  = actualW
        slice.height = sliceHpx
        slice.getContext('2d').drawImage(img, 0, srcYpx, actualW, sliceHpx, 0, 0, actualW, sliceHpx)
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, yMm, usableW, sliceHpx / pixPerMm)

        srcYpx += sliceHpx
        firstPage = false
        if (srcYpx < actualH) pdf.addPage()
      }

      const filename = `relatorio-ti-${new Date().toISOString().split('T')[0]}.pdf`

      if (Capacitor.isNativePlatform()) {
        const { Filesystem } = await import('@capacitor/filesystem')
        const { Share }      = await import('@capacitor/share')
        const { Directory }  = await import('@capacitor/filesystem')
        const b64 = pdf.output('datauristring').split(',')[1]
        await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache })
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
        await Share.share({ title: filename, files: [uri], dialogTitle: 'Exportar PDF' })
      } else {
        pdf.save(filename)
      }
    } catch (err) {
      console.error('PDF export error:', err)
      alert(`Erro ao gerar PDF: ${err.message}`)
    } finally {
      setExportingPDF(false)
    }
  }

  function handleExportCSV() {
    const headers = ['Hostname', 'Categoria', 'Status', 'Setor', 'Responsável', 'Serial', 'Marca', 'Modelo', 'Localização', 'Data Compra', 'Garantia']
    const rows = (filteredAssets ?? assets).map(a => [
      a.name, a.category, a.status, a.department, a.assignedTo, a.serialNumber,
      a.brand, a.model, a.location, a.purchaseDate, a.warrantyExpiry,
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')
    exportCSV(`inventario-ti-${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  return (
    <div className="min-h-full bg-slate-100 flex flex-col">

      {/* ── Top header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 pb-0 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Relatórios e Análises</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inventário de Ativos de TI
              {!loading && data && (
                <span className="ml-1.5 text-slate-400">
                  • {filteredAssets != null ? filteredAssets.length : data.total} ativo{(filteredAssets?.length ?? data.total) !== 1 ? 's' : ''}
                  {hasFilters ? ' filtrados' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {!isAndroid && editMode && (
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium transition-colors"
              >
                <RotateCcw size={13} /> Restaurar
              </button>
            )}
            {!isAndroid && (
              <button
                onClick={() => setEditMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  editMode
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={13} /> {editMode ? 'Concluir' : 'Editar Layout'}
              </button>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {exportingPDF ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {exportingPDF ? 'Gerando PDF…' : 'Exportar Relatório'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-t-2xl px-4 py-2.5 flex flex-wrap items-center gap-2`}>
          <CustomSelect
            value={filters.category} onChange={v => setFilter('category', v)}
            placeholder="Todas categorias" className="min-w-[140px] !py-1.5 !text-xs"
            options={[{ value: '', label: 'Todas categorias' }, ...categorias.items.map(c => ({ value: c.id, label: c.label }))]}
          />

          <CustomSelect
            value={filters.status} onChange={v => setFilter('status', v)}
            placeholder="Todos os status" className="min-w-[140px] !py-1.5 !text-xs"
            options={[{ value: '', label: 'Todos os status' }, ...situacoes.items.map(s => ({ value: s.id, label: s.nome }))]}
          />

          <CustomSelect
            value={filters.dept} onChange={v => setFilter('dept', v)}
            placeholder="Todos os setores" className="min-w-[140px] !py-1.5 !text-xs"
            options={[{ value: '', label: 'Todos os setores' }, ...setores.items.map(s => ({ value: s.nome, label: s.nome }))]}
          />

          <CustomSelect
            value={filters.warranty} onChange={v => setFilter('warranty', v)}
            placeholder="Garantia — todas" className="min-w-[150px] !py-1.5 !text-xs"
            options={[
              { value: '', label: 'Garantia — todas' },
              { value: 'a_vencer', label: 'A vencer (≤90d)' },
              { value: 'vencida', label: 'Vencida' },
              { value: 'personalizado', label: 'Período personalizado' },
            ]}
          />

          <CustomSelect
            value={filters.manutLimpeza} onChange={v => setFilter('manutLimpeza', v)}
            placeholder="Limpeza — todas" className="min-w-[150px] !py-1.5 !text-xs"
            options={[
              { value: '', label: 'Limpeza — todas' },
              { value: 'a_vencer', label: 'A vencer (≤30d)' },
              { value: 'vencida', label: 'Vencida' },
              { value: 'personalizado', label: 'Período personalizado' },
            ]}
          />

          <CustomSelect
            value={filters.manutFormatacao} onChange={v => setFilter('manutFormatacao', v)}
            placeholder="Formatação — todas" className="min-w-[160px] !py-1.5 !text-xs"
            options={[
              { value: '', label: 'Formatação — todas' },
              { value: 'a_vencer', label: 'A vencer (≤30d)' },
              { value: 'vencida', label: 'Vencida' },
              { value: 'personalizado', label: 'Período personalizado' },
            ]}
          />

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              <X size={11} /> Limpar
            </button>
          )}

          {loading && <RefreshCw size={13} className="text-blue-500 animate-spin ml-auto" />}
        </div>

        {/* Date range row — appears when any filter is "personalizado" */}
        {hasCustom && (
          <div className={`${isDark ? 'bg-slate-700/40 border-slate-700' : 'bg-slate-100 border-slate-200'} border-t px-4 py-3 flex flex-wrap gap-4`}>
            {filters.warranty === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">Garantia:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.warranty.from}
                    onChange={v => setRange('warranty', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.warranty.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.warranty.to}
                    onChange={v => setRange('warranty', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.warranty.to}
                  />
                </div>
              </div>
            )}

            {filters.manutLimpeza === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  {limpezaPeriodo?.tipo ?? 'Limpeza'} (próx.):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.manutLimpeza.from}
                    onChange={v => setRange('manutLimpeza', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.manutLimpeza.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.manutLimpeza.to}
                    onChange={v => setRange('manutLimpeza', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.manutLimpeza.to}
                  />
                </div>
              </div>
            )}

            {filters.manutFormatacao === 'personalizado' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                  {formatacaoPeriodo?.tipo ?? 'Formatação'} (próx.):
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">De</span>
                  <DatePicker
                    compact
                    value={customRanges.manutFormatacao.from}
                    onChange={v => setRange('manutFormatacao', 'from', v)}
                    placeholder="De"
                    clearable={!!customRanges.manutFormatacao.from}
                  />
                  <span className="text-[10px] text-slate-500">Até</span>
                  <DatePicker
                    compact
                    value={customRanges.manutFormatacao.to}
                    onChange={v => setRange('manutFormatacao', 'to', v)}
                    placeholder="Até"
                    clearable={!!customRanges.manutFormatacao.to}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div ref={chartsRef} className="flex-1">

        {/* Filtered assets — acima do grid, só quando filtro ativo */}
        {filteredAssets && (
          <div className={`${isAndroid ? 'px-3' : 'px-5'} pt-4`}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-3">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ativos filtrados</h3>
                  <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold min-w-[22px] text-center">
                    {filteredAssets.length}
                  </span>
                </div>
                {filteredAssets.length > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {filteredAssets.length === 1 ? '1 resultado' : `${filteredAssets.length} resultados`}
                  </span>
                )}
              </div>

              {filteredAssets.length === 0 ? (
                <EmptyChart text="Nenhum ativo com esses filtros" />
              ) : isAndroid ? (
                /* ── Android: cards empilhados ─────────────────────────── */
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredAssets.map(a => {
                    const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null
                    const expired = exp && exp < today
                    const inRisk  = exp && !expired && (exp - today) / 864e5 <= 90
                    const catLabel = categorias.items.find(c => c.id?.toLowerCase() === a.category?.toLowerCase())?.label ?? a.category
                    const sit = situacoes.items.find(s => s.id === a.status)
                    return (
                      <div key={a.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{a.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {catLabel && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-medium">{catLabel}</span>}
                              {a.department && <span className="text-[10px] text-slate-400 dark:text-slate-500">{a.department}</span>}
                            </div>
                          </div>
                          {sit && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mt-0.5"
                              style={{ backgroundColor: sit.cor ?? '#94a3b8' }}>
                              {sit.nome}
                            </span>
                          )}
                        </div>
                        {exp && (
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              expired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                              inRisk  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            }`}>Garantia · {exp.toLocaleDateString('pt-BR')}</span>
                            {limpezaPeriodo && (() => {
                              const st = getMaintenanceStatus(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                              const lbl = nextDueLabel(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                              return <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                st === 'vencida' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                st === 'a_vencer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              }`}>{limpezaPeriodo.tipo} · {lbl}</span>
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* ── Web: tabela elegante ──────────────────────────────── */
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700/60">
                        <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ativo</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Setor</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Garantia</th>
                        {limpezaPeriodo    && <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{limpezaPeriodo.tipo}</th>}
                        {formatacaoPeriodo && <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{formatacaoPeriodo.tipo}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                      {filteredAssets.map(a => {
                        const exp = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null
                        const expired = exp && exp < today
                        const inRisk  = exp && !expired && (exp - today) / 864e5 <= 90
                        const catLabel = categorias.items.find(c => c.id?.toLowerCase() === a.category?.toLowerCase())?.label ?? a.category
                        const sit = situacoes.items.find(s => s.id === a.status)
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors">
                            {/* Ativo */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  {(a.name ?? '?').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{a.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {catLabel && <span className="text-slate-400 dark:text-slate-500">{catLabel}</span>}
                                    {sit && (
                                      <span className="px-1.5 py-px rounded-full text-[9px] font-semibold text-white leading-tight"
                                        style={{ backgroundColor: sit.cor ?? '#94a3b8' }}>
                                        {sit.nome}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {/* Setor */}
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {a.department || <span className="text-slate-300 dark:text-slate-600">—</span>}
                            </td>
                            {/* Garantia */}
                            <td className="px-4 py-3">
                              {!exp ? (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              ) : (
                                <div>
                                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    expired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                    inRisk  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                              'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {expired ? 'Vencida' : inRisk ? 'A vencer' : 'Em dia'}
                                  </span>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{exp.toLocaleDateString('pt-BR')}</p>
                                </div>
                              )}
                            </td>
                            {/* Manutenções */}
                            {limpezaPeriodo && (
                              <td className="px-4 py-3">
                                {(() => {
                                  const st  = getMaintenanceStatus(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                                  const lbl = nextDueLabel(a, limpezaPeriodo.tipo, limpezaPeriodo.dias, today)
                                  return (
                                    <div>
                                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                        st === 'vencida'  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        st === 'a_vencer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                      }`}>
                                        {st === 'vencida' ? 'Vencida' : st === 'a_vencer' ? 'A vencer' : 'Em dia'}
                                      </span>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{lbl}</p>
                                    </div>
                                  )
                                })()}
                              </td>
                            )}
                            {formatacaoPeriodo && (
                              <td className="px-4 py-3">
                                {(() => {
                                  const st  = getMaintenanceStatus(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                                  const lbl = nextDueLabel(a, formatacaoPeriodo.tipo, formatacaoPeriodo.dias, today)
                                  return (
                                    <div>
                                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                        st === 'vencida'  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        st === 'a_vencer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                      }`}>
                                        {st === 'vencida' ? 'Vencida' : st === 'a_vencer' ? 'A vencer' : 'Em dia'}
                                      </span>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{lbl}</p>
                                    </div>
                                  )
                                })()}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Android: layout simples em coluna (sem react-grid-layout) ─── */}
        {isAndroid ? (
          <div className="px-3 pb-5 pt-3 space-y-3">
            {/* KPIs: 2 colunas */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label={filteredAssets ? 'Ativos filtrados' : 'Total de Ativos'}
                value={filteredAssets ? filteredAssets.length : data?.total}
                sub={data?.total != null && filteredAssets == null ? `${data.total.toLocaleString('pt-BR')} cadastrados` : undefined}
                icon={Package} colorClass="bg-blue-500" loading={loading}
              />
              <KpiCard label="Manutenções" value={data?.total_manut}
                icon={Wrench} colorClass="bg-violet-500" loading={loading} />
              <KpiCard
                label="Garantias em dia"
                value={data ? (data.warranty.active + data.warranty.expiring_30 + data.warranty.expiring_90) : undefined}
                icon={Shield} colorClass="bg-emerald-500" loading={loading}
              />
              <KpiCard label="Garantias em alerta" value={warrantyAlert}
                icon={AlertTriangle} colorClass="bg-orange-500" loading={loading} />
            </div>

            <div className="h-[280px]">
              <ChartCard title="Ativos por Categoria" sub={`${data?.by_category?.length ?? 0} categorias`}
                loading={loading} className="h-full">
                {data?.by_category?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.by_category} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                        {data.by_category.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[320px]">
              <ChartCard title="Status dos Ativos" loading={loading} className="h-full">
                {statusData.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius="32%" outerRadius="52%" dataKey="value" paddingAngle={2}>
                            {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RechTooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegend data={statusData} />
                  </div>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[280px]">
              <ChartCard title="Ativos por Setor" sub={`${data?.by_department?.length ?? 0} setores`}
                loading={loading} className="h-full">
                {data?.by_department?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.by_department} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[260px]">
              <ChartCard title="Manutenções por Mês" sub="últimos 12 meses" loading={loading} className="h-full">
                {monthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="manutGradA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="count" name="Manutenções" stroke="#3b82f6" strokeWidth={2.5}
                        fill="url(#manutGradA)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[260px]">
              <ChartCard
                title="Idade Média dos Ativos"
                sub={assetAgeData ? `baseado em ${assetAgeData.total} ativo${assetAgeData.total !== 1 ? 's' : ''} com data de compra` : ''}
                loading={loading} className="h-full">
                {assetAgeData ? (
                  <div className="flex flex-col h-full overflow-y-auto">
                    <div className="flex items-end gap-1.5 mb-4 shrink-0">
                      <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{assetAgeData.totalYears}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        ano{assetAgeData.totalYears !== 1 ? 's' : ''}
                        {assetAgeData.totalMonths > 0 && <span className="ml-1">{assetAgeData.totalMonths} {assetAgeData.totalMonths !== 1 ? 'meses' : 'mês'}</span>}
                      </span>
                    </div>
                    <div className="space-y-2.5 flex-1">
                      {assetAgeData.distribution.map((b, i) => {
                        const max = Math.max(...assetAgeData.distribution.map(x => x.count))
                        const pct = Math.round((b.count / max) * 100)
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">{b.label}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{b.count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : !loading && <EmptyChart text="Sem ativos com data de compra" />}
              </ChartCard>
            </div>

            <div className="h-[280px]">
              <ChartCard title="Tipos de Manutenção" sub="top 10 tipos mais realizados" loading={loading} className="h-full">
                {data?.manut_by_type?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.manut_by_type} margin={{ top: 0, right: 10, left: -20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false}
                        angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {data.manut_by_type.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[320px]">
              <ChartCard title="Status de Garantia" loading={loading} className="h-full">
                {warrantyData.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={warrantyData} cx="50%" cy="50%" innerRadius="32%" outerRadius="52%" dataKey="value" paddingAngle={2}>
                            {warrantyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RechTooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegend data={warrantyData} />
                  </div>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            <div className="h-[300px]">
              <ChartCard
                title="Idade Média dos Ativos por Setor"
                sub={ageByDeptData ? `${ageByDeptData.length} setor${ageByDeptData.length !== 1 ? 'es' : ''} com ativos cadastrados` : ''}
                loading={loading} className="h-full">
                {ageByDeptData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={ageByDeptData} margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${v.toFixed(1)}a`} />
                      <YAxis type="category" dataKey="label" width={110}
                        tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<AgeDeptTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={18}
                        label={{ position: 'right', fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b',
                          formatter: v => { const y = Math.floor(v); const m = Math.round((v-y)*12); return y > 0 ? `${y}a${m > 0 ? ` ${m}m` : ''}` : `${m}m` }
                        }}>
                        {ageByDeptData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart text="Sem ativos com data de compra por setor" />}
              </ChartCard>
            </div>
          </div>
        ) : (
        <div ref={gridContainerRef} className="px-5 pb-5 pt-3">
          <ResponsiveGridLayout
            width={gridWidth}
            className={editMode ? 'reports-edit-mode' : ''}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={ROW_H}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            onLayoutChange={onLayoutChange}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".drag-handle"
          >
            {/* KPI cards */}
            <div key="kpi-0">
              <KpiCard
                label={filteredAssets ? 'Ativos filtrados' : 'Total de Ativos'}
                value={filteredAssets ? filteredAssets.length : data?.total}
                sub={data?.total != null && filteredAssets == null ? `${data.total.toLocaleString('pt-BR')} cadastrados` : undefined}
                icon={Package} colorClass="bg-blue-500" loading={loading}
                className="h-full" dragHandle={handle}
              />
            </div>
            <div key="kpi-1">
              <KpiCard label="Manutenções" value={data?.total_manut}
                icon={Wrench} colorClass="bg-violet-500" loading={loading}
                className="h-full" dragHandle={handle}
              />
            </div>
            <div key="kpi-2">
              <KpiCard
                label="Garantias em dia"
                value={data ? (data.warranty.active + data.warranty.expiring_30 + data.warranty.expiring_90) : undefined}
                icon={Shield} colorClass="bg-emerald-500" loading={loading}
                className="h-full" dragHandle={handle}
              />
            </div>
            <div key="kpi-3">
              <KpiCard label="Garantias em alerta" value={warrantyAlert}
                icon={AlertTriangle} colorClass="bg-orange-500" loading={loading}
                className="h-full" dragHandle={handle}
              />
            </div>

            {/* Ativos por Categoria */}
            <div key="chart-cat">
              <ChartCard title="Ativos por Categoria" sub={`${data?.by_category?.length ?? 0} categorias`}
                loading={loading} className="h-full" dragHandle={handle}>
                {data?.by_category?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.by_category} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                        {data.by_category.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Status dos Ativos */}
            <div key="chart-status">
              <ChartCard title="Status dos Ativos" loading={loading} className="h-full" dragHandle={handle}>
                {statusData.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius="32%" outerRadius="52%" dataKey="value" paddingAngle={2}>
                            {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RechTooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegend data={statusData} />
                  </div>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Ativos por Setor */}
            <div key="chart-dept">
              <ChartCard title="Ativos por Setor" sub={`${data?.by_department?.length ?? 0} setores`}
                loading={loading} className="h-full" dragHandle={handle}>
                {data?.by_department?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.by_department} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Manutenções por Mês */}
            <div key="chart-manut-month">
              <ChartCard title="Manutenções por Mês" sub="últimos 12 meses"
                loading={loading} className="h-full" dragHandle={handle}>
                {monthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="manutGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="count" name="Manutenções" stroke="#3b82f6" strokeWidth={2.5}
                        fill="url(#manutGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Idade Média dos Ativos */}
            <div key="chart-age">
              <ChartCard
                title="Idade Média dos Ativos"
                sub={assetAgeData ? `baseado em ${assetAgeData.total} ativo${assetAgeData.total !== 1 ? 's' : ''} com data de compra` : ''}
                loading={loading} className="h-full" dragHandle={handle}
              >
                {assetAgeData ? (
                  <div className="flex flex-col h-full overflow-y-auto">
                    <div className="flex items-end gap-1.5 mb-4 shrink-0">
                      <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{assetAgeData.totalYears}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        ano{assetAgeData.totalYears !== 1 ? 's' : ''}
                        {assetAgeData.totalMonths > 0 && <span className="ml-1">{assetAgeData.totalMonths} {assetAgeData.totalMonths !== 1 ? 'meses' : 'mês'}</span>}
                      </span>
                    </div>
                    <div className="space-y-2.5 flex-1">
                      {assetAgeData.distribution.map((b, i) => {
                        const max = Math.max(...assetAgeData.distribution.map(x => x.count))
                        const pct = Math.round((b.count / max) * 100)
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">{b.label}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{b.count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : !loading && <EmptyChart text="Sem ativos com data de compra" />}
              </ChartCard>
            </div>

            {/* Tipos de Manutenção */}
            <div key="chart-manut-type">
              <ChartCard title="Tipos de Manutenção" sub="top 10 tipos mais realizados"
                loading={loading} className="h-full" dragHandle={handle}>
                {data?.manut_by_type?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.manut_by_type} margin={{ top: 0, right: 10, left: -20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false}
                        angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechTooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {data.manut_by_type.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Status de Garantia */}
            <div key="chart-warranty">
              <ChartCard title="Status de Garantia" loading={loading} className="h-full" dragHandle={handle}>
                {warrantyData.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={warrantyData} cx="50%" cy="50%" innerRadius="32%" outerRadius="52%" dataKey="value" paddingAngle={2}>
                            {warrantyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RechTooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <PieLegend data={warrantyData} />
                  </div>
                ) : !loading && <EmptyChart />}
              </ChartCard>
            </div>

            {/* Idade Média por Setor */}
            <div key="chart-age-dept">
              <ChartCard
                title="Idade Média dos Ativos por Setor"
                sub={ageByDeptData ? `${ageByDeptData.length} setor${ageByDeptData.length !== 1 ? 'es' : ''} com ativos cadastrados` : ''}
                loading={loading} className="h-full" dragHandle={handle}
              >
                {ageByDeptData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={ageByDeptData} margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${v.toFixed(1)}a`} />
                      <YAxis type="category" dataKey="label" width={110}
                        tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569' }} axisLine={false} tickLine={false} />
                      <RechTooltip content={<AgeDeptTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={18}
                        label={{ position: 'right', fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b',
                          formatter: v => { const y = Math.floor(v); const m = Math.round((v-y)*12); return y > 0 ? `${y}a${m > 0 ? ` ${m}m` : ''}` : `${m}m` }
                        }}
                      >
                        {ageByDeptData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loading && <EmptyChart text="Sem ativos com data de compra por setor" />}
              </ChartCard>
            </div>

          </ResponsiveGridLayout>
        </div>
        )}
      </div>
    </div>
  )
}
