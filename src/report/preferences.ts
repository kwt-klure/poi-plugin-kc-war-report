import { useSyncExternalStore } from 'react'

import type { AddressSnapshot, AdmiralIdentity } from '../battle/types'
import { PACKAGE_NAME } from '../poi/env'

export type WarReportAddressPreferences = {
  formalSenderFallback: string
  formalRecipient: string
  useDetectedAdmiralSender: boolean
}

const STORAGE_KEY = `${PACKAGE_NAME}:formal-addressing`

const DEFAULT_PREFERENCES: WarReportAddressPreferences = {
  formalSenderFallback: '出撃艦隊提督',
  formalRecipient: '聯合艦隊司令部',
  useDetectedAdmiralSender: true,
}

const ADMIRAL_RANK_LABELS: Record<number, string> = {
  1: '元帥',
  2: '大将',
  3: '中将',
  4: '少将',
  6: '大佐',
  7: '中佐',
  9: '新米中佐',
  10: '少佐',
  11: '中堅少佐',
  12: '新米少佐',
}

let loaded = false
let preferences = DEFAULT_PREFERENCES
let detectedAdmiral: AdmiralIdentity | null = null

const subscribers = new Set<() => void>()

const emitChange = () => {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const normalizePreferences = (
  input: Partial<WarReportAddressPreferences> | null | undefined,
): WarReportAddressPreferences => ({
  formalSenderFallback:
    typeof input?.formalSenderFallback === 'string' && input.formalSenderFallback.trim()
      ? input.formalSenderFallback.trim()
      : DEFAULT_PREFERENCES.formalSenderFallback,
  formalRecipient:
    typeof input?.formalRecipient === 'string' && input.formalRecipient.trim()
      ? input.formalRecipient.trim()
      : DEFAULT_PREFERENCES.formalRecipient,
  useDetectedAdmiralSender:
    typeof input?.useDetectedAdmiralSender === 'boolean'
      ? input.useDetectedAdmiralSender
      : DEFAULT_PREFERENCES.useDetectedAdmiralSender,
})

const ensureLoaded = () => {
  if (loaded) {
    return
  }

  loaded = true
  if (!canUseStorage()) {
    preferences = DEFAULT_PREFERENCES
    return
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    preferences = raw
      ? normalizePreferences(JSON.parse(raw) as Partial<WarReportAddressPreferences>)
      : DEFAULT_PREFERENCES
  } catch (error) {
    console.error('Failed to load formal report addressing preferences', error)
    preferences = DEFAULT_PREFERENCES
  }
}

const persistPreferences = () => {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.error('Failed to persist formal report addressing preferences', error)
  }
}

const withPrefix = (prefix: string, value: string) => {
  const trimmed = value.replace(new RegExp(`^${prefix}\\s*[:：]?\\s*`), '').trim()
  return `${prefix}：${trimmed || (prefix === '発' ? DEFAULT_PREFERENCES.formalSenderFallback : DEFAULT_PREFERENCES.formalRecipient)}`
}

export const resolveAdmiralRankLabel = (rankValue: number | null | undefined) =>
  rankValue == null ? null : ADMIRAL_RANK_LABELS[rankValue] ?? null

export const getWarReportAddressPreferences = () => {
  ensureLoaded()
  return preferences
}

export const updateWarReportAddressPreferences = (
  next: Partial<WarReportAddressPreferences>,
) => {
  ensureLoaded()
  const merged = normalizePreferences({
    ...preferences,
    ...next,
  })

  if (
    merged.formalSenderFallback === preferences.formalSenderFallback &&
    merged.formalRecipient === preferences.formalRecipient &&
    merged.useDetectedAdmiralSender === preferences.useDetectedAdmiralSender
  ) {
    return
  }

  preferences = merged
  persistPreferences()
  emitChange()
}

export const subscribeWarReportAddressPreferences = (listener: () => void) => {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export const useWarReportAddressPreferences = () =>
  useSyncExternalStore(
    subscribeWarReportAddressPreferences,
    getWarReportAddressPreferences,
    getWarReportAddressPreferences,
  )

export const getDetectedAdmiralIdentity = () => detectedAdmiral

export const setDetectedAdmiralIdentity = (identity: AdmiralIdentity | null) => {
  const normalized =
    identity && identity.name
      ? {
          name: identity.name.trim() || null,
          rankValue: identity.rankValue ?? null,
          rankLabel: identity.rankLabel ?? resolveAdmiralRankLabel(identity.rankValue),
        }
      : null

  if (
    normalized?.name === detectedAdmiral?.name &&
    normalized?.rankValue === detectedAdmiral?.rankValue &&
    normalized?.rankLabel === detectedAdmiral?.rankLabel
  ) {
    return
  }

  detectedAdmiral = normalized
  emitChange()
}

export const useDetectedAdmiralIdentity = () =>
  useSyncExternalStore(
    subscribeWarReportAddressPreferences,
    getDetectedAdmiralIdentity,
    getDetectedAdmiralIdentity,
  )

export const buildFormalAddressSnapshot = (
  overridePreferences?: WarReportAddressPreferences,
  overrideAdmiral?: AdmiralIdentity | null,
): AddressSnapshot => {
  const currentPreferences = overridePreferences ?? getWarReportAddressPreferences()
  const admiral = overrideAdmiral === undefined ? getDetectedAdmiralIdentity() : overrideAdmiral
  const canUseDetectedSender =
    currentPreferences.useDetectedAdmiralSender && Boolean(admiral?.name)
  const senderDisplay = canUseDetectedSender
    ? `${admiral?.rankLabel ? `${admiral.rankLabel} ` : ''}${admiral?.name ?? ''}`
    : currentPreferences.formalSenderFallback

  return {
    senderLine: withPrefix('発', senderDisplay),
    recipientLine: withPrefix('宛', currentPreferences.formalRecipient),
    usesDetectedAdmiralSender: canUseDetectedSender,
    detectedAdmiral: admiral ?? null,
  }
}

export const __resetWarReportAddressPreferencesForTests = () => {
  loaded = false
  preferences = DEFAULT_PREFERENCES
  detectedAdmiral = null
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
