// Nativní funkce telefonu přes Capacitor – v prohlížeči se tiše přeskočí
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'

const native = Capacitor.isNativePlatform()

export const tap = () => native && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
export const success = () => native && Haptics.notification({ type: NotificationType.Success }).catch(() => {})

export function setupStatusBar() {
  if (!native) return
  const dark = matchMedia('(prefers-color-scheme: dark)')
  const apply = () => {
    StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light }).catch(() => {})
    StatusBar.setBackgroundColor({ color: dark.matches ? '#0b0f14' : '#f4f6f9' }).catch(() => {})
  }
  apply()
  dark.addEventListener('change', apply)
}
