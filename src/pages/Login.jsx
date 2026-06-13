import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, UserPlus, LogIn, Wifi, ChevronDown, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'
import { usePlatform } from '../hooks/usePlatform'
import { getServerUrl, setServerUrl } from '../lib/api-client'
import logoImg from '../assets/logo-cacu.png'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const { branding } = useBranding()
  const { companyName, companySubtitle, primaryColor } = branding
  const { isAndroid } = usePlatform()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Server config
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [serverInput, setServerInput] = useState(() => getServerUrl())
  const [serverSaved, setServerSaved] = useState(false)

  function handleSaveServer() {
    setServerUrl(serverInput)
    setServerSaved(true)
    setError('')
    setTimeout(() => setServerSaved(false), 2500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, fullName)
        setSuccess('Conta criada com sucesso!')
        setMode('login')
      }
    } catch (err) {
      const isFetchErr = err.message?.toLowerCase().includes('fetch') ||
                         err.message?.toLowerCase().includes('network') ||
                         err.message?.toLowerCase().includes('failed')

      if (isFetchErr) {
        setError('Não foi possível conectar ao servidor. Verifique a URL do servidor abaixo.')
        setShowServerConfig(true)
      } else {
        const msgs = {
          'Email ou senha inválidos': 'E-mail ou senha incorretos.',
          'Email já cadastrado':      'Este e-mail já está cadastrado.',
        }
        setError(msgs[err.message] ?? err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left — branding panel (desktop only) */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}99 50%, #0f172a 100%)` }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-slate-900/60 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />
        </div>

        <div />

        <div className="relative space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight mb-3">
              Controle total dos seus ativos de TI
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              Gerencie equipamentos, monitore manutenções e mantenha seu inventário sempre atualizado.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: '📦', label: 'Inventário completo de ativos' },
              { icon: '🔧', label: 'Histórico de manutenções' },
              { icon: '📊', label: 'Relatórios e dashboards' },
              { icon: '🔒', label: 'Dados salvos localmente com segurança' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-blue-100 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-xs">© {new Date().getFullYear()} {companyName}. Todos os direitos reservados.</p>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          {!isAndroid && (
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <img src={logoImg} alt={companyName} className="h-10 w-auto object-contain" />
            </div>
          )}

          {/* Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

            {/* Logo */}
            <div className="flex flex-col items-center mb-7">
              <img src={logoImg} alt={companyName} className="h-20 w-auto object-contain mb-5" />
              <h2 className="text-xl font-bold text-white">
                {mode === 'login' ? 'Acessar conta' : 'Criar conta'}
              </h2>
              <p className="text-slate-400 text-sm mt-1 text-center">
                {mode === 'login' ? 'Informe suas credenciais para continuar' : 'Preencha os dados para criar sua conta'}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 mb-5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2.5 p-3 mb-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
                <CheckCircle2 size={16} className="shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="João Silva"
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition-opacity mt-2 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            {/* Toggle login/register */}
            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>

            {/* ── Configuração do servidor ────────────────────────────────── */}
            <div className="mt-5 pt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowServerConfig(v => !v)}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 w-full justify-center transition-colors"
              >
                <Wifi size={12} />
                <span>Configurar servidor</span>
                <ChevronDown size={12} className={`transition-transform ${showServerConfig ? 'rotate-180' : ''}`} />
              </button>

              {showServerConfig && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500 text-center">
                    URL do servidor backend. No Android, use o IP da máquina na rede local.
                  </p>
                  <input
                    type="url"
                    value={serverInput}
                    onChange={e => setServerInput(e.target.value)}
                    placeholder="http://192.168.1.x"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSaveServer}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      serverSaved
                        ? 'bg-emerald-600/20 border border-emerald-600/30 text-emerald-400'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {serverSaved ? <CheckCircle2 size={14} /> : <Wifi size={14} />}
                    {serverSaved ? 'URL salva!' : 'Salvar URL do servidor'}
                  </button>
                  {serverSaved && (
                    <p className="text-xs text-slate-500 text-center">
                      Tente fazer login novamente.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
