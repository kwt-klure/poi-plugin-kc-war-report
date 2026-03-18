export type BattleKind = 'sortie' | 'practice'

export type BattleMode = 'normal' | 'boss' | 'practice'

export type EntryStatus = 'completed' | 'failed'

export type FailureMode = 'failed_with_retreat' | 'failed_with_heavy_losses' | null

export type DamageSeverity = 'none' | 'light' | 'moderate' | 'heavy' | 'unknown'

export type EnemyCategory =
  | 'submarine_force'
  | 'patrol_force'
  | 'main_force'
  | 'air_power'
  | 'transport_group'
  | 'land_force'
  | 'generic_force'

export type EngagementCategory =
  | 'air_engagement'
  | 'submarine_engagement'
  | 'surface_engagement'
  | 'transport_intercept'
  | 'land_assault'
  | 'practice_engagement'

export type ResultCategory =
  | 'decisive_success'
  | 'success'
  | 'partial_success'
  | 'contested'
  | 'unknown'

export type EnemyDisplayPolicy = 'fixed_enemy_category'

export type EntityRenderPolicy = 'direct_name_alias'

export type WarReportStyle =
  | 'standard_bulletin'
  | 'formal_after_action'
  | 'short_bulletin'

export type AdmiralIdentity = {
  name: string | null
  rankValue: number | null
  rankLabel: string | null
}

export type AddressSnapshot = {
  senderLine: string
  recipientLine: string
  usesDetectedAdmiralSender: boolean
  detectedAdmiral: AdmiralIdentity | null
}

export type FleetShipSnapshot = {
  instanceId: number
  shipId: number
  nameJa: string
  typeId: number | null
  typeNameJa: string | null
  level: number
  startHp: number
  endHp: number | null
  maxHp: number
}

export type DamageSummary = {
  severity: DamageSeverity
  label: string
  detail: string
  damagedShipCount: number
  heavyDamageCount: number
  moderateDamageCount: number
}

export type FriendlyHighlightFlags = {
  antiAirScreen: boolean
  mvpHighlighted: boolean
}

export type BattleNodeCapture = {
  occurredAt: number
  mode: BattleMode
  nodeLabel: string | null
  operationLabelRaw: string
  operationPhraseRaw: string
  friendlyFleet: FleetShipSnapshot[]
  enemyDeckNameRaw: string | null
  enemyShipNamesRaw: string[]
  winRank: string | null
  damageSummary: DamageSummary
  sawAirAttack: boolean
  antiAirScreen: boolean
  flagshipNameRaw: string | null
  mvpNameRaw: string | null
}

export type BattleCapture = {
  occurredAt: number
  kind: 'practice'
  mode: 'practice'
  operationLabelRaw: string
  operationPhraseRaw: string
  mapLabel: string | null
  friendlyFleet: FleetShipSnapshot[]
  enemyDeckNameRaw: string | null
  enemyShipNamesRaw: string[]
  winRank: string | null
  damageSummary: DamageSummary
  sawAirAttack: boolean
  antiAirScreen: boolean
  practiceOpponent: string | null
  flagshipNameRaw: string | null
  mvpNameRaw: string | null
}

export type SortieSessionCapture = {
  id: string
  startedAt: number
  updatedAt: number
  mapLabel: string | null
  operationLabelRaw: string
  operationPhraseRaw: string
  friendlyFleetInitial: FleetShipSnapshot[]
  friendlyFleetLatest: FleetShipSnapshot[]
  nodeTrail: string[]
  battles: BattleNodeCapture[]
}

export type WarReportTruthSource =
  | {
      kind: 'sortie'
      sortie: SortieSessionCapture
    }
  | {
      kind: 'practice'
      practice: BattleCapture
    }

export type NormalizedWarReportRecord = {
  occurredAt: number
  kind: BattleKind
  status: EntryStatus
  failureMode: FailureMode
  operationLabel: string
  operationPhrase: string
  mapLabel: string | null
  friendlyFleet: FleetShipSnapshot[]
  friendlySummary: string
  enemyCategory: EnemyCategory
  enemyDisplayPolicy: EnemyDisplayPolicy
  enemyDisplay: string
  enemyForceLabel: string
  headlineEnemyPhrase: string
  engagementCategory: EngagementCategory
  resultCategory: ResultCategory
  damageSummary: DamageSummary
  highlightFlags: FriendlyHighlightFlags
  entityRenderPolicy: EntityRenderPolicy
  flagshipName: string | null
  mvpName: string | null
  practiceOpponent: string | null
  winRank: string | null
  sawAirAttack: boolean
  nodeCount: number
}

export type ReportRenderContext = {
  occurredAt: number
  kind: BattleKind
  status: EntryStatus
  failureMode: FailureMode
  operationLabel: string
  operationPhrase: string
  enemyDisplay: string
  enemyForceLabel: string
  headlineEnemyPhrase: string
  openingEnemyClause: string
  resultPhrase: string
  friendlySummary: string
  flagshipDisplay: string | null
  mvpDisplay: string | null
  damageSeverity: DamageSeverity
  damageLabel: string
  damageDetail: string
  damagedShipCount: number
  heavyDamageCount: number
  moderateDamageCount: number
  damageSentence: string
  compositionSentence: string
  closingEmphasis: string
  practiceOpponent: string | null
  winRank: string | null
  nodeCount: number
}

export type GeneratedWarReport = {
  bulletin: string
  body: string
}

export type WarReportRenderOptions = {
  variantSeed?: number
  addressSnapshot?: AddressSnapshot | null
  truthSource?: WarReportTruthSource | null
  recentReports?: Partial<Record<WarReportStyle, GeneratedWarReport[]>>
}

export type WarReportHistoryEntry = {
  id: string
  capturedAt: number
  entryType: BattleKind
  status: EntryStatus
  record: NormalizedWarReportRecord
  report: GeneratedWarReport
  renderedReports?: Partial<Record<WarReportStyle, GeneratedWarReport>>
  variantSeed?: number
  addressSnapshot?: AddressSnapshot | null
  truthSource?: WarReportTruthSource | null
}

export type WarReportHistoryState = {
  entries: WarReportHistoryEntry[]
  selectedId: string | null
  currentInProgressSortie: SortieSessionCapture | null
}

export type WarReportHistoryView = WarReportHistoryState & {
  latestEntry: WarReportHistoryEntry | null
  selectedEntry: WarReportHistoryEntry | null
}
