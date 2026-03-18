import {
  appendWarReportHistoryEntry,
  getCurrentInProgressSortie,
  getWarReportHistoryView,
  setCurrentInProgressSortie,
  subscribeWarReportHistory,
  useWarReportHistory,
} from './history'
import {
  buildDamageAssessment,
  normalizePracticeCapture,
  normalizeSortieSession,
} from './model'
import { IN_POI } from '../poi/env'
import { getStoreValue } from '../poi/store'
import { buildFormalAddressSnapshot, resolveAdmiralRankLabel, setDetectedAdmiralIdentity } from '../report/preferences'
import { buildRenderedReportsForHistoryEntry } from '../report/render'
import type { PoiFleet, PoiShip, PoiShipMaster, PoiShipTypeMaster } from '../poi/types'
import type {
  AdmiralIdentity,
  BattleCapture,
  BattleMode,
  BattleNodeCapture,
  FleetShipSnapshot,
  SortieSessionCapture,
  WarReportHistoryEntry,
} from './types'

type GameResponseDetail = {
  path: string
  body: Record<string, unknown>
  postBody?: Record<string, string>
  time?: number
}

type GameResponseEvent = CustomEvent<GameResponseDetail>

type ResultBody = {
  api_win_rank?: string
  api_quest_name?: string
  api_mvp?: number
  api_enemy_info?: {
    api_deck_name?: string
  }
}

type BattlePacket = {
  api_ship_ke?: number[]
  api_kouku?: unknown
  api_injection_kouku?: unknown
  api_air_base_attack?: unknown[]
  api_friendly_kouku?: unknown
}

type CurrentBattleContext = {
  occurredAt: number
  kind: 'sortie' | 'practice'
  mode: BattleMode
  deckId: number
  map: [number, number, number] | null
  nodeLabel: string | null
  fleetShips: FleetShipSnapshot[]
  practiceOpponent: string | null
  enemyShipIds: number[]
  sawAirAttack: boolean
}

type PendingFinalize = {
  context: CurrentBattleContext
  resultBody: ResultBody
}

type DeckResolutionSources = {
  sortieDeckId?: number | null
  battleDeckId?: number | null
  activeFleetId?: number | null
}

let currentBattle: CurrentBattleContext | null = null
let currentSortie: SortieSessionCapture | null = null
let practiceOpponent: string | null = null
let finalizeTimer: ReturnType<typeof setTimeout> | null = null
let pendingFinalize: PendingFinalize | null = null
let listening = false

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  return null
}

const getActiveFleetIdFromStore = () =>
  toPositiveInteger(getStoreValue<number | string>(['ui', 'activeFleetId']))

const resolveDeckIdFromSources = (
  detail: GameResponseDetail,
  sources: DeckResolutionSources = {},
) =>
  toPositiveInteger(detail.postBody?.api_deck_id) ??
  toPositiveInteger(detail.body.api_deck_id) ??
  toPositiveInteger(sources.sortieDeckId) ??
  toPositiveInteger(sources.battleDeckId) ??
  toPositiveInteger(sources.activeFleetId) ??
  1

const cloneFleetSnapshot = (ships: FleetShipSnapshot[]) => ships.map((ship) => ({ ...ship }))

const updateDetectedAdmiralFromBody = (body: Record<string, unknown> | null | undefined) => {
  if (!body) {
    return
  }

  const rawNickname = body.api_nickname
  const rawRank = body.api_rank
  const nickname =
    typeof rawNickname === 'string' && rawNickname.trim()
      ? rawNickname.trim()
      : typeof rawNickname === 'number'
        ? String(rawNickname)
        : ''
  const rankValue =
    typeof rawRank === 'number'
      ? rawRank
      : typeof rawRank === 'string' && rawRank.trim()
        ? Number(rawRank)
        : null

  if (!nickname) {
    return
  }

  const identity: AdmiralIdentity = {
    name: nickname,
    rankValue: Number.isFinite(rankValue as number) ? (rankValue as number) : null,
    rankLabel: resolveAdmiralRankLabel(
      Number.isFinite(rankValue as number) ? (rankValue as number) : null,
    ),
  }

  setDetectedAdmiralIdentity(identity)
}

