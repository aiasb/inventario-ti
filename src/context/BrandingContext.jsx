import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULTS = {
  companyName:     'Inventário TI',
  companySubtitle: 'Gestão de Ativos',
  logoUrl:         null,
  primaryColor:    '#3b82f6',
}

function rowToState(row) {
  return {
    companyName:     row.company_name     ?? DEFAULTS.companyName,
    companySubtitle: row.company_subtitle ?? DEFAULTS.companySubtitle,
    logoUrl:         row.logo_url         ?? null,
    primaryColor:    row.primary_color    ?? DEFAULTS.primaryColor,
  }
}

const BrandingContext = createContext(null)

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ ...DEFAULTS })

  useEffect(() => {
    supabase
      .from('branding')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setBranding(rowToState(data))
      })
  }, [])

  async function saveBranding(patch) {
    const next = { ...branding, ...patch }
    const { error } = await supabase.rpc('save_branding', {
      p_company_name:     next.companyName,
      p_company_subtitle: next.companySubtitle,
      p_logo_url:         next.logoUrl,
      p_primary_color:    next.primaryColor,
    })
    if (error) throw new Error(error.message)
    setBranding(next)
  }

  async function resetBranding() {
    await saveBranding({ ...DEFAULTS })
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
