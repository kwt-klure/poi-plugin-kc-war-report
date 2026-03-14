import { useSyncExternalStore } from 'react'

import type { WarReportStyle } from '../battle/types'
import { PACKAGE_NAME } from '../poi/env'

const STORAGE_KEY = `${PACKAGE_NAME}:style`
const DEFAULT_STYLE: WarReportStyle = 'standard_bulletin'
const validStyles = new Set<WarReportStyle>([
  'standard_bulletin',
  'formal_after_action',
  'short_bulletin',
])

let selectedStyle: WarReportStyle = DEFAULT_STYLE
let loaded = false

const subscribers = new Set<() => void>()

const emitChange = () => {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const ensureLoaded = () => {
  if (loaded) {
    return
  }
  loaded = true

  if (!canUseStorage()) {
    selectedStyle = DEFAULT_STYLE
    return
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    selectedStyle =
      raw && validStyles.has(raw as WarReportStyle) ? (raw as WarReportStyle) : DEFAULT_STYLE
  } catch (error) {
    console.error('Failed to load war report style preference', error)
    selectedStyle = DEFAULT_STYLE
  }
}

const persistSelectedStyle = () => {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, selectedStyle)
  } catch (error) {
    console.error('Failed to persist war report style preference', error)
  }
}

export const getWarReportStyle = (): WarReportStyle => {
  ensureLoaded()
  return selectedStyle
}

export const setWarReportStyle = (style: WarReportStyle) => {
  ensureLoaded()
  if (!validStyles.has(style) || selectedStyle === style) {
    return
  }
  selectedStyle = style
  persistSelectedStyle()
  emitChange()
}

export const subscribeWarReportStyle = (listener: () => void) => {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export const useWarReportStyle = () =>
  useSyncExternalStore(subscribeWarReportStyle, getWarReportStyle, getWarReportStyle)

export const __resetWarReportStyleForTests = () => {
  loaded = false
  selectedStyle = DEFAULT_STYLE
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