const getArrayValue = <T>(value: Record<string, T> | T[] | null | undefined, id: string | number) => {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value[Number(id)] ?? null
  }

  return value[String(id)] ?? null
}

const captureShipSnapshot = (shipInstanceId: number): FleetShipSnapshot | null => {
  const ship = getStoreValue<PoiShip>(['info', 'ships', shipInstanceId])
  if (!ship?.api_ship_id || ship.api_nowhp == null || ship.api_maxhp == null) {
    return null
  }

  const master = getStoreValue<Record<string, PoiShipMaster> | PoiShipMaster[]>([
    'const',
    '$ships',
  ])
  const shipMaster = getArrayValue(master ?? null, ship.api_ship_id)
  const shipTypes = getStoreValue<Record<string, PoiShipTypeMaster> | PoiShipTypeMaster[]>([
    'const',
    '$shipTypes',
  ])
  const shipTypeMaster =
    shipMaster?.api_stype != null ? getArrayValue(shipTypes ?? null, shipMaster.api_stype) : null

  return {
    instanceId: shipInstanceId,
    shipId: ship.api_ship_id,
    nameJa: shipMaster?.api_name ?? `艦ID ${ship.api_ship_id}`,
    typeId: shipMaster?.api_stype ?? null,
    typeNameJa: shipTypeMaster?.api_name ?? null,
    level: ship.api_lv ?? 0,
    startHp: ship.api_nowhp,
    endHp: null,
    maxHp: ship.api_maxhp,
  }
}

const captureFleetSnapshot = (deckId: number): FleetShipSnapshot[] => {
  const fleet =
    getStoreValue<PoiFleet>(['info', 'fleets', deckId - 1]) ??
    getStoreValue<PoiFleet>(['info', 'decks', deckId - 1]) ??
    getStoreValue<PoiFleet>(['info', 'fleets', deckId]) ??
    getStoreValue<PoiFleet>(['info', 'decks', deckId])

  const shipIds = (fleet?.api_ship ?? []).filter(
    (value): value is number => typeof value === 'number' && value > 0,
  )
  return shipIds
    .map((shipInstanceId) => captureShipSnapshot(shipInstanceId))
    .filter((ship): ship is FleetShipSnapshot => ship != null)
}

const captureFleetSnapshotWithFallback = (
  deckId: number,
  fallbackShips: FleetShipSnapshot[] = [],
) => {
  const captured = captureFleetSnapshot(deckId)
  return captured.length > 0 ? captured : cloneFleetSnapshot(fallbackShips)
}

const updateFleetEndHp = (ships: FleetShipSnapshot[]): FleetShipSnapshot[] =>
  ships.map((ship) => {
    const latestShip = getStoreValue<PoiShip>(['info', 'ships', ship.instanceId])
    return {
      ...ship,
      endHp: latestShip?.api_nowhp ?? ship.endHp,
    }
  })

export const refreshFleetSnapshotFromStore = (ships: FleetShipSnapshot[]): FleetShipSnapshot[] =>
  ships.map((ship) => {
    const latestSnapshot = captureShipSnapshot(ship.instanceId)
    if (!latestSnapshot) {
      return ship
    }

    return {
      ...latestSnapshot,
      startHp: ship.startHp,
      endHp: latestSnapshot.startHp,
    }
  })

const hasMeaningfulPhaseData = (value: unknown): boolean => {
  if (value == null) {
    return false
  }

  if (typeof value === 'number') {
    return value > 0
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulPhaseData(entry))
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasMeaningfulPhaseData(entry),
    )
  }

  return false
}

const detectAirAttackFromPacket = (packet: BattlePacket) =>
  hasMeaningfulPhaseData(packet.api_kouku) ||
  hasMeaningfulPhaseData(packet.api_injection_kouku) ||
  hasMeaningfulPhaseData(packet.api_air_base_attack) ||
  hasMeaningfulPhaseData(packet.api_friendly_kouku)

