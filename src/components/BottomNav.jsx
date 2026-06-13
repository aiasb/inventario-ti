import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Wrench, BarChart3, Settings, Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'

export default function BottomNav() {
  const { profile } = useAuth()
  const { branding } = useBranding()
  const isAdmin = profile?.role === 'admin'

  const { primaryColor } = branding

  const items = [
    { to: '/',             icon: LayoutDashboard, label: 'Dashboard',   exact: true },
    { to: '/assets',       icon: Package,         label: 'Inventário' },
    { to: '/manutencoes',  icon: Wrench,           label: 'Manutenções' },
    { to: '/responsaveis', icon: Users,            label: 'Responsáv.' },
    { to: '/reports',      icon: BarChart3,        label: 'Relatórios' },
    ...(isAdmin ? [{ to: '/settings', icon: Settings, label: 'Config.' }] : []),
  ]

  return (
    <nav
      className="flex bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      {items.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className="flex-1 min-w-0"
        >
          {({ isActive }) => (
            <div className="relative flex flex-col items-center justify-center gap-0.5 py-2 transition-colors">
              {isActive && (
                <span
                  className="absolute top-0 left-1 right-1 h-0.5 rounded-b"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
              <Icon
                size={items.length > 5 ? 20 : 22}
                style={{ color: isActive ? primaryColor : undefined }}
                className={isActive ? '' : 'text-slate-400'}
              />
              <span
                className={`text-[9px] font-medium leading-none truncate w-full text-center px-0.5 ${isActive ? '' : 'text-slate-400'}`}
                style={{ color: isActive ? primaryColor : undefined }}
              >
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
