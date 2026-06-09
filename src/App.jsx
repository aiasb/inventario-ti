import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AssetsProvider } from './context/AssetsContext'
import { MasterDataProvider } from './context/MasterDataContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Responsaveis from './pages/Responsaveis'
import Categories from './pages/Categories'
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

  // Seed inicial do banco (roda apenas se as tabelas estiverem vazias)
  useEffect(() => {
    seedIfEmpty()
      .then(() => setAppState('loading'))
      .catch(err => {
        setErrorMsg(err.message)
        setAppState('error')
      })
  }, [])

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
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/manutencoes" element={<ProximasManutencoes />} />
              <Route path="/responsaveis" element={<Responsaveis />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AssetsProvider>
    </MasterDataProvider>
  )
}

function RequireAdmin({ children }) {
  const { profile } = useAuth()
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function MainApp() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingScreen message="Verificando autenticação..." />
  if (!user) return <Login />

  return <AppProviders />
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
