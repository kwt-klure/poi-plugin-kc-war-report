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
  AntiAirSummary,
  AntiSubmarineContribution,
  AntiSubmarineSummary,
  BattleCapture,
  BattleMode,
  BattleNodeCapture,
  CarrierAirLossSummary,
  EnemyFlagshipSunkSummary,
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
  api_ship_ke_combined?: number[]
  api_e_nowhps?: number[]
  api_e_maxhps?: number[]
  api_e_maxhps_combined?: number[]
  api_f_nowhps_combined?: number[]
  api_f_maxhps_combined?: number[]
  api_kouku?: unknown
  api_injection_kouku?: unknown
  api_air_base_attack?: unknown[]
  api_friendly_kouku?: unknown
  api_opening_taisen?: unknown
  api_hougeki1?: unknown
  api_hougeki2?: unknown
  api_hougeki3?: unknown
  api_hougeki?: unknown
  api_n_hougeki1?: unknown
  api_n_hougeki2?: unknown
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
  antiAirSummary: AntiAirSummary | null
  antiSubmarineSummary: AntiSubmarineSummary | null
  carrierAirLossSummary: CarrierAirLossSummary | null
  enemyFlagshipSunkSummary: EnemyFlagshipSunkSummary | null
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

const toNullableIndex = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = toNullableIndex(entry)
      if (resolved != null) {
        return resolved
      }
    }
  }

  return null
}

const toNullableKind = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = toNullableKind(entry)
      if (resolved != null) {
        return resolved
      }
    }
  }

  return null
}

const sumNumericLeaves = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (Array.isArray(value)) {
    return value.reduce((sum, entry) => sum + sumNumericLeaves(entry), 0)
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, entry) => sum + sumNumericLeaves(entry),
      0,
    )
  }

  return 0
}

const extractAirFire = (value: unknown): { idx: number | null; kind: number | null } | null => {
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = extractAirFire(entry)
      if (resolved) {
        return resolved
      }
    }
    return null
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    const idx = toNullableIndex(candidate.api_idx)
    const kind = toNullableKind(candidate.api_kind)
    if (idx != null || kind != null) {
      return { idx, kind }
    }
  }

  return null
}

const getBattleAirPhases = (packet: BattlePacket) => [
  packet.api_kouku,
  packet.api_injection_kouku,
  ...(packet.api_air_base_attack ?? []),
  packet.api_friendly_kouku,
].filter((phase) => phase != null)

const carrierShipTypeIds = new Set([7, 11, 18])

const getShipMasterById = (shipId: number) =>
  getArrayValue(
    getStoreValue<Record<string, PoiShipMaster> | PoiShipMaster[]>(['const', '$ships']) ?? null,
    shipId,
  )

const isCarrierShipMaster = (master: PoiShipMaster | null) =>
  master?.api_stype != null && carrierShipTypeIds.has(master.api_stype)

const submarineShipTypeIds = new Set([13, 14])

const isSubmarineShipMaster = (master: PoiShipMaster | null) =>
  master?.api_stype != null && submarineShipTypeIds.has(master.api_stype)

const sumPositiveNumbers = (values: number[]) =>
  values.reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0)

const extractAntiAirSummaryFromPacket = (
  packet: BattlePacket,
  fleetShips: FleetShipSnapshot[],
): AntiAirSummary | null => {
  let airFireEvent: { idx: number | null; kind: number | null } | null = null
  let enemyPlaneLoss = 0

  for (const phase of getBattleAirPhases(packet)) {
    if (!phase || typeof phase !== 'object') {
      continue
    }

    const stage2 = (phase as Record<string, unknown>).api_stage2
    if (!stage2 || typeof stage2 !== 'object') {
      continue
    }

    const stage2Object = stage2 as Record<string, unknown>
    airFireEvent ??= extractAirFire(stage2Object.api_air_fire)
    enemyPlaneLoss += sumNumericLeaves(stage2Object.api_e_lostcount)
  }

  if (!airFireEvent) {
    return null
  }

  const hasFriendlyCombinedFleet = Array.isArray(packet.api_f_nowhps_combined)
  const triggeringShip =
    !hasFriendlyCombinedFleet && airFireEvent.idx != null && airFireEvent.idx < fleetShips.length
      ? fleetShips[airFireEvent.idx] ?? null
      : null

  return {
    triggered: true,
    shipNameRaw: triggeringShip?.nameJa ?? null,
    ciKind: airFireEvent.kind,
    enemyPlaneLoss: enemyPlaneLoss > 0 ? enemyPlaneLoss : null,
  }
}