const getEnemyShipNames = (enemyShipIds: number[]) => {
  const masters = getStoreValue<Record<string, PoiShipMaster> | PoiShipMaster[]>(['const', '$ships'])
  return enemyShipIds
    .filter((shipId) => shipId > 0)
    .map((shipId) => getArrayValue(masters ?? null, shipId)?.api_name ?? `敵艦ID ${shipId}`)
}

const buildMapLabel = (map: [number, number, number] | null) =>
  map ? `${map[0]}-${map[1]}` : null

const buildOperationLabelRaw = (context: CurrentBattleContext, resultBody: ResultBody) =>
  context.kind === 'practice'
    ? `演習: ${context.practiceOpponent ?? '対抗部隊'}`
    : resultBody.api_quest_name ?? (buildMapLabel(context.map) ? `${buildMapLabel(context.map)} 海域` : '出撃海域')

const buildOperationPhraseRaw = (context: CurrentBattleContext, resultBody: ResultBody) =>
  context.kind === 'practice'
    ? '対抗演習'
    : resultBody.api_quest_name ?? (buildMapLabel(context.map) ? `${buildMapLabel(context.map)} 海域` : '出撃海域')

const buildPracticeCapture = (context: CurrentBattleContext, resultBody: ResultBody): BattleCapture => {
  const friendlyFleet = updateFleetEndHp(context.fleetShips)
  const mvpIndex = typeof resultBody.api_mvp === 'number' ? resultBody.api_mvp - 1 : -1
  const mvpShip = mvpIndex >= 0 ? friendlyFleet[mvpIndex] ?? null : null
  const antiAirScreen =
    context.sawAirAttack &&
    friendlyFleet.filter((ship) =>
      ship.nameJa.includes('秋月') ||
      ship.nameJa.includes('照月') ||
      ship.nameJa.includes('涼月') ||
      ship.nameJa.includes('初月') ||
      ship.nameJa.includes('冬月') ||
      ship.nameJa.includes('満月'),
    ).length >= 2

  return {
    occurredAt: context.occurredAt,
    kind: 'practice',
    mode: 'practice',
    operationLabelRaw: buildOperationLabelRaw(context, resultBody),
    operationPhraseRaw: buildOperationPhraseRaw(context, resultBody),
    mapLabel: null,
    friendlyFleet,
    enemyDeckNameRaw: resultBody.api_enemy_info?.api_deck_name ?? null,
    enemyShipNamesRaw: getEnemyShipNames(context.enemyShipIds),
    winRank: resultBody.api_win_rank ?? null,
    damageSummary: buildDamageAssessment(friendlyFleet),
    sawAirAttack: context.sawAirAttack,
    antiAirScreen,
    practiceOpponent: context.practiceOpponent,
    flagshipNameRaw: friendlyFleet[0]?.nameJa ?? null,
    mvpNameRaw: mvpShip?.nameJa ?? null,
  }
}

const buildBattleNodeCapture = (
  context: CurrentBattleContext,
  resultBody: ResultBody,
): BattleNodeCapture => {
  const friendlyFleet = updateFleetEndHp(context.fleetShips)
  const mvpIndex = typeof resultBody.api_mvp === 'number' ? resultBody.api_mvp - 1 : -1
  const mvpShip = mvpIndex >= 0 ? friendlyFleet[mvpIndex] ?? null : null
  const antiAirScreen =
    context.sawAirAttack &&
    friendlyFleet.filter((ship) =>
      ship.nameJa.includes('秋月') ||
      ship.nameJa.includes('照月') ||
      ship.nameJa.includes('涼月') ||
      ship.nameJa.includes('初月') ||
      ship.nameJa.includes('冬月') ||
      ship.nameJa.includes('満月'),
    ).length >= 2

  return {
    occurredAt: context.occurredAt,
    mode: context.mode,
    nodeLabel: context.nodeLabel,
    operationLabelRaw: buildOperationLabelRaw(context, resultBody),
    operationPhraseRaw: buildOperationPhraseRaw(context, resultBody),
    friendlyFleet,
    enemyDeckNameRaw: resultBody.api_enemy_info?.api_deck_name ?? null,
    enemyShipNamesRaw: getEnemyShipNames(context.enemyShipIds),
    winRank: resultBody.api_win_rank ?? null,
    damageSummary: buildDamageAssessment(friendlyFleet),
    sawAirAttack: context.sawAirAttack,
    antiAirScreen,
    flagshipNameRaw: friendlyFleet[0]?.nameJa ?? null,
    mvpNameRaw: mvpShip?.nameJa ?? null,
  }
}

