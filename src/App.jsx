import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'
import { AssetsProvider } from './context/AssetsContext'
import { MasterDataProvider } from './context/MasterDataContext'
import { BrandingProvider } from './context/BrandingContext'
import { AlertsProvider } from './context/AlertsContext'
import { OfflineProvider, useOffline } from './context/OfflineContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Responsaveis from './pages/Responsaveis'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ProximasManutencoes from './pages/ProximasManutencoes'
import LoadingScreen, { ErrorScreen } from './components/LoadingScreen'
import { seedIfEmpty } from './lib/api'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'

function AppProviders() {
  const [appState, setAppState] = useState('seeding') // 'seeding' | 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [masterReady, setMasterReady] = useState(false)
  const [assetsReady, setAssetsReady] = useState(false)
  const { isOnline } = useOffline()

  // Seed inicial do banco; se offline, pula e carrega do cache
  useEffect(() => {
    if (!isOnline) {
      setAppState('loading')
      return
    }
    seedIfEmpty()
      .then(() => setAppState('loading'))
      .catch(err => {
        // Falha de rede: carrega do cache em vez de mostrar erro
        const isNetErr = !navigator.onLine || err.message?.includes('fetch')
        if (isNetErr) setAppState('loading')
        else { setErrorMsg(err.message); setAppState('error') }
      })
  }, []) // eslint-disable-line

  // Quando ambos os providers terminarem de carregar, app está pronto
  useEffect(() => {
    if (masterReady && assetsReady) setAppState('ready')
  }, [masterReady, assetsReady])

  function handleError(msg) {
    setErrorMsg(msg)
    setAppState('error')
  }

  if (appState === 'seeding') return <LoadingScreen message="Inicializando sistema..." />
  if (appState === 'error') return <ErrorScreen message={errorMsg} onRetry={() => window.location.reload()} />

  return (
    <MasterDataProvider
      onReady={() => setMasterReady(true)}
      onError={handleError}
    >
      <AssetsProvider
        onReady={() => setAssetsReady(true)}
        onError={handleError}
      >
        {appState !== 'ready' && <LoadingScreen message="Carregando dados..." />}
        <AlertsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/manutencoes" element={<ProximasManutencoes />} />
              <Route path="/responsaveis" element={<Responsaveis />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            </Route>
          </Routes>
        </BrowserRouter>
        </AlertsProvider>
      </AssetsProvider>
    </MasterDataProvider>
  )
}

function RequireAdmin({ children }) {
  const { profile, loading } = useAuth()
  // Enquanto o perfil não carregou, não renderiza nada (evita flash de acesso)
  if (loading || !profile) return null
  if (profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function MainApp() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingScreen message="Verificando autenticação..." />
  if (!user) return <Login />

  return <AppProviders />
}

function ExitAppDialog({ onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Card */}
      <div className="relative w-full max-w-xs bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Icon strip */}
        <div className="flex justify-center pt-7 pb-3">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="px-6 pb-5 text-center">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Sair do aplicativo?
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tem certeza que deseja fechar o aplicativo?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300
                       hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-r
                       border-slate-100 dark:border-slate-700"
          >
            Não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Sim, sair
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function AndroidInit() {
  const { isDark } = useTheme()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const lastBackRef  = useRef(0)
  const dialogRef    = useRef(false)

  useEffect(() => { dialogRef.current = showExitDialog }, [showExitDialog])

  // Atualiza StatusBar ao mudar de tema
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setOverlaysWebView({ overlay: false })
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
    StatusBar.setBackgroundColor({ color: isDark ? '#0f172a' : '#f8fafc' })
  }, [isDark])

  // Botão Voltar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let backHandler
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // Dialog de saída aberto: fechar com Não
      if (dialogRef.current) {
        setShowExitDialog(false)
        return
      }
      // Ainda tem histórico de navegação: voltar normalmente
      if (canGoBack) {
        window.history.back()
        return
      }
      // Raiz da app: duplo toque para sair
      const now = Date.now()
      if (now - lastBackRef.current < 2000) {
        setShowExitDialog(true)
      }
      lastBackRef.current = now
    }).then(h => { backHandler = h })
    return () => backHandler?.remove()
  }, [])

  if (!showExitDialog) return null

  return (
    <ExitAppDialog
      onConfirm={() => CapApp.exitApp()}
      onCancel={() => setShowExitDialog(false)}
    />
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <AuthProvider>
          <OfflineProvider>
            <AndroidInit />
            <MainApp />
          </OfflineProvider>
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  )
}