const getBattleShellingPhases = (packet: BattlePacket) =>
  [
    packet.api_opening_taisen,
    packet.api_hougeki1,
    packet.api_hougeki2,
    packet.api_hougeki3,
    packet.api_hougeki,
    packet.api_n_hougeki1,
    packet.api_n_hougeki2,
  ].filter((phase) => phase != null)

const toNumberList = (value: unknown): number[] => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value]
  }
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(
    (entry): entry is number => typeof entry === 'number' && Number.isFinite(entry),
  )
}

type AntiSubmarineAccumulator = {
  shipNameRaw: string | null
  damagingHitCount: number
  targetDamage: Map<number, number>
}

const extractAntiSubmarineSummaryFromPacket = (
  packet: BattlePacket,
  fleetShips: FleetShipSnapshot[],
  enemyShipIdsFallback: number[] = [],
): AntiSubmarineSummary | null => {
  const packetEnemyShipIds = [
    ...(packet.api_ship_ke ?? []),
    ...(packet.api_ship_ke_combined ?? []),
  ]
  const enemyShipIds = packetEnemyShipIds.length > 0 ? packetEnemyShipIds : enemyShipIdsFallback
  const enemyMaxHps = [
    ...(packet.api_e_maxhps ?? []),
    ...(packet.api_e_maxhps_combined ?? []),
  ]
  if (enemyShipIds.length === 0) {
    return null
  }

  const contributions = new Map<string, AntiSubmarineAccumulator>()
  const hasFriendlyCombinedFleet = Array.isArray(packet.api_f_nowhps_combined)

  for (const phase of getBattleShellingPhases(packet)) {
    if (!phase || typeof phase !== 'object') {
      continue
    }

    const phaseObject = phase as Record<string, unknown>
    const attackerFlags = phaseObject.api_at_eflag
    const attackerIndices = phaseObject.api_at_list
    const defenderLists = phaseObject.api_df_list
    const damageLists = phaseObject.api_damage
    if (
      !Array.isArray(attackerFlags) ||
      !Array.isArray(attackerIndices) ||
      !Array.isArray(defenderLists) ||
      !Array.isArray(damageLists)
    ) {
      continue
    }

    const attackCount = Math.min(
      attackerFlags.length,
      attackerIndices.length,
      defenderLists.length,
      damageLists.length,
    )
    for (let attackIndex = 0; attackIndex < attackCount; attackIndex += 1) {
      if (attackerFlags[attackIndex] !== 0) {
        continue
      }

      const attackerIndex = attackerIndices[attackIndex]
      if (
        typeof attackerIndex !== 'number' ||
        !Number.isInteger(attackerIndex) ||
        attackerIndex < 0
      ) {
        continue
      }

      const defenderIndices = toNumberList(defenderLists[attackIndex])
      const damages = toNumberList(damageLists[attackIndex])
      if (defenderIndices.length === 0 || defenderIndices.length !== damages.length) {
        continue
      }

      const attacker =
        !hasFriendlyCombinedFleet && attackerIndex < fleetShips.length
          ? fleetShips[attackerIndex] ?? null
          : null
      const shipNameRaw = attacker?.nameJa ?? null
      const key = shipNameRaw ?? '__unattributed__'
      let accumulator = contributions.get(key)
      if (!accumulator) {
        accumulator = {
          shipNameRaw,
          damagingHitCount: 0,
          targetDamage: new Map<number, number>(),
        }
        contributions.set(key, accumulator)
      }

      for (let hitIndex = 0; hitIndex < defenderIndices.length; hitIndex += 1) {
        const defenderIndex = defenderIndices[hitIndex]
        const damage = damages[hitIndex]
        if (
          !Number.isInteger(defenderIndex) ||
          defenderIndex < 0 ||
          damage == null ||
          damage <= 0
        ) {
          continue
        }

        const enemyShipId = enemyShipIds[defenderIndex]
        if (
          typeof enemyShipId !== 'number' ||
          !isSubmarineShipMaster(getShipMasterById(enemyShipId))
        ) {
          continue
        }

        accumulator.damagingHitCount += 1
        accumulator.targetDamage.set(
          defenderIndex,
          (accumulator.targetDamage.get(defenderIndex) ?? 0) + damage,
        )
      }
    }
  }

  const resolved: AntiSubmarineContribution[] = Array.from(contributions.values())
    .filter((contribution) => contribution.damagingHitCount > 0)
    .map((contribution) => ({
      shipNameRaw: contribution.shipNameRaw,
      damagingHitCount: contribution.damagingHitCount,
      targetCount: contribution.targetDamage.size,
      assessedDamage: Array.from(contribution.targetDamage.entries()).reduce(
        (sum, [targetIndex, damage]) => {
          const maxHp = enemyMaxHps[targetIndex]
          return sum + Math.min(damage, typeof maxHp === 'number' && maxHp > 0 ? maxHp : damage)
        },
        0,
      ),
    }))
    .sort(
      (left, right) =>
        right.damagingHitCount - left.damagingHitCount ||
        right.targetCount - left.targetCount ||
        right.assessedDamage - left.assessedDamage,
    )

  return resolved.length > 0
    ? {
        triggered: true,
        contributions: resolved,
      }
    : null
}

