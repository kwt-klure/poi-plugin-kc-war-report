import type {
  BattleCapture,
  BattleNodeCapture,
  DamageSeverity,
  EnemyCategory,
  EngagementCategory,
  FleetShipSnapshot,
  NormalizedWarReportRecord,
  ResultCategory,
  SortieSessionCapture,
  EntryStatus,
} from './types'

const kanjiDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const
const friendlyShipNameAliases = [
  ['Samuel B.Roberts', 'サミュエル・B・ロバーツ'],
  ['Commandant Teste', 'コマンダン・テスト'],
  ['Conte di Cavour', 'コンテ・ディ・カブール'],
  ['Vittorio Veneto', 'ヴィットリオ・ヴェネト'],
  ['South Dakota', 'サウスダコタ'],
  ['Massachusetts', 'マサチューセッツ'],
  ['Heywood L.E.', 'ヘイウッド L.E.'],
  ['Graf Zeppelin', 'グラーフ・ツェッペリン'],
  ['Prinz Eugen', 'プリンツ・オイゲン'],
  ['Jean Bart', 'ジャン・バール'],
  ['Saratoga', 'サラトガ'],
  ['Intrepid', 'イントレピッド'],
  ['Hornet', 'ホーネット'],
  ['Ranger', 'レンジャー'],
  ['Langley', 'ラングレー'],
  ['Brooklyn', 'ブルックリン'],
  ['Phoenix', 'フェニックス'],
  ['Houston', 'ヒューストン'],
  ['Helena', 'ヘレナ'],
  ['Atlanta', 'アトランタ'],
  ['Fletcher', 'フレッチャー'],
  ['Johnston', 'ジョンストン'],
  ['Nevada', 'ネバダ'],
  ['Washington', 'ワシントン'],
  ['Colorado', 'コロラド'],
  ['Maryland', 'メリーランド'],
  ['Missouri', 'ミズーリ'],
  ['North Carolina', 'ノースカロライナ'],
  ['Tuscaloosa', 'タスカルーサ'],
  ['Northampton', 'ノーザンプトン'],
  ['Scamp', 'スキャンプ'],
  ['Drum', 'ドラム'],
  ['Richelieu', 'リシュリュー'],
  ['Warspite', 'ウォースパイト'],
  ['Victorious', 'ヴィクトリアス'],
  ['Ark Royal', 'アークロイヤル'],
  ['Rodney', 'ロドニー'],
  ['Nelson', 'ネルソン'],
  ['Sheffield', 'シェフィールド'],
  ['Gloire', 'グロワール'],
  ['Javelin', 'ジャベリン'],
  ['Jervis', 'ジャーヴィス'],
  ['Janus', 'ジェーナス'],
  ['Perth', 'パース'],
  ['Gotland', 'ゴトランド'],
  ['Bismarck', 'ビスマルク'],
  ['Aquila', 'アクィラ'],
  ['Libeccio', 'リベッチオ'],
  ['Maestrale', 'マエストラーレ'],
  ['Grecale', 'グレカーレ'],
  ['Scirocco', 'シロッコ'],
  ['Luigi Torelli', 'ルイージ・トレッリ'],
  ['De Ruyter', 'デ・ロイテル'],
  ['Zara', 'ザラ'],
  ['Pola', 'ポーラ'],
  ['Roma', 'ローマ'],
  ['Italia', 'イタリア'],
  ['Iowa', 'アイオワ'],
  ['Gangut', 'ガングート'],
  ['Kirov', 'キーロフ'],
  ['Tashkent', 'タシュケント'],
  ['Ташкент', 'タシュケント'],
  ['Верный', 'ヴェールヌイ'],
] as const

const friendlyShipRemodelSuffixes = [
  '改二特',
  '改二甲',
  '改二乙',
  '改二丙',
  '改二丁',
  '改二',
  '改',
  '甲',
  '乙',
  '丙',
  '丁',
] as const

const enemyLabelByCategory: Record<EnemyCategory, string> = {
  submarine_force: '敵潜水兵力',
  patrol_force: '敵前衛部隊',
  main_force: '敵主力艦隊',
  air_power: '敵航空兵力',
  transport_group: '敵輸送船団',
  land_force: '敵陸上兵力',
  generic_force: '敵兵力',
}

