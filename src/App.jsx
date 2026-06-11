import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'
import { AssetsProvider } from './context/AssetsContext'
import { MasterDataProvider } from './context/MasterDataContext'
import { BrandingProvider } from './context/BrandingContext'
import { AlertsProvider } from './context/AlertsContext'
import { OfflineProvider, useOffline } from './context/OfflineContext'
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

function AndroidInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Status bar: fundo branco, ícones escuros (combina com header branco)
    StatusBar.setOverlaysWebView({ overlay: false })
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setBackgroundColor({ color: '#f8fafc' }) // slate-50

    // Botão Voltar: sai do app se não houver histórico
    let backHandler
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else CapApp.exitApp()
    }).then(h => { backHandler = h })

    return () => backHandler?.remove()
  }, [])

  return null
}

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <OfflineProvider>
          <AndroidInit />
          <MainApp />
        </OfflineProvider>
      </AuthProvider>
    </BrandingProvider>
  )
}