const extractCarrierAirLossSummaryFromPacket = (
  packet: BattlePacket,
): CarrierAirLossSummary | null => {
  const enemyShipIds = packet.api_ship_ke
  const enemyNowHps = packet.api_e_nowhps
  const enemyMaxHps = packet.api_e_maxhps

  if (
    !enemyShipIds ||
    !enemyNowHps ||
    !enemyMaxHps ||
    enemyShipIds.length === 0 ||
    enemyShipIds.length !== enemyNowHps.length ||
    enemyShipIds.length !== enemyMaxHps.length
  ) {
    return null
  }

  let carrierLossCount = 0
  let carrierAircraftLossEstimate = 0

  for (let index = 0; index < enemyShipIds.length; index += 1) {
    const enemyShipId = enemyShipIds[index]
    const endHp = enemyNowHps[index]
    const maxHp = enemyMaxHps[index]
    if (
      typeof enemyShipId !== 'number' ||
      enemyShipId <= 0 ||
      typeof endHp !== 'number' ||
      typeof maxHp !== 'number' ||
      maxHp <= 0
    ) {
      continue
    }

    const master = getShipMasterById(enemyShipId)
    if (!isCarrierShipMaster(master)) {
      continue
    }

    if (endHp / maxHp > 0.25) {
      continue
    }

    const maxeq = master?.api_maxeq
    if (!Array.isArray(maxeq) || maxeq.length === 0) {
      return null
    }

    carrierLossCount += 1
    carrierAircraftLossEstimate += sumPositiveNumbers(maxeq)
  }

  if (carrierLossCount === 0 || carrierAircraftLossEstimate <= 0) {
    return null
  }

  return {
    triggered: true,
    carrierLossCount,
    carrierAircraftLossEstimate,
  }
}

const extractEnemyFlagshipSunkSummaryFromPacket = (
  packet: BattlePacket,
): EnemyFlagshipSunkSummary | null => {
  const enemyShipIds = packet.api_ship_ke
  const enemyNowHps = packet.api_e_nowhps
  const enemyMaxHps = packet.api_e_maxhps

  if (
    !enemyShipIds ||
    !enemyNowHps ||
    !enemyMaxHps ||
    enemyShipIds.length === 0 ||
    enemyShipIds.length !== enemyNowHps.length ||
    enemyShipIds.length !== enemyMaxHps.length
  ) {
    return null
  }

  const enemyShipId = enemyShipIds[0]
  const endHp = enemyNowHps[0]
  const maxHp = enemyMaxHps[0]

  if (
    typeof enemyShipId !== 'number' ||
    enemyShipId <= 0 ||
    typeof endHp !== 'number' ||
    typeof maxHp !== 'number' ||
    maxHp <= 0 ||
    endHp > 0
  ) {
    return null
  }

  return {
    triggered: true,
    enemyShipId,
    enemyNameRaw: getShipMasterById(enemyShipId)?.api_name ?? null,
  }
}

const mergeAntiAirSummary = (
  current: AntiAirSummary | null,
  next: AntiAirSummary | null,
): AntiAirSummary | null => {
  if (!current) {
    return next
  }

  if (!next) {
    return current
  }

  const mergedLoss =
    current.enemyPlaneLoss == null && next.enemyPlaneLoss == null
      ? null
      : (current.enemyPlaneLoss ?? 0) + (next.enemyPlaneLoss ?? 0)

  return {
    triggered: current.triggered || next.triggered,
    shipNameRaw: current.shipNameRaw ?? next.shipNameRaw,
    ciKind: current.ciKind ?? next.ciKind,
    enemyPlaneLoss: mergedLoss != null && mergedLoss > 0 ? mergedLoss : null,
  }
}

