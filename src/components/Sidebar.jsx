import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, BarChart3, Settings,
  ChevronLeft, ChevronRight, Users, Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'
import logoImg from '../assets/logo-cacu.png'

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets',      icon: Package,         label: 'Inventário' },
  { to: '/manutencoes', icon: Wrench,           label: 'Manutenções' },
  { to: '/responsaveis',icon: Users,            label: 'Responsáveis' },
  { to: '/reports',     icon: BarChart3,        label: 'Relatórios' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const { branding } = useBranding()
  const isAdmin = profile?.role === 'admin'

  const { primaryColor, companyName, companySubtitle } = branding

  function activeStyle({ isActive }) {
    return isActive ? { backgroundColor: primaryColor } : undefined
  }

  function activeClass({ isActive }) {
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      collapsed ? 'justify-center' : ''
    } ${isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
  }

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0`}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/60 ${collapsed ? 'justify-center' : ''}`}>
        <img src={logoImg} alt="Logo" className="h-9 w-auto shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">{companyName}</p>
            <p className="text-xs text-slate-400 truncate">{companySubtitle}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={activeClass}
            style={activeStyle}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer: Settings (admin only) */}
      {isAdmin && (
        <div className="p-2 border-t border-slate-700/60">
          <NavLink
            to="/settings"
            className={activeClass}
            style={activeStyle}
            title={collapsed ? 'Configurações' : undefined}
          >
            <Settings size={18} className="shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </NavLink>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