const buildSortieHistoryEntry = (
  session: SortieSessionCapture,
  status: 'completed' | 'failed',
) => {
  const record = normalizeSortieSession(session, status)
  const { variantSeed, addressSnapshot, renderedReports, selectionSnapshots } =
    buildRenderedReportsForHistoryEntry(
      record,
      { kind: 'sortie', sortie: session },
      buildFormalAddressSnapshot(),
      getWarReportHistoryView().entries,
    )
  return {
    id: `sortie:${session.id}:${status}`,
    capturedAt: status === 'completed' ? Date.now() : session.updatedAt,
    entryType: 'sortie' as const,
    status,
    record,
    report: renderedReports.standard_bulletin!,
    renderedReports,
    variantSeed,
    addressSnapshot,
    truthSource: {
      kind: 'sortie' as const,
      sortie: session,
    },
    selectionSnapshots,
  }
}

const buildPracticeHistoryEntry = (capture: BattleCapture) => {
  const record = normalizePracticeCapture(capture)
  const { variantSeed, addressSnapshot, renderedReports, selectionSnapshots } =
    buildRenderedReportsForHistoryEntry(
      record,
      { kind: 'practice', practice: capture },
      buildFormalAddressSnapshot(),
      getWarReportHistoryView().entries,
    )
  return {
    id: `practice:${record.occurredAt}:${record.practiceOpponent ?? ''}`,
    capturedAt: record.occurredAt,
    entryType: 'practice' as const,
    status: 'completed' as const,
    record,
    report: renderedReports.standard_bulletin!,
    renderedReports,
    variantSeed,
    addressSnapshot,
    truthSource: {
      kind: 'practice' as const,
      practice: capture,
    },
    selectionSnapshots,
  }
}

const persistCurrentSortie = () => {
  setCurrentInProgressSortie(currentSortie)
}

const finalizeCurrentSortie = (status: 'completed' | 'failed') => {
  if (!currentSortie) {
    return
  }

  const sortieForHistory =
    status === 'completed'
      ? {
          ...currentSortie,
          updatedAt: Date.now(),
          friendlyFleetLatest: refreshFleetSnapshotFromStore(
            currentSortie.friendlyFleetLatest.length > 0
              ? currentSortie.friendlyFleetLatest
              : currentSortie.friendlyFleetInitial,
          ),
        }
      : currentSortie

  appendWarReportHistoryEntry(buildSortieHistoryEntry(sortieForHistory, status))
  currentSortie = null
  persistCurrentSortie()
}

const failStaleSortieIfPresent = () => {
  const staleSortie = getCurrentInProgressSortie()
  if (!staleSortie) {
    return
  }

  appendWarReportHistoryEntry(buildSortieHistoryEntry(staleSortie, 'failed'))
  setCurrentInProgressSortie(null)
}