const mergeAntiSubmarineSummary = (
  current: AntiSubmarineSummary | null,
  next: AntiSubmarineSummary | null,
): AntiSubmarineSummary | null => {
  if (!current) {
    return next
  }
  if (!next) {
    return current
  }

  const merged = new Map<string, AntiSubmarineContribution>()
  for (const contribution of [...current.contributions, ...next.contributions]) {
    const key = contribution.shipNameRaw ?? '__unattributed__'
    const existing = merged.get(key)
    merged.set(
      key,
      existing
        ? {
            shipNameRaw: existing.shipNameRaw ?? contribution.shipNameRaw,
            damagingHitCount: existing.damagingHitCount + contribution.damagingHitCount,
            // Separate packets may describe the same target; retain the safer observed maximum.
            targetCount: Math.max(existing.targetCount, contribution.targetCount),
            assessedDamage: existing.assessedDamage + contribution.assessedDamage,
          }
        : { ...contribution },
    )
  }

  return {
    triggered: true,
    contributions: Array.from(merged.values()).sort(
      (left, right) =>
        right.damagingHitCount - left.damagingHitCount ||
        right.targetCount - left.targetCount ||
        right.assessedDamage - left.assessedDamage,
    ),
  }
}

const mergeCarrierAirLossSummary = (
  current: CarrierAirLossSummary | null,
  next: CarrierAirLossSummary | null,
): CarrierAirLossSummary | null => {
  if (!current) {
    return next
  }

  if (!next) {
    return current
  }

  return {
    triggered: current.triggered || next.triggered,
    carrierLossCount: current.carrierLossCount + next.carrierLossCount,
    carrierAircraftLossEstimate:
      (current.carrierAircraftLossEstimate ?? 0) + (next.carrierAircraftLossEstimate ?? 0),
  }
}

const mergeEnemyFlagshipSunkSummary = (
  current: EnemyFlagshipSunkSummary | null,
  next: EnemyFlagshipSunkSummary | null,
) => current ?? next

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
    antiAirSummary: context.antiAirSummary ? { ...context.antiAirSummary } : null,
    antiSubmarineSummary: context.antiSubmarineSummary
      ? {
          ...context.antiSubmarineSummary,
          contributions: context.antiSubmarineSummary.contributions.map((entry) => ({ ...entry })),
        }
      : null,
    carrierAirLossSummary: context.carrierAirLossSummary
      ? { ...context.carrierAirLossSummary }
      : null,
    enemyFlagshipSunkSummary: context.enemyFlagshipSunkSummary
      ? { ...context.enemyFlagshipSunkSummary }
      : null,
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
    antiAirSummary: null,
    antiSubmarineSummary: null,
    carrierAirLossSummary: null,
    enemyFlagshipSunkSummary: null,
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
    antiAirSummary: null,
    antiSubmarineSummary: null,
    carrierAirLossSummary: null,
    enemyFlagshipSunkSummary: null,
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

  currentBattle.antiAirSummary = mergeAntiAirSummary(
    currentBattle.antiAirSummary,
    extractAntiAirSummaryFromPacket(packet, currentBattle.fleetShips),
  )
  currentBattle.antiSubmarineSummary = mergeAntiSubmarineSummary(
    currentBattle.antiSubmarineSummary,
    extractAntiSubmarineSummaryFromPacket(
      packet,
      currentBattle.fleetShips,
      currentBattle.enemyShipIds,
    ),
  )
  currentBattle.carrierAirLossSummary = mergeCarrierAirLossSummary(
    currentBattle.carrierAirLossSummary,
    extractCarrierAirLossSummaryFromPacket(packet),
  )
  currentBattle.enemyFlagshipSunkSummary = mergeEnemyFlagshipSunkSummary(
    currentBattle.enemyFlagshipSunkSummary,
    extractEnemyFlagshipSunkSummaryFromPacket(packet),
  )
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

export const __extractAntiAirSummaryFromPacketForTests = (
  packet: BattlePacket,
  fleetShips: FleetShipSnapshot[],
) => extractAntiAirSummaryFromPacket(packet, fleetShips)

export const __extractAntiSubmarineSummaryFromPacketForTests = (
  packet: BattlePacket,
  fleetShips: FleetShipSnapshot[],
) => extractAntiSubmarineSummaryFromPacket(packet, fleetShips)

export const __extractCarrierAirLossSummaryFromPacketForTests = (
  packet: BattlePacket,
) => extractCarrierAirLossSummaryFromPacket(packet)

export const __extractEnemyFlagshipSunkSummaryFromPacketForTests = (
  packet: BattlePacket,
) => extractEnemyFlagshipSunkSummaryFromPacket(packet)
