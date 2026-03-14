/**
 * See https://dev.poooi.app/docs/api-poi-utils.html#notifications
 */
import { IN_POI } from './env'

type PoiWindow = Window & {
  toast?: (message: string) => void
  log?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
  success?: (message: string) => void
}

export const toast = (message: string) => {
  if (!IN_POI) {
    // eslint-disable-next-line no-console
    console.log('[Toast]', message)
    return
  }
  ;(window as PoiWindow).toast?.(message)
}

export const tips = {
  log(message: string) {
    if (!IN_POI) {
      // eslint-disable-next-line no-console
      console.log('[log]', message)
      return
    }
    ;(window as PoiWindow).log?.(message)
  },
  warn(message: string) {
    if (!IN_POI) {
      console.warn('[warn]', message)
      return
    }
    ;(window as PoiWindow).warn?.(message)
  },
  error(message: string) {
    if (!IN_POI) {
      console.error('[error]', message)
      return
    }
    ;(window as PoiWindow).error?.(message)
  },
  success(message: string) {
    if (!IN_POI) {
      // eslint-disable-next-line no-console
      console.log('[success]', message)
      return
    }
    ;(window as PoiWindow).success?.(message)
  },
}
