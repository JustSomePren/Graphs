// Nativní funkce telefonu přes Capacitor – v prohlížeči se tiše přeskočí
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'

import { Share } from '@capacitor/share'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { loadSettings } from './storage.js'

const native = Capacitor.isNativePlatform()
const vibrate = () => native && loadSettings().haptics

export const tap = () => vibrate() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
export const success = () => vibrate() && Haptics.notification({ type: NotificationType.Success }).catch(() => {})

// Sdílení: na telefonu systémový dialog, v prohlížeči Web Share nebo schránka
export async function share(text) {
  try {
    if (native) await Share.share({ text })
    else if (navigator.share) await navigator.share({ text })
    else {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
    return 'shared'
  } catch {
    return 'cancelled'
  }
}

// Motiv: system | light | dark (přepisuje nastavení telefonu)
export function applyTheme(theme = loadSettings().theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

export function setupStatusBar() {
  if (!native) return
  const dark = matchMedia('(prefers-color-scheme: dark)')
  const apply = () => {
    const theme = loadSettings().theme
    const isDark = theme === 'dark' || (theme === 'system' && dark.matches)
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {})
    StatusBar.setBackgroundColor({ color: isDark ? '#0b0f14' : '#f4f6f9' }).catch(() => {})
  }
  apply()
  dark.addEventListener('change', apply)
  window.addEventListener('themechange', apply)
}

// Kreslení na celou obrazovku: na telefonu zamkne orientaci na šířku
export async function enterLandscape(element) {
  try {
    if (native) return await ScreenOrientation.lock({ orientation: 'landscape' })
    await element.requestFullscreen?.()
    await screen.orientation?.lock?.('landscape')
  } catch {}
}

export async function exitLandscape() {
  try {
    if (native) return await ScreenOrientation.unlock()
    screen.orientation?.unlock?.()
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {}
}
