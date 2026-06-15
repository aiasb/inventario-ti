import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'

/**
 * Custom select replacement for Android dark mode compatibility.
 * Native <select> on Android WebView opens an OS picker dialog that ignores CSS.
 *
 * Props:
 *   value        – current value
 *   onChange     – fn(newValue)
 *   options      – [{ value, label }]
 *   placeholder  – string
 *   error        – bool (red border)
 *   searchable   – bool (shows a search input inside the dropdown)
 *   className    – extra classes on the trigger button
 *   footerAction – { label: string, icon?: ReactNode, onClick: fn }
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  error,
  searchable = false,
  className = '',
  footerAction,
}) {
  const [open, setOpen]           = useState(false)
  const [dropPos, setDropPos]     = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const btnRef   = useRef(null)
  const inputRef = useRef(null)

  // Focus search input whenever dropdown opens
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 30)
    }
    if (!open) setSearchTerm('')
  }, [open, searchable])

  function handleOpen() {
    const rect  = btnRef.current.getBoundingClientRect()
    const maxH  = searchable ? 300 : 260
    const spaceBelow = window.innerHeight - rect.bottom - 8

    const top = (spaceBelow >= maxH || spaceBelow >= rect.top)
      ? rect.bottom + 4
      : rect.top - maxH - 4

    setDropPos({ top, left: rect.left, width: rect.width })
    setOpen(true)
  }

  function handleSelect(val) {
    onChange(val)
    setOpen(false)
  }

  function handleFooterAction() {
    setOpen(false)
    footerAction?.onClick()
  }

  const selected = options.find(o => String(o.value) === String(value))

  const norm = (s) =>
    String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const filteredOptions = searchable && searchTerm
    ? options.filter(o => norm(o.label).includes(norm(searchTerm)))
    : options

  const maxH = searchable ? 300 : 260

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className={[
          'w-full flex items-center justify-between gap-2 text-sm rounded-lg px-3 py-2',
          'border transition-colors focus:outline-none',
          error
            ? 'border-red-300 dark:border-red-500'
            : open
              ? 'border-blue-400 ring-1 ring-blue-100 dark:border-blue-500 dark:ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-600',
          'bg-white dark:bg-slate-800',
          'text-slate-800 dark:text-slate-100',
          className,
        ].join(' ')}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && dropPos && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            className="fixed z-[9999] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl flex flex-col"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width, maxHeight: maxH }}
          >
            {/* Search input */}
            {searchable && (
              <div className="shrink-0 p-2 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="overflow-y-auto flex-1">
              {filteredOptions.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500 text-center">
                  {searchTerm ? 'Nenhum resultado' : 'Nenhuma opção disponível'}
                </p>
              )}
              {filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value)
                const isEmpty    = opt.value === ''
                return (
                  <button
                    key={isEmpty ? '__empty__' : opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={[
                      'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : isEmpty
                          ? 'text-slate-400 dark:text-slate-500 italic hover:bg-slate-50 dark:hover:bg-slate-700'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-blue-500 dark:text-blue-400" />}
                  </button>
                )
              })}
            </div>

            {/* Footer action */}
            {footerAction && (
              <div className="border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={handleFooterAction}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {footerAction.icon}
                  {footerAction.label}
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