const enemyHeadlineByCategory: Record<EnemyCategory, string> = {
  submarine_force: '敵潜水兵力ヲ制圧シ',
  patrol_force: '敵前衛部隊ヲ撃退シ',
  main_force: '敵主力艦隊ヲ撃退シ',
  air_power: '敵航空兵力ヲ撃退シ',
  transport_group: '敵輸送船団ヲ撃退シ',
  land_force: '敵陸上兵力ヲ制圧シ',
  generic_force: '敵兵力ヲ撃退シ',
}

const enemyCategoryPriority: EnemyCategory[] = [
  'land_force',
  'transport_group',
  'submarine_force',
  'air_power',
  'main_force',
  'patrol_force',
  'generic_force',
]

const hasMapCodePattern = (value: string) => /^\d-\d/.test(value)

const inferEnemyShipCategory = (name: string) => {
  if (name.includes('潜水')) {
    return 'submarine'
  }
  if (name.includes('輸送') || name.includes('ワ級')) {
    return 'transport'
  }
  if (name.includes('飛行場') || name.includes('集積地') || name.includes('砲台')) {
    return 'land'
  }
  if (name.includes('正規空母') || name.includes('装甲空母') || name.includes('軽空母')) {
    return 'air'
  }
  if (
    name.includes('戦艦') ||
    name.includes('重巡') ||
    name.includes('航巡') ||
    name.includes('軽巡') ||
    name.includes('雷巡') ||
    name.includes('駆逐')
  ) {
    return 'surface'
  }
  return 'generic'
}

export const toSimpleKanji = (value: number) => {
  if (value <= 10) {
    if (value === 10) {
      return '十'
    }
    return kanjiDigits[value] ?? String(value)
  }

  if (value < 20) {
    return `十${kanjiDigits[value - 10]}`
  }

  return String(value)
}

export const formatShipCount = (value: number) =>
  value === 1 ? '一隻' : `${toSimpleKanji(value)}隻`

export const normalizeFriendlyReportName = (name: string) => {
  let normalized = name
  for (const [source, target] of friendlyShipNameAliases) {
    if (normalized.includes(source)) {
      normalized = normalized.split(source).join(target)
    }
  }
  for (const suffix of friendlyShipRemodelSuffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length)
      break
    }
  }
  return normalized
}

