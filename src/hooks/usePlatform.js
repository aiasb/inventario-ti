import { Capacitor } from '@capacitor/core'

const platform = Capacitor.getPlatform()   // 'android' | 'ios' | 'web'
const isNative = Capacitor.isNativePlatform()

export function usePlatform() {
  return {
    isNative,
    isAndroid: platform === 'android',
    isWeb:     platform === 'web',
    platform,
  }
}