const flushPendingFinalize = () => {
  if (finalizeTimer) {
    clearTimeout(finalizeTimer)
    finalizeTimer = null
  }

  if (!pendingFinalize) {
    return
  }

  const { context, resultBody } = pendingFinalize
  pendingFinalize = null

  if (context.kind === 'practice') {
    appendWarReportHistoryEntry(buildPracticeHistoryEntry(buildPracticeCapture(context, resultBody)))
    currentBattle = null
    return
  }

  if (!currentSortie) {
    currentBattle = null
    return
  }

  const battle = buildBattleNodeCapture(context, resultBody)
  currentSortie = {
    ...currentSortie,
    updatedAt: battle.occurredAt,
    operationLabelRaw: battle.operationLabelRaw,
    operationPhraseRaw: battle.operationPhraseRaw,
    friendlyFleetLatest: battle.friendlyFleet,
    battles: [...currentSortie.battles, battle],
  }
  persistCurrentSortie()
  currentBattle = null
}

const scheduleFinalize = (context: CurrentBattleContext, resultBody: ResultBody) => {
  pendingFinalize = { context, resultBody }
  if (finalizeTimer) {
    clearTimeout(finalizeTimer)
  }

  finalizeTimer = setTimeout(() => {
    flushPendingFinalize()
  }, 120)
}

const buildNodeLabel = (detail: GameResponseDetail) => {
  const node = Number(detail.body.api_no ?? 0)
  return node > 0 ? `Node ${node}` : null
}

const createSortieSession = (detail: GameResponseDetail, deckId: number): SortieSessionCapture => {
  const map: [number, number, number] = [
    Number(detail.body.api_maparea_id ?? 0),
    Number(detail.body.api_mapinfo_no ?? 0),
    Number(detail.body.api_no ?? 0),
  ]
  const timestamp = detail.time ?? Date.now()
  const nodeLabel = buildNodeLabel(detail)

  return {
    id: `${timestamp}:${deckId}:${map[0]}-${map[1]}`,
    deckId,
    startedAt: timestamp,
    updatedAt: timestamp,
    mapLabel: buildMapLabel(map),
    operationLabelRaw: buildMapLabel(map) ? `${buildMapLabel(map)} 海域` : '出撃海域',
    operationPhraseRaw: buildMapLabel(map) ? `${buildMapLabel(map)} 海域` : '出撃海域',
    friendlyFleetInitial: captureFleetSnapshotWithFallback(deckId),
    friendlyFleetLatest: captureFleetSnapshotWithFallback(deckId),
    nodeTrail: nodeLabel ? [nodeLabel] : [],
    battles: [],
  }
}

const beginSortieBattleContext = (detail: GameResponseDetail) => {
  const deckId = resolveDeckIdFromSources(detail, {
    sortieDeckId: currentSortie?.deckId ?? null,
    battleDeckId: currentBattle?.deckId ?? null,
    activeFleetId: getActiveFleetIdFromStore(),
  })
  const map: [number, number, number] = [
    Number(detail.body.api_maparea_id ?? 0),
    Number(detail.body.api_mapinfo_no ?? 0),
    Number(detail.body.api_no ?? 0),
  ]
  const timestamp = detail.time ?? Date.now()
  const nodeLabel = buildNodeLabel(detail)

  if (detail.path === '/kcsapi/api_req_map/start') {
    flushPendingFinalize()
    if (currentSortie) {
      finalizeCurrentSortie('failed')
    }
    currentSortie = createSortieSession(detail, deckId)
    persistCurrentSortie()
  } else if (!currentSortie) {
    currentSortie = createSortieSession(detail, deckId)
    persistCurrentSortie()
  } else {
    const nextNodeTrail =
      nodeLabel && currentSortie.nodeTrail[currentSortie.nodeTrail.length - 1] !== nodeLabel
        ? [...currentSortie.nodeTrail, nodeLabel]
        : currentSortie.nodeTrail
    currentSortie = {
      ...currentSortie,
      deckId: currentSortie.deckId ?? deckId,
      updatedAt: timestamp,
      nodeTrail: nextNodeTrail,
    }
    persistCurrentSortie()
  }

  const resolvedDeckId = currentSortie?.deckId ?? deckId
  const fallbackFleet =
    currentSortie?.friendlyFleetLatest.length
      ? currentSortie.friendlyFleetLatest
      : currentSortie?.friendlyFleetInitial ?? []

  currentBattle = {
    occurredAt: timestamp,
    kind: 'sortie',
    mode: Number(detail.body.api_event_id) === 5 ? 'boss' : 'normal',
    deckId: resolvedDeckId,
    map,
    nodeLabel,
    fleetShips: captureFleetSnapshotWithFallback(resolvedDeckId, fallbackFleet),
    practiceOpponent: null,
    enemyShipIds: [],
    sawAirAttack: false,
  }
}

