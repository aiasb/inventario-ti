export default function LoadingScreen({ message = 'Carregando...' }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">{message}</p>
          <p className="text-xs text-slate-400 mt-1">Conectando ao banco de dados...</p>
        </div>
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-red-100 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-red-500 text-xl font-bold">!</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800">Erro ao conectar</p>
          <p className="text-sm text-slate-500 mt-1">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}