export const buildFleetCompositionText = (ships: FleetShipSnapshot[]) => {
  if (ships.length === 0) {
    return '艦隊編成情報不詳'
  }

  const counts = new Map<string, number>()
  for (const ship of ships) {
    const label = ship.typeNameJa ?? normalizeFriendlyReportName(ship.nameJa)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${label}${formatShipCount(count)}`)
    .join('、')
}

const getDamageStateLabel = (ship: FleetShipSnapshot) => {
  if (ship.endHp == null) {
    return null
  }
  const ratio = ship.endHp / ship.maxHp
  if (ratio <= 0.25) {
    return '大破'
  }
  if (ratio <= 0.5) {
    return '中破'
  }
  if (ratio < 1) {
    return '小破'
  }
  return null
}

export const buildDamageAssessment = (
  ships: FleetShipSnapshot[],
): {
  severity: DamageSeverity
  label: string
  detail: string
  damagedShipCount: number
  heavyDamageCount: number
  moderateDamageCount: number
} => {
  if (ships.length === 0 || ships.every((ship) => ship.endHp == null)) {
    return {
      severity: 'unknown',
      label: '損害詳報未着',
      detail: '我方損害の細部は目下整理中。',
      damagedShipCount: 0,
      heavyDamageCount: 0,
      moderateDamageCount: 0,
    }
  }

  const damagedShips = ships
    .map((ship) => ({
      ship,
      loss: ship.endHp == null ? 0 : Math.max(0, ship.startHp - ship.endHp),
      state: getDamageStateLabel(ship),
    }))
    .filter((entry) => entry.loss > 0)

  if (damagedShips.length === 0) {
    return {
      severity: 'none',
      label: '我方損害ナシ',
      detail: '我方各艦に損害なし。',
      damagedShipCount: 0,
      heavyDamageCount: 0,
      moderateDamageCount: 0,
    }
  }

  const heavyDamageCount = damagedShips.filter((entry) => entry.state === '大破').length
  const moderateDamageCount = damagedShips.filter((entry) => entry.state === '中破').length
  const hasHeavy = heavyDamageCount > 0
  const hasModerate = moderateDamageCount > 0
  const severity: DamageSeverity = hasHeavy ? 'heavy' : hasModerate ? 'moderate' : 'light'
  const label =
    severity === 'heavy'
      ? heavyDamageCount >= 2
        ? '我方損害大'
        : '我方相応ノ損害'
      : severity === 'moderate'
        ? '我方一部損傷'
        : '我方軽微ノ損害'

  const detail = damagedShips
    .slice(0, 4)
    .map(
      ({ ship, state }) => `${normalizeFriendlyReportName(ship.nameJa)}${state ? `(${state})` : ''}`,
    )
    .join('、')

  return {
    severity,
    label,
    detail: `損傷艦: ${detail}${damagedShips.length > 4 ? ' 他' : ''}`,
    damagedShipCount: damagedShips.length,
    heavyDamageCount,
    moderateDamageCount,
  }
}

const buildReturnStateDamageAssessment = (
  ships: FleetShipSnapshot[],
): {
  severity: DamageSeverity
  label: string
  detail: string
  damagedShipCount: number
  heavyDamageCount: number
  moderateDamageCount: number
} => {
  if (ships.length === 0 || ships.every((ship) => ship.endHp == null)) {
    return {
      severity: 'unknown',
      label: '損害詳報未着',
      detail: '我方損害の細部は目下整理中。',
      damagedShipCount: 0,
      heavyDamageCount: 0,
      moderateDamageCount: 0,
    }
  }

  const damagedShips = ships
    .map((ship) => ({
      ship,
      state: getDamageStateLabel(ship),
    }))
    .filter((entry) => entry.state != null)

  if (damagedShips.length === 0) {
    return {
      severity: 'none',
      label: '我方損害ナシ',
      detail: '我方各艦に損害なし。',
      damagedShipCount: 0,
      heavyDamageCount: 0,
      moderateDamageCount: 0,
    }
  }

  const heavyDamageCount = damagedShips.filter((entry) => entry.state === '大破').length
  const moderateDamageCount = damagedShips.filter((entry) => entry.state === '中破').length
  const severity: DamageSeverity =
    heavyDamageCount > 0 ? 'heavy' : moderateDamageCount > 0 ? 'moderate' : 'light'

  const label =
    severity === 'heavy'
      ? heavyDamageCount >= 2
        ? '我方損害大'
        : '我方相応ノ損害'
      : severity === 'moderate'
        ? '我方一部損傷'
        : '我方軽微ノ損害'

  const detail = damagedShips
    .slice(0, 4)
    .map(
      ({ ship, state }) => `${normalizeFriendlyReportName(ship.nameJa)}${state ? `(${state})` : ''}`,
    )
    .join('、')

  return {
    severity,
    label,
    detail: `損傷艦: ${detail}${damagedShips.length > 4 ? ' 他' : ''}`,
    damagedShipCount: damagedShips.length,
    heavyDamageCount,
    moderateDamageCount,
  }
}

const normalizeOperationLabel = (
  kind: 'sortie' | 'practice',
  operationLabelRaw: string,
  fallbackMapLabel: string | null,
) => {
  if (kind === 'practice') {
    return operationLabelRaw || '対抗演習'
  }

  if (!operationLabelRaw || hasMapCodePattern(operationLabelRaw)) {
    return fallbackMapLabel ?? '所定海域'
  }

  if (['主目標方面', '作戦海域', '出撃海域'].includes(operationLabelRaw)) {
    return fallbackMapLabel ?? '所定海域'
  }

  return operationLabelRaw
}

const normalizeOperationPhrase = (
  kind: 'sortie' | 'practice',
  operationPhraseRaw: string,
  operationLabel: string,
) => {
  if (kind === 'practice') {
    return '対抗演習'
  }

  if (
    !operationPhraseRaw ||
    ['主目標方面', '作戦海域', '出撃海域'].includes(operationPhraseRaw) ||
    hasMapCodePattern(operationPhraseRaw)
  ) {
    return operationLabel
  }

  return operationPhraseRaw
}

const inferEnemyCategoryFromRaw = (
  enemyDeckNameRaw: string | null,
  enemyShipNamesRaw: string[],
  sawAirAttack: boolean,
): EnemyCategory => {
  const deckName = enemyDeckNameRaw ?? ''
  const shipCategories = new Set(enemyShipNamesRaw.map((name) => inferEnemyShipCategory(name)))

  if (deckName.includes('潜水') || shipCategories.has('submarine')) {
    return 'submarine_force'
  }
  if (deckName.includes('輸送') || shipCategories.has('transport')) {
    return 'transport_group'
  }
  if (
    deckName.includes('上陸') ||
    deckName.includes('集積') ||
    deckName.includes('飛行場') ||
    deckName.includes('砲台') ||
    shipCategories.has('land')
  ) {
    return 'land_force'
  }
  if (deckName.includes('前衛') || deckName.includes('哨戒')) {
    return 'patrol_force'
  }
  if (deckName.includes('主力') || deckName.includes('戦隊') || deckName.includes('艦隊')) {
    return 'main_force'
  }
  if (deckName.includes('航空') || shipCategories.has('air')) {
    return 'air_power'
  }
  if (sawAirAttack) {
    return 'air_power'
  }
  if (shipCategories.has('surface')) {
    return 'main_force'
  }

  return 'generic_force'
}

const normalizeEngagementCategory = (
  kind: 'sortie' | 'practice',
  enemyCategory: EnemyCategory,
): EngagementCategory => {
  if (kind === 'practice') {
    return 'practice_engagement'
  }
  if (enemyCategory === 'air_power') {
    return 'air_engagement'
  }
  if (enemyCategory === 'submarine_force') {
    return 'submarine_engagement'
  }
  if (enemyCategory === 'transport_group') {
    return 'transport_intercept'
  }
  if (enemyCategory === 'land_force') {
    return 'land_assault'
  }
  return 'surface_engagement'
}

const normalizeResultCategory = (winRank: string | null, status: EntryStatus): ResultCategory => {
  if (status === 'failed') {
    return 'contested'
  }
  if (winRank === 'S') {
    return 'decisive_success'
  }
  if (winRank === 'A') {
    return 'success'
  }
  if (winRank === 'B') {
    return 'partial_success'
  }
  if (winRank === 'C' || winRank === 'D' || winRank === 'E') {
    return 'contested'
  }
  return 'unknown'
}

const inferAggregateEnemyCategory = (battles: BattleNodeCapture[]) => {
  if (battles.length === 0) {
    return 'generic_force'
  }

  const counts = new Map<EnemyCategory, number>()
  for (const battle of battles) {
    const category = inferEnemyCategoryFromRaw(
      battle.enemyDeckNameRaw,
      battle.enemyShipNamesRaw,
      battle.sawAirAttack,
    )
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  return enemyCategoryPriority.reduce<EnemyCategory>((currentBest, category) => {
    const currentCount = counts.get(currentBest) ?? -1
    const nextCount = counts.get(category) ?? -1
    return nextCount > currentCount ? category : currentBest
  }, 'generic_force')
}

const getLatestNonNull = <T>(values: Array<T | null | undefined>) => {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index]
    if (value != null) {
      return value
    }
  }
  return null
}

export const normalizePracticeCapture = (capture: BattleCapture): NormalizedWarReportRecord => {
  const operationLabel = normalizeOperationLabel('practice', capture.operationLabelRaw, capture.mapLabel)
  const operationPhrase = normalizeOperationPhrase('practice', capture.operationPhraseRaw, operationLabel)
  const enemyCategory = inferEnemyCategoryFromRaw(
    capture.enemyDeckNameRaw,
    capture.enemyShipNamesRaw,
    capture.sawAirAttack,
  )

  return {
    occurredAt: capture.occurredAt,
    kind: 'practice',
    status: 'completed',
    failureMode: null,
    operationLabel,
    operationPhrase,
    mapLabel: capture.mapLabel,
    friendlyFleet: capture.friendlyFleet,
    friendlySummary: buildFleetCompositionText(capture.friendlyFleet),
    enemyCategory,
    enemyDisplayPolicy: 'fixed_enemy_category',
    enemyDisplay: enemyLabelByCategory[enemyCategory],
    enemyForceLabel: enemyLabelByCategory[enemyCategory],
    headlineEnemyPhrase: enemyHeadlineByCategory[enemyCategory],
    engagementCategory: normalizeEngagementCategory('practice', enemyCategory),
    resultCategory: normalizeResultCategory(capture.winRank, 'completed'),
    damageSummary: capture.damageSummary,
    highlightFlags: {
      antiAirScreen: capture.antiAirScreen,
      mvpHighlighted: capture.mvpNameRaw != null,
    },
    entityRenderPolicy: 'direct_name_alias',
    flagshipName: capture.flagshipNameRaw
      ? normalizeFriendlyReportName(capture.flagshipNameRaw)
      : null,
    mvpName: capture.mvpNameRaw ? normalizeFriendlyReportName(capture.mvpNameRaw) : null,
    practiceOpponent: capture.practiceOpponent,
    winRank: capture.winRank,
    sawAirAttack: capture.sawAirAttack,
    nodeCount: 1,
  }
}

export const normalizeSortieSession = (
  session: SortieSessionCapture,
  status: EntryStatus,
): NormalizedWarReportRecord => {
  const lastBattle = session.battles[session.battles.length - 1] ?? null
  const operationLabel = normalizeOperationLabel(
    'sortie',
    lastBattle?.operationLabelRaw ?? session.operationLabelRaw,
    session.mapLabel,
  )
  const operationPhrase = normalizeOperationPhrase(
    'sortie',
    lastBattle?.operationPhraseRaw ?? session.operationPhraseRaw,
    operationLabel,
  )
  const enemyCategory = inferAggregateEnemyCategory(session.battles)
  const finalDamageSummary =
    session.friendlyFleetLatest.length > 0
      ? buildReturnStateDamageAssessment(session.friendlyFleetLatest)
      : lastBattle?.damageSummary ?? {
          severity: 'unknown',
          label: '損害詳報未着',
          detail: '我方損害の細部は目下整理中。',
          damagedShipCount: 0,
          heavyDamageCount: 0,
          moderateDamageCount: 0,
        }
  const sawAirAttack = session.battles.some((battle) => battle.sawAirAttack)
  const flagshipNameRaw =
    session.friendlyFleetInitial[0]?.nameJa ??
    getLatestNonNull(session.battles.map((battle) => battle.flagshipNameRaw))
  const mvpNameRaw = getLatestNonNull(session.battles.map((battle) => battle.mvpNameRaw))
  const winRank = status === 'failed' ? null : lastBattle?.winRank ?? null

  return {
    occurredAt: session.startedAt,
    kind: 'sortie',
    status,
    failureMode:
      status !== 'failed'
        ? null
        : finalDamageSummary.heavyDamageCount >= 2
          ? 'failed_with_heavy_losses'
          : 'failed_with_retreat',
    operationLabel,
    operationPhrase,
    mapLabel: session.mapLabel,
    friendlyFleet: session.friendlyFleetLatest.length > 0 ? session.friendlyFleetLatest : session.friendlyFleetInitial,
    friendlySummary: buildFleetCompositionText(
      session.friendlyFleetInitial.length > 0 ? session.friendlyFleetInitial : session.friendlyFleetLatest,
    ),
    enemyCategory,
    enemyDisplayPolicy: 'fixed_enemy_category',
    enemyDisplay: enemyLabelByCategory[enemyCategory],
    enemyForceLabel: enemyLabelByCategory[enemyCategory],
    headlineEnemyPhrase: enemyHeadlineByCategory[enemyCategory],
    engagementCategory: normalizeEngagementCategory('sortie', enemyCategory),
    resultCategory: normalizeResultCategory(winRank, status),
    damageSummary: finalDamageSummary,
    highlightFlags: {
      antiAirScreen: session.battles.some((battle) => battle.antiAirScreen),
      mvpHighlighted: mvpNameRaw != null,
    },
    entityRenderPolicy: 'direct_name_alias',
    flagshipName: flagshipNameRaw ? normalizeFriendlyReportName(flagshipNameRaw) : null,
    mvpName: mvpNameRaw ? normalizeFriendlyReportName(mvpNameRaw) : null,
    practiceOpponent: null,
    winRank,
    sawAirAttack,
    nodeCount: session.battles.length,
  }
}
