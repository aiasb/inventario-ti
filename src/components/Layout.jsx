import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import OfflineBanner from './OfflineBanner'
import { usePlatform } from '../hooks/usePlatform'

export default function Layout() {
  const { isAndroid } = usePlatform()

  if (isAndroid) {
    return (
      <div
        className="flex flex-col bg-slate-50 overflow-hidden"
        style={{
          height:     '100dvh',
          paddingTop: 'var(--sat)',   // empurra conteúdo abaixo da status bar
        }}
      >
        <Header />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    )
  }

  /* Layout Desktop — sem alteração */
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
