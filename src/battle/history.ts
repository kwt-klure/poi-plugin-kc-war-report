import { useSyncExternalStore } from 'react'

import { PACKAGE_NAME } from '../poi/env'
import {
  buildFormalAddressSnapshot,
  normalizeAdmiralRankLabel,
  normalizeFormalSenderLine,
} from '../report/preferences'
import type {
  AddressSnapshot,
  BattleCapture,
  SortieSessionCapture,
  WarReportHistoryEntry,
  WarReportHistoryState,
  WarReportHistoryView,
  WarReportSelectionSnapshot,
  WarReportStyle,
  WarReportTruthSource,
} from './types'

const STORAGE_KEY = `${PACKAGE_NAME}:history`
const HISTORY_LIMIT = 100

const initialState: WarReportHistoryState = {
  entries: [],
  selectedId: null,
  currentInProgressSortie: null,
}

let state: WarReportHistoryState = initialState
let loaded = false
let cachedView: WarReportHistoryView = {
  ...initialState,
  latestEntry: null,
  selectedEntry: null,
}

const subscribers = new Set<() => void>()

const emitChange = () => {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const isValidSortieSession = (value: unknown): value is SortieSessionCapture => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SortieSessionCapture>
  return Boolean(
    candidate.id &&
      typeof candidate.startedAt === 'number' &&
      typeof candidate.updatedAt === 'number' &&
      Array.isArray(candidate.friendlyFleetInitial) &&
      Array.isArray(candidate.friendlyFleetLatest) &&
      Array.isArray(candidate.nodeTrail) &&
      Array.isArray(candidate.battles),
  )
}

const isValidPracticeCapture = (value: unknown): value is BattleCapture => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BattleCapture>
  return Boolean(
    candidate.kind === 'practice' &&
      typeof candidate.occurredAt === 'number' &&
      Array.isArray(candidate.friendlyFleet) &&
      Array.isArray(candidate.enemyShipNamesRaw),
  )
}

const isValidTruthSource = (value: unknown): value is WarReportTruthSource => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<WarReportTruthSource>
  if (candidate.kind === 'sortie') {
    return isValidSortieSession(candidate.sortie)
  }

  if (candidate.kind === 'practice') {
    return isValidPracticeCapture(candidate.practice)
  }

  return false
}

const WAR_REPORT_STYLES: WarReportStyle[] = [
  'standard_bulletin',
  'short_bulletin',
  'formal_after_action',
]

const isValidSelectionSnapshot = (value: unknown): value is WarReportSelectionSnapshot => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<WarReportSelectionSnapshot>
  return Boolean(
    candidate.style &&
      WAR_REPORT_STYLES.includes(candidate.style) &&
      typeof candidate.mainNarrative === 'string' &&
      typeof candidate.fingerprint === 'number' &&
      candidate.slotFamilies &&
      typeof candidate.slotFamilies === 'object' &&
      !Array.isArray(candidate.slotFamilies),
  )
}

const normalizeSelectionSnapshots = (
  snapshots: Partial<Record<WarReportStyle, WarReportSelectionSnapshot>> | null | undefined,
) =>
  snapshots
    ? Object.fromEntries(
        Object.entries(snapshots).filter(
          ([style, snapshot]) =>
            WAR_REPORT_STYLES.includes(style as WarReportStyle) &&
            isValidSelectionSnapshot(snapshot),
        ),
      ) as Partial<Record<WarReportStyle, WarReportSelectionSnapshot>>
    : undefined

const normalizeRenderedFormalBody = (body: string | null | undefined) =>
  typeof body === 'string'
    ? body.replace(/発：海軍元帥海軍大将(?=\s)/g, '発：元帥海軍大将')
    : body

const normalizeAddressSnapshot = (
  snapshot: WarReportHistoryEntry['addressSnapshot'] | null | undefined,
  fallback: AddressSnapshot,
): AddressSnapshot => {
  if (!snapshot) {
    return fallback
  }

  const detectedAdmiral = snapshot.detectedAdmiral
    ? {
        ...snapshot.detectedAdmiral,
        rankLabel: normalizeAdmiralRankLabel(snapshot.detectedAdmiral.rankLabel),
      }
    : null

  return {
    ...snapshot,
    senderLine: normalizeFormalSenderLine(snapshot.senderLine),
    detectedAdmiral,
  }
}

const normalizeEntry = (entry: WarReportHistoryEntry): WarReportHistoryEntry => {
  const renderedReports = {
    ...(entry.renderedReports ?? { standard_bulletin: entry.report }),
  }
  const defaultAddressSnapshot = buildFormalAddressSnapshot()
  const selectionSnapshots = normalizeSelectionSnapshots(
    entry.selectionSnapshots ?? {
      standard_bulletin: renderedReports.standard_bulletin?.selectionSnapshot,
      short_bulletin: renderedReports.short_bulletin?.selectionSnapshot,
      formal_after_action: renderedReports.formal_after_action?.selectionSnapshot,
    },
  )
  const addressSnapshot = normalizeAddressSnapshot(entry.addressSnapshot, defaultAddressSnapshot)

  if (renderedReports.formal_after_action) {
    renderedReports.formal_after_action = {
      ...renderedReports.formal_after_action,
      body: normalizeRenderedFormalBody(renderedReports.formal_after_action.body) ?? '',
    }
  }

  return {
    ...entry,
    renderedReports,
    variantSeed: typeof entry.variantSeed === 'number' ? entry.variantSeed : undefined,
    addressSnapshot,
    truthSource: isValidTruthSource(entry.truthSource) ? entry.truthSource : null,
    selectionSnapshots,
  }
}

