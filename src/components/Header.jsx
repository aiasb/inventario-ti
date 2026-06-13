import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, Moon, Settings as SettingsIcon, ShieldOff, Sun, Wrench, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { useTheme } from '../context/ThemeContext'
import ProfileModal from './ProfileModal'

const PAGE_TITLES = {
  '/':             'Dashboard',
  '/assets':       'Inventário',
  '/responsaveis': 'Responsáveis',
  '/cadastros':    'Cadastros',
  '/reports':      'Relatórios',
  '/settings':     'Configurações',
  '/manutencoes':  'Próximas Manutenções',
}

export default function Header() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const title     = PAGE_TITLES[location.pathname] ?? 'Inventário TI'
  const { user, profile, signOut } = useAuth()
  const { allAlerts, dismissAlert } = useAlerts()
  const { isDark, toggleTheme } = useTheme()

  const [showDropdown,     setShowDropdown]     = useState(false)
  const [showAlerts,       setShowAlerts]       = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const dropdownRef = useRef(null)
  const alertsRef   = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
      if (alertsRef.current   && !alertsRef.current.contains(e.target))   setShowAlerts(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = (profile?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const errorCount   = allAlerts.filter(a => a.severity === 'error').length
  const warningCount = allAlerts.filter(a => a.severity === 'warning').length

  function goToAssets() {
    navigate('/assets')
    setShowAlerts(false)
  }

  function goToMaintenance() {
    navigate('/manutencoes')
    setShowAlerts(false)
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 hidden sm:block">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
          className="p-2 rounded-lg transition-colors text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Bell */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setShowAlerts(v => !v)}
            className={`relative p-2 rounded-lg transition-colors ${
              showAlerts
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bell size={18} />
            {allAlerts.length > 0 && (
              <span className={`absolute top-1 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 ${
                errorCount > 0 ? 'bg-red-500' : 'bg-amber-400'
              }`}>
                {allAlerts.length > 99 ? '99+' : allAlerts.length}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800 text-sm">Alertas</h3>
                  {errorCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                      {errorCount} crítico{errorCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                      {warningCount} aviso{warningCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowAlerts(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>

              {allAlerts.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">Nenhum alerta no momento</p>
                </div>
              ) : (
                <>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
                    {allAlerts.map(alert => (
                      <div key={alert.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <button
                          onClick={alert.type === 'warranty' ? goToAssets : goToMaintenance}
                          className="flex items-start gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            alert.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'
                          }`}>
                            {alert.type === 'warranty'
                              ? <ShieldOff size={14} className={alert.severity === 'error' ? 'text-red-500' : 'text-amber-500'} />
                              : <Wrench    size={14} className={alert.severity === 'error' ? 'text-red-500' : 'text-amber-500'} />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">{alert.assetName}</p>
                            <p className={`text-xs mt-0.5 ${
                              alert.severity === 'error' ? 'text-red-500' : 'text-amber-600'
                            }`}>
                              {alert.label}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); dismissAlert(alert.id) }}
                          title="Dispensar alerta"
                          className="shrink-0 p-1 mt-0.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 flex gap-3 justify-center">
                    <button onClick={goToAssets} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                      Ver inventário →
                    </button>
                    <span className="text-slate-300">|</span>
                    <button onClick={goToMaintenance} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                      Ver manutenções →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {profile?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-slate-500 max-w-[120px] truncate">{user?.email}</p>
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50">
              <button
                onClick={() => { setShowDropdown(false); setShowProfileModal(true) }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <SettingsIcon size={15} />
                Editar Perfil
              </button>
              <hr className="my-1 border-slate-100 dark:border-slate-700" />
              <button
                onClick={() => { setShowDropdown(false); signOut() }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  )
}
