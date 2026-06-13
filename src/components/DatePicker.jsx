import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function parseLocal(ymd) {
  if (!ymd) return null
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildGrid(viewYear, viewMonth) {
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev   = new Date(viewYear, viewMonth, 0).getDate()
  const cells = []

  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), outside: true })

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(viewYear, viewMonth, d), outside: false })

  while (cells.length < 42)
    cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - firstWeekday - daysInMonth + 1), outside: true })

  return cells
}

/**
 * Elegant date picker with custom calendar popup.
 *
 * Props:
 *   value       – YYYY-MM-DD string or ''
 *   onChange    – fn(ymd: string)  — '' when cleared
 *   placeholder – string
 *   className   – extra classes on trigger button
 *   compact     – smaller trigger (for filter bars)
 *   clearable   – show X to clear (default true when value is set)
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  className = '',
  compact = false,
  clearable = true,
}) {
  const selectedDate = parseLocal(value)
  const todayDate    = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()

  const initial = selectedDate ?? todayDate
  const [viewYear,  setViewYear]  = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [open, setOpen]   = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [yearMode, setYearMode] = useState(false)
  const btnRef = useRef(null)

  function handleOpen() {
    const rect = btnRef.current.getBoundingClientRect()
    const calH = 340

    const spaceBelow = window.innerHeight - rect.bottom - 8
    const top = spaceBelow >= calH ? rect.bottom + 4 : rect.top - calH - 4

    let left = rect.left
    if (left + 284 > window.innerWidth - 8) left = window.innerWidth - 292

    const ref = selectedDate ?? todayDate
    setViewYear(ref.getFullYear())
    setViewMonth(ref.getMonth())
    setYearMode(false)
    setDropPos({ top, left })
    setOpen(true)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(date) {
    onChange(toYMD(date))
    setOpen(false)
  }

  function selectToday() {
    onChange(toYMD(todayDate))
    setOpen(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
  }

  const cells = buildGrid(viewYear, viewMonth)

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  const trigger = compact
    ? [
        'flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5',
        'border transition-colors focus:outline-none',
        open ? 'border-blue-400 ring-1 ring-blue-100 dark:border-blue-500' : 'border-slate-300 dark:border-slate-600',
        'bg-white dark:bg-slate-800',
        'text-slate-700 dark:text-slate-200',
        className,
      ].join(' ')
    : [
        'w-full flex items-center gap-2 text-sm rounded-lg px-3 py-2',
        'border transition-colors focus:outline-none',
        open ? 'border-blue-400 ring-1 ring-blue-100 dark:border-blue-500 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-600',
        'bg-white dark:bg-slate-800',
        'text-slate-800 dark:text-slate-100',
        className,
      ].join(' ')

  return (
    <>
      <button ref={btnRef} type="button" onClick={open ? () => setOpen(false) : handleOpen} className={trigger}>
        <Calendar size={compact ? 12 : 14} className="shrink-0 text-slate-400 dark:text-slate-500" />
        <span className={displayLabel
          ? (compact ? 'text-slate-700 dark:text-slate-200' : 'text-slate-800 dark:text-slate-100')
          : 'text-slate-400 dark:text-slate-500'
        }>
          {displayLabel ?? placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            onClick={handleClear}
            className="ml-auto p-0.5 rounded text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {open && dropPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          <div
            className="fixed z-[9999] w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-2xl overflow-hidden"
            style={{ top: dropPos.top, left: dropPos.left }}
          >
            {/* ── Month/Year header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => setYearMode(v => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {MONTHS[viewMonth]} {viewYear}
                <ChevronRight size={13} className={`transition-transform ${yearMode ? 'rotate-90' : ''}`} />
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {yearMode ? (
              /* ── Year selector grid ── */
              <div className="p-3 grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
                {Array.from({ length: 30 }, (_, i) => todayDate.getFullYear() - 10 + i).map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => { setViewYear(yr); setYearMode(false) }}
                    className={[
                      'py-2 rounded-lg text-xs font-medium transition-colors',
                      yr === viewYear
                        ? 'bg-blue-500 text-white'
                        : yr === todayDate.getFullYear()
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            ) : (
              /* ── Calendar grid ── */
              <div className="p-3">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-px">
                  {cells.map(({ date, outside }, i) => {
                    const isToday    = date.getTime() === todayDate.getTime()
                    const isSelected = selectedDate && date.getTime() === selectedDate.getTime()
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectDay(date)}
                        className={[
                          'h-9 w-full rounded-lg text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : isToday
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-300 dark:ring-blue-600'
                              : outside
                                ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
                        ].join(' ')}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={selectToday}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                Hoje
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false) }}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Limpar data
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
