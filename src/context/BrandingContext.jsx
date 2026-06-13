import { createContext, useContext, useState, useEffect } from 'react'

export const DEFAULTS = {
  companyName:     'Inventário TI',
  companySubtitle: 'Gestão de Ativos',
  primaryColor:    '#3b82f6',
}

const STORAGE_KEY = 'branding_config'

const BrandingContext = createContext(null)

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS }
    } catch {
      return { ...DEFAULTS }
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding))
  }, [branding])

  async function saveBranding(patch) {
    setBranding(prev => ({ ...prev, ...patch }))
  }

  async function resetBranding() {
    setBranding({ ...DEFAULTS })
  }

  return (
    <BrandingContext.Provider value={{ branding, saveBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider')
  return ctx
}