const normalizeState = (input: Partial<WarReportHistoryState> | null | undefined): WarReportHistoryState => {
  const entries = Array.isArray(input?.entries)
    ? input.entries
        .filter((entry): entry is WarReportHistoryEntry =>
          Boolean(
            entry?.id &&
              entry?.capturedAt &&
              entry?.entryType &&
              entry?.status &&
              entry?.record &&
              entry?.report,
          ),
        )
        .map(normalizeEntry)
    : []

  const selectedId =
    typeof input?.selectedId === 'string' && entries.some((entry) => entry.id === input.selectedId)
      ? input.selectedId
      : entries[0]?.id ?? null

  return {
    entries: entries.slice(0, HISTORY_LIMIT),
    selectedId,
    currentInProgressSortie: isValidSortieSession(input?.currentInProgressSortie)
      ? input.currentInProgressSortie
      : null,
  }
}

const persistState = () => {
  if (!canUseStorage()) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to persist war report history', error)
  }
}

const ensureLoaded = () => {
  if (loaded) {
    return
  }
  loaded = true
  if (!canUseStorage()) {
    state = initialState
    rebuildView()
    return
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      state = initialState
      rebuildView()
      return
    }
    state = normalizeState(JSON.parse(raw) as Partial<WarReportHistoryState>)
    rebuildView()
  } catch (error) {
    console.error('Failed to load war report history', error)
    state = initialState
    rebuildView()
  }
}

const getSelectedEntry = (currentState: WarReportHistoryState) => {
  if (currentState.entries.length === 0) {
    return null
  }
  if (!currentState.selectedId) {
    return currentState.entries[0] ?? null
  }
  return (
    currentState.entries.find((entry) => entry.id === currentState.selectedId) ??
    currentState.entries[0] ??
    null
  )
}

const rebuildView = () => {
  cachedView = {
    ...state,
    latestEntry: state.entries[0] ?? null,
    selectedEntry: getSelectedEntry(state),
  }
}

const setState = (nextState: WarReportHistoryState) => {
  state = normalizeState(nextState)
  rebuildView()
  persistState()
  emitChange()
}

export const appendWarReportHistoryEntry = (
  entry: Omit<WarReportHistoryEntry, 'id'> & { id?: string },
) => {
  ensureLoaded()

  const nextEntry: WarReportHistoryEntry = {
    ...entry,
    id: entry.id ?? `${entry.entryType}:${entry.capturedAt}:${entry.record.operationLabel}`,
  }

  const previousLatestId = state.entries[0]?.id ?? null
  const shouldFollowLatest = state.selectedId == null || state.selectedId === previousLatestId
  const nextEntries = [nextEntry, ...state.entries.filter((item) => item.id !== nextEntry.id)].slice(
    0,
    HISTORY_LIMIT,
  )
  const selectedId =
    shouldFollowLatest || !state.selectedId || !nextEntries.some((item) => item.id === state.selectedId)
      ? nextEntry.id
      : state.selectedId

  setState({
    ...state,
    entries: nextEntries,
    selectedId,
  })
}

export const setCurrentInProgressSortie = (session: SortieSessionCapture | null) => {
  ensureLoaded()
  setState({
    ...state,
    currentInProgressSortie: session,
  })
}

export const getCurrentInProgressSortie = (): SortieSessionCapture | null => {
  ensureLoaded()
  return state.currentInProgressSortie
}

export const selectWarReportHistoryEntry = (id: string) => {
  ensureLoaded()
  if (!state.entries.some((entry) => entry.id === id)) {
    return
  }
  setState({
    ...state,
    selectedId: id,
  })
}

export const deleteWarReportHistoryEntry = (id: string) => {
  ensureLoaded()
  const entries = state.entries.filter((entry) => entry.id !== id)
  setState({
    ...state,
    entries,
    selectedId:
      state.selectedId === id
        ? entries[0]?.id ?? null
        : entries.some((entry) => entry.id === state.selectedId)
          ? state.selectedId
          : entries[0]?.id ?? null,
  })
}

export const clearWarReportHistory = () => {
  ensureLoaded()
  setState(initialState)
}

export const getWarReportHistoryView = () => {
  ensureLoaded()
  return cachedView
}

export const subscribeWarReportHistory = (listener: () => void) => {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}

export const useWarReportHistory = () =>
  useSyncExternalStore(subscribeWarReportHistory, getWarReportHistoryView, getWarReportHistoryView)

export const __resetWarReportHistoryForTests = () => {
  loaded = false
  state = initialState
  cachedView = {
    ...initialState,
    latestEntry: null,
    selectedEntry: null,
  }
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
