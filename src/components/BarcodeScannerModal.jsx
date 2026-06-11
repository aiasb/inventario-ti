import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { X, Camera } from 'lucide-react'

const HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.PDF_417,
    BarcodeFormat.ITF,
  ]],
  [DecodeHintType.TRY_HARDER, true],
])

export default function BarcodeScannerModal({ onScan, onClose }) {
  const videoRef   = useRef(null)
  const controlRef = useRef(null)
  const [status, setStatus]   = useState('starting') // 'starting' | 'scanning' | 'error'
  const [errMsg, setErrMsg]   = useState('')
  const [lastScan, setLastScan] = useState('')

  const handleResult = useCallback((result) => {
    if (!result) return
    const text = result.getText()
    // Debounce: ignore repeated detection of same code within 1 s
    if (text === lastScan) return
    setLastScan(text)
    onScan(text)
  }, [lastScan, onScan])

  useEffect(() => {
    let active = true

    async function start() {
      try {
        const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 300 })

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width:  { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, err) => {
            if (!active) return
            if (result) handleResult(result)
            // err is NotFoundException on frames without barcode — normal, ignore
          }
        )

        if (!active) { controls.stop(); return }
        controlRef.current = controls
        setStatus('scanning')
      } catch (err) {
        if (!active) return
        const msg =
          err.name === 'NotAllowedError'  ? 'Permissão de câmera negada. Habilite nas configurações do Android.' :
          err.name === 'NotFoundError'    ? 'Nenhuma câmera encontrada neste dispositivo.' :
          err.name === 'NotSupportedError'? 'Câmera não suportada neste navegador.' :
          `Erro ao acessar câmera: ${err.message}`
        setErrMsg(msg)
        setStatus('error')
      }
    }

    start()

    return () => {
      active = false
      controlRef.current?.stop()
    }
  }, []) // eslint-disable-line

  // Re-run handleResult when lastScan changes (for debounce reference)
  // Nothing needed here — handleResult is recreated with new lastScan

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" style={{ paddingTop: 'var(--sat)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} />
          <span className="text-sm font-medium">Escanear número de série</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Dark corners mask */}
            <div className="absolute inset-0 bg-black/45" style={{
              maskImage: 'radial-gradient(ellipse 280px 130px at center, transparent 98%, black 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 280px 130px at center, transparent 98%, black 100%)',
            }} />

            {/* Scan frame */}
            <div className="relative w-72 h-36">
              {/* Corner brackets */}
              {[
                'top-0 left-0',
                'top-0 right-0 rotate-90',
                'bottom-0 right-0 rotate-180',
                'bottom-0 left-0 -rotate-90',
              ].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-7 h-7`}>
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 rounded" />
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-emerald-400 rounded" />
                </div>
              ))}

              {/* Animated scan line */}
              <div
                className="absolute left-1 right-1 h-0.5 bg-emerald-400 rounded shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
                style={{ animation: 'scan-line 2s ease-in-out infinite' }}
              />
            </div>

            {/* Instructions */}
            <p className="mt-5 text-white/80 text-xs font-medium text-center px-8 drop-shadow">
              Aponte para o código de barras ou QR code do equipamento
            </p>
          </div>
        )}

        {/* Starting spinner */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-xs">Iniciando câmera...</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <Camera size={44} className="text-slate-500" />
            <p className="text-white text-sm text-center leading-relaxed">{errMsg}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-700 text-white rounded-xl text-sm font-medium active:bg-slate-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {status === 'scanning' && (
        <div className="px-4 py-4 bg-black shrink-0" style={{ paddingBottom: 'calc(var(--sab) + 1rem)' }}>
          <p className="text-center text-white/40 text-xs">
            O código será preenchido automaticamente ao ser detectado
          </p>
        </div>
      )}
    </div>
  )
}