const beginPracticeBattleContext = (detail: GameResponseDetail) => {
  const deckId = resolveDeckIdFromSources(detail, {
    battleDeckId: currentBattle?.deckId ?? null,
    activeFleetId: getActiveFleetIdFromStore(),
  })
  currentBattle = {
    occurredAt: detail.time ?? Date.now(),
    kind: 'practice',
    mode: 'practice',
    deckId,
    map: null,
    nodeLabel: null,
    fleetShips: captureFleetSnapshot(deckId),
    practiceOpponent,
    enemyShipIds: [],
    sawAirAttack: false,
  }
}

const updateCurrentBattleFromPacket = (packet: BattlePacket) => {
  if (!currentBattle) {
    return
  }

  if (packet.api_ship_ke && currentBattle.enemyShipIds.length === 0) {
    currentBattle.enemyShipIds = packet.api_ship_ke
  }

  if (detectAirAttackFromPacket(packet)) {
    currentBattle.sawAirAttack = true
  }
}

const handleGameResponse = (event: Event) => {
  const detail = (event as GameResponseEvent).detail
  if (!detail?.path || !detail.body) {
    return
  }

  if (detail.path === '/kcsapi/api_req_member/get_practice_enemyinfo') {
    const nickname = String(detail.body.api_nickname ?? '')
    const level = String(detail.body.api_level ?? '')
    practiceOpponent = nickname ? `${nickname}${level ? ` (Lv.${level})` : ''}` : null
    return
  }

  if (detail.path === '/kcsapi/api_get_member/basic') {
    updateDetectedAdmiralFromBody(detail.body)
    return
  }

  if (detail.path === '/kcsapi/api_port/port') {
    updateDetectedAdmiralFromBody(
      (detail.body.api_basic as Record<string, unknown> | undefined) ?? detail.body,
    )
    flushPendingFinalize()
    finalizeCurrentSortie('completed')
    return
  }

  if (detail.path === '/kcsapi/api_req_map/start' || detail.path === '/kcsapi/api_req_map/next') {
    beginSortieBattleContext(detail)
    return
  }

  if (detail.path === '/kcsapi/api_req_practice/battle') {
    beginPracticeBattleContext(detail)
    return
  }

  if (!currentBattle) {
    return
  }

  updateCurrentBattleFromPacket(detail.body as BattlePacket)

  if (detail.path.includes('result')) {
    scheduleFinalize(currentBattle, detail.body as ResultBody)
  }
}

export const startBattleListener = () => {
  if (listening || !IN_POI) {
    return
  }

  failStaleSortieIfPresent()
  currentSortie = null
  listening = true
  window.addEventListener('game.response', handleGameResponse as EventListener)
}

export const stopBattleListener = () => {
  if (!listening) {
    return
  }

  flushPendingFinalize()
  listening = false
  currentBattle = null
  practiceOpponent = null
  persistCurrentSortie()
  window.removeEventListener('game.response', handleGameResponse as EventListener)
}

export const getLatestWarReportSnapshot = (): WarReportHistoryEntry | null =>
  getWarReportHistoryView().latestEntry

export const subscribeLatestWarReport = subscribeWarReportHistory

export const useLatestWarReport = () => useWarReportHistory().latestEntry

export const __resolveDeckIdForTests = (
  detail: GameResponseDetail,
  sources: DeckResolutionSources = {},
) => resolveDeckIdFromSources(detail, sources)

export const __detectAirAttackFromPacketForTests = (packet: BattlePacket) =>
  detectAirAttackFromPacket(packet)
