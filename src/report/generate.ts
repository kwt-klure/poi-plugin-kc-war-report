import {
  getDamageStateLabel,
  normalizeFriendlyReportName,
  toSimpleKanji,
} from '../battle/model'
import type {
  AddressSnapshot,
  BattleCapture,
  BattleNodeCapture,
  GeneratedWarReport,
  MainNarrative,
  NarrativeTags,
  ReportRenderContext,
  WarReportRenderOptions,
  WarReportSelectionSnapshot,
  WarReportStyle,
  WarReportTruthSource,
} from '../battle/types'

type TextFamily = {
  id: string
  variants: string[]
}

type FormalEngagementFamily = {
  id: string
  airVariants: string[]
  surfaceVariants: string[]
}

type FormalObservationProfileId = 'surveyed' | 'field_summary' | 'fragmentary'

type FormalDamageCountMode = 'exact' | 'salience' | 'summary'

type FormalNodeDamageMode = 'observed' | 'summary' | 'deferred'

type FormalPlaneCountMode = 'exact' | 'bounded' | 'coarse'

type FormalObservationProfile = {
  id: FormalObservationProfileId
  enemyShipLimit: number
  damageCountMode: FormalDamageCountMode
  damageDetailLimit: number
  nodeDamageMode: FormalNodeDamageMode
  planeCountMode: FormalPlaneCountMode
  pluralDamageLabel: '若干' | '数隻'
}

type PublicOfficialOutcome =
  | 'claimed_victory'
  | 'claimed_operational_success'
  | 'claimed_battlefield_contribution'
  | 'claimed_crushing_blow'

type PublicEnemyFrame =
  | 'air_power'
  | 'submarine_force'
  | 'enemy_main_force'
  | 'enemy_force'

type PublicInitiativeFrame = 'offensive' | 'intercept' | 'assault'

type PublicEnemyDamageClaim =
  | 'enemy_plan_shattered'
  | 'enemy_air_crushed'
  | 'enemy_submarine_hit'
  | 'enemy_main_force_hit'
  | 'major_blow'

type PublicSelfDamageConcealment = 'omit' | 'none' | 'light'

type PublicRhetoricHeat = 'official' | 'maximal'

type PublicBulletinMode = 'paragraph' | 'mixed_dispatch'

type PublicPropagandaProfile = {
  officialOutcome: PublicOfficialOutcome
  enemyFrame: PublicEnemyFrame
  initiativeFrame: PublicInitiativeFrame
  enemyDamageClaim: PublicEnemyDamageClaim
  selfDamageConcealment: PublicSelfDamageConcealment
  rhetoricHeat: PublicRhetoricHeat
  bulletinMode: PublicBulletinMode
}

type PublicClaimFocus =
  | 'enemy_flagship_sunk'
  | 'carrier_air_loss'
  | 'anti_submarine'
  | 'transport'
  | 'submarine_force'
  | 'anti_air_numeric'
  | 'air_power'
  | 'main_force'
  | 'generic'

type PublicAntiAirEvidence = {
  triggered: boolean
  shipName: string | null
  truthLoss: number | null
}

type PublicAntiSubmarineEvidence = {
  triggered: boolean
  shipName: string | null
  damagingHitCount: number
  targetCount: number
  assessedDamage: number
}

type PublicCarrierAirLossEvidence = {
  triggered: boolean
  carrierLossCount: number
  truthLoss: number
}

type PublicEnemyFlagshipSunkEvidence = {
  triggered: boolean
  enemyNameRaw: string | null
}

type PublicClaimEvidence = {
  antiAir: PublicAntiAirEvidence | null
  antiSubmarine: PublicAntiSubmarineEvidence | null
  carrierAirLoss: PublicCarrierAirLossEvidence | null
  enemyFlagshipSunk: PublicEnemyFlagshipSunkEvidence | null
}

type StandardConcreteClaimKind =
  | 'enemy_flagship_sunk'
  | 'carrier_air_loss'
  | 'anti_air'
  | 'anti_submarine'

type StandardClaimItem = {
  kind: StandardConcreteClaimKind
  sentence: string
}

type StandardClaimBoard = {
  focus: PublicClaimFocus
  evidence: PublicClaimEvidence
  antiAirCount: string | null
  carrierAirCount: string | null
  items: StandardClaimItem[]
}

type DistinguishedCredit = {
  shipName: string
  basis:
    | 'combined_specialist'
    | 'anti_air_high'
    | 'anti_submarine_high'
    | 'mvp'
    | 'anti_air'
    | 'anti_submarine'
}

const toJapaneseDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (year >= 2019) {
    return `令和${toSimpleKanji(year - 2018)}年${toSimpleKanji(month)}月${toSimpleKanji(day)}日`
  }

  return `${year}年${month}月${day}日`
}

const toJapaneseTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
}

const kansujiDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

const toFormalKansuji = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '零'
  }

  const units: Array<[number, string]> = [
    [1000, '千'],
    [100, '百'],
    [10, '十'],
  ]
  let remaining = Math.floor(value)
  let result = ''

  for (const [unitValue, unitLabel] of units) {
    const quotient = Math.floor(remaining / unitValue)
    if (quotient <= 0) {
      continue
    }

    result += quotient === 1 ? unitLabel : `${kansujiDigits[quotient]}${unitLabel}`
    remaining %= unitValue
  }

  if (remaining > 0) {
    result += kansujiDigits[remaining] ?? String(remaining)
  }

  return result || '零'
}

const roundUp10 = (value: number) => Math.ceil(value / 10) * 10

const formatStandardPublicPlaneCount = (value: number, seed: number, slot: string) => {
  const estimate = Math.max(10, roundUp10(value))
  const form = mixSeed(seed, `standard_bulletin:publicCount:${slot}`) % 4

  if (form === 0) {
    return `${toFormalKansuji(estimate)}余機`
  }

  if (form === 1) {
    return `約${toFormalKansuji(estimate)}機`
  }

  if (form === 2) {
    const spread = estimate < 200 ? 20 : estimate < 500 ? 50 : 100
    return `${toFormalKansuji(Math.max(10, estimate - spread))}乃至${toFormalKansuji(
      estimate + spread,
    )}機`
  }

  const uncertain = Math.min(estimate - 10, Math.max(10, roundUp10(estimate * 0.2)))
  return `${toFormalKansuji(estimate)}機（内不確実${toFormalKansuji(uncertain)}機）`
}

const isFailedRetreat = (context: ReportRenderContext) =>
  context.failureMode === 'failed_with_retreat'

const isHeavyLossFailure = (context: ReportRenderContext) =>
  context.failureMode === 'failed_with_heavy_losses'

const isAnyFailedSortie = (context: ReportRenderContext) => context.failureMode != null

const hasNonTrivialDamage = (context: ReportRenderContext) =>
  context.damageSeverity !== 'none' && context.damageSeverity !== 'unknown'

const buildEncounterObject = (context: ReportRenderContext) =>
  context.enemyDisplay === '敵航空兵力' ? '敵航空兵力ヲ擁スル敵部隊' : context.enemyDisplay

const buildPublicPropagandaProfile = (
  context: ReportRenderContext,
  style: WarReportStyle,
  _fingerprint: number,
): PublicPropagandaProfile => {
  const rhetoricHeat: PublicRhetoricHeat = style === 'short_bulletin' ? 'maximal' : 'official'
  const enemyFrame: PublicEnemyFrame =
    context.enemyCategory === 'air_power'
      ? 'air_power'
      : context.enemyCategory === 'submarine_force'
        ? 'submarine_force'
        : context.enemyCategory === 'main_force'
          ? 'enemy_main_force'
          : 'enemy_force'
  const initiativeFrame: PublicInitiativeFrame =
    enemyFrame === 'air_power' || enemyFrame === 'submarine_force'
      ? 'intercept'
      : rhetoricHeat === 'maximal'
        ? 'assault'
        : 'offensive'
  const enemyDamageClaim: PublicEnemyDamageClaim =
    enemyFrame === 'air_power'
      ? 'enemy_air_crushed'
      : enemyFrame === 'submarine_force'
        ? 'enemy_submarine_hit'
        : enemyFrame === 'enemy_main_force'
          ? 'enemy_main_force_hit'
          : context.failureMode != null
            ? 'enemy_plan_shattered'
            : rhetoricHeat === 'maximal'
              ? 'major_blow'
              : 'enemy_plan_shattered'
  const selfDamageConcealment: PublicSelfDamageConcealment =
    style === 'short_bulletin'
      ? 'omit'
      : context.failureMode != null
        ? 'omit'
        : context.damageSeverity === 'none'
          ? 'none'
          : 'light'
  const bulletinMode: PublicBulletinMode =
    style === 'short_bulletin' ? 'mixed_dispatch' : 'paragraph'

  if (context.failureMode === 'failed_with_retreat') {
    return {
      officialOutcome:
        rhetoricHeat === 'maximal' ? 'claimed_crushing_blow' : 'claimed_operational_success',
      enemyFrame,
      initiativeFrame,
      enemyDamageClaim,
      selfDamageConcealment,
      rhetoricHeat,
      bulletinMode,
    }
  }

  if (context.failureMode === 'failed_with_heavy_losses') {
    return {
      officialOutcome:
        rhetoricHeat === 'maximal'
          ? 'claimed_crushing_blow'
          : 'claimed_battlefield_contribution',
      enemyFrame,
      initiativeFrame,
      enemyDamageClaim,
      selfDamageConcealment,
      rhetoricHeat,
      bulletinMode,
    }
  }

  return {
    officialOutcome: rhetoricHeat === 'maximal' ? 'claimed_crushing_blow' : 'claimed_victory',
    enemyFrame,
    initiativeFrame,
    enemyDamageClaim,
    selfDamageConcealment,
    rhetoricHeat,
    bulletinMode,
  }
}

const buildPublicEncounterObject = (profile: PublicPropagandaProfile) => {
  switch (profile.enemyFrame) {
    case 'air_power':
      return '敵航空兵力ヲ擁スル敵部隊'
    case 'submarine_force':
      return '敵潜航兵力ヲ擁スル敵部隊'
    case 'enemy_main_force':
      return '敵主力部隊'
    case 'enemy_force':
    default:
      return '敵部隊'
  }
}

const sanitizeDamageDetail = (detail: string) =>
  detail.replace(/^損傷艦:\s*/, '').trim() || '細目未詳'

const formatExactPlaneCount = (value: number) => `${toFormalKansuji(value)}機`

const formatApproximatePlaneCount = (value: number) => `${toFormalKansuji(value)}余機`

const toCarrierAircraftPropagandaBand = (
  value: number,
  style: 'standard_bulletin' | 'short_bulletin',
) => {
  const estimate = toCarrierAircraftPropagandaEstimate(value, style)
  return estimate == null ? null : `${toFormalKansuji(estimate)}余`
}

const toCarrierAircraftPropagandaEstimate = (
  value: number,
  style: 'standard_bulletin' | 'short_bulletin',
) => {
  if (value < 20) {
    return null
  }

  if (value < 50) {
    return style === 'standard_bulletin' ? 50 : 100
  }

  if (value < 100) {
    return style === 'standard_bulletin' ? 120 : 200
  }

  if (value < 150) {
    return style === 'standard_bulletin' ? 200 : 300
  }

  if (value < 250) {
    return style === 'standard_bulletin' ? 300 : 500
  }

  return style === 'standard_bulletin' ? 500 : 700
}

type SortieAntiAirContribution = {
  shipName: string
  truthLoss: number | null
}

const buildSortieAntiAirContributions = (
  truthSource: WarReportTruthSource | null,
): SortieAntiAirContribution[] => {
  if (truthSource?.kind !== 'sortie') {
    return []
  }

  const summaries = truthSource.sortie.battles
    .map((battle) => battle.antiAirSummary)
    .filter((summary): summary is NonNullable<typeof summary> => summary?.triggered === true)

  if (summaries.length === 0) {
    return []
  }

  const grouped = new Map<string, SortieAntiAirContribution>()
  for (const summary of summaries) {
    if (!summary.shipNameRaw) {
      continue
    }
    const shipName = normalizeFriendlyReportName(summary.shipNameRaw)
    const existing = grouped.get(shipName)
    const hasObservedLoss = existing?.truthLoss != null || summary.enemyPlaneLoss != null
    grouped.set(shipName, {
      shipName,
      truthLoss: hasObservedLoss
        ? (existing?.truthLoss ?? 0) + (summary.enemyPlaneLoss ?? 0)
        : null,
    })
  }

  return Array.from(grouped.values()).sort(
    (left, right) => (right.truthLoss ?? -1) - (left.truthLoss ?? -1),
  )
}

const buildSortieAntiAirAggregate = (truthSource: WarReportTruthSource | null) => {
  if (truthSource?.kind !== 'sortie') {
    return null
  }

  const summaries = truthSource.sortie.battles
    .map((battle) => battle.antiAirSummary)
    .filter((summary): summary is NonNullable<typeof summary> => summary?.triggered === true)
  if (summaries.length === 0) {
    return null
  }

  const contributions = buildSortieAntiAirContributions(truthSource)
  const primary = contributions[0]
  const unattributedLoss = summaries
    .filter((summary) => !summary.shipNameRaw)
    .reduce((sum, summary) => sum + (summary.enemyPlaneLoss ?? 0), 0)
  const totalLoss = summaries.some((summary) => summary.enemyPlaneLoss != null)
    ? summaries.reduce((sum, summary) => sum + (summary.enemyPlaneLoss ?? 0), 0)
    : null

  return {
    triggered: true,
    shipName: primary?.shipName ?? null,
    // A named sentence uses that actor's own observed loss; anonymous summaries retain sortie total.
    truthLoss:
      primary?.truthLoss != null
        ? primary.truthLoss
        : totalLoss != null && totalLoss > 0
          ? totalLoss
          : unattributedLoss > 0
            ? unattributedLoss
            : null,
  }
}

type SortieAntiSubmarineContribution = {
  shipName: string | null
  damagingHitCount: number
  targetCount: number
  assessedDamage: number
}

const buildSortieAntiSubmarineContributions = (
  truthSource: WarReportTruthSource | null,
): SortieAntiSubmarineContribution[] => {
  if (truthSource?.kind !== 'sortie') {
    return []
  }

  const grouped = new Map<string, SortieAntiSubmarineContribution>()
  for (const battle of truthSource.sortie.battles) {
    for (const contribution of battle.antiSubmarineSummary?.contributions ?? []) {
      const shipName = contribution.shipNameRaw
        ? normalizeFriendlyReportName(contribution.shipNameRaw)
        : null
      const key = shipName ?? '__unattributed__'
      const existing = grouped.get(key)
      grouped.set(key, {
        shipName,
        damagingHitCount:
          (existing?.damagingHitCount ?? 0) + contribution.damagingHitCount,
        targetCount: (existing?.targetCount ?? 0) + contribution.targetCount,
        assessedDamage: (existing?.assessedDamage ?? 0) + contribution.assessedDamage,
      })
    }
  }

  return Array.from(grouped.values())
    .filter((contribution) => contribution.damagingHitCount > 0)
    .sort(
      (left, right) =>
        right.damagingHitCount - left.damagingHitCount ||
        right.targetCount - left.targetCount ||
        right.assessedDamage - left.assessedDamage,
    )
}

const buildSortieAntiSubmarineAggregate = (truthSource: WarReportTruthSource | null) => {
  const contributions = buildSortieAntiSubmarineContributions(truthSource)
  if (contributions.length === 0) {
    return null
  }

  const primaryNamed = contributions.find((contribution) => contribution.shipName != null)
  const primary = primaryNamed ?? contributions[0]!
  return {
    triggered: true,
    ...primary,
  }
}

const buildSortieCarrierAirLossAggregate = (truthSource: WarReportTruthSource | null) => {
  if (truthSource?.kind !== 'sortie') {
    return null
  }

  const summaries = truthSource.sortie.battles
    .map((battle) => battle.carrierAirLossSummary)
    .filter((summary): summary is NonNullable<typeof summary> => summary?.triggered === true)

  if (summaries.length === 0) {
    return null
  }

  const truthLoss = summaries.reduce(
    (sum, summary) => sum + (summary.carrierAircraftLossEstimate ?? 0),
    0,
  )
  const carrierLossCount = summaries.reduce((sum, summary) => sum + summary.carrierLossCount, 0)

  if (carrierLossCount <= 0 || truthLoss <= 0) {
    return null
  }

  return {
    triggered: true,
    carrierLossCount,
    truthLoss,
  }
}

const buildSortieEnemyFlagshipSunkAggregate = (truthSource: WarReportTruthSource | null) => {
  if (truthSource?.kind !== 'sortie') {
    return null
  }

  const summaries = truthSource.sortie.battles
    .map((battle) => battle.enemyFlagshipSunkSummary)
    .filter((summary): summary is NonNullable<typeof summary> => summary?.triggered === true)

  if (summaries.length === 0) {
    return null
  }

  return {
    triggered: true,
    enemyNameRaw: summaries[0].enemyNameRaw,
  }
}

const buildPublicClaimEvidence = (
  truthSource: WarReportTruthSource | null,
): PublicClaimEvidence => ({
  antiAir: buildSortieAntiAirAggregate(truthSource),
  antiSubmarine: buildSortieAntiSubmarineAggregate(truthSource),
  carrierAirLoss: buildSortieCarrierAirLossAggregate(truthSource),
  enemyFlagshipSunk: buildSortieEnemyFlagshipSunkAggregate(truthSource),
})

const formatEnemyFlagshipTarget = (enemyNameRaw: string | null | undefined) =>
  enemyNameRaw ? `敵旗艦「${enemyNameRaw}」` : '敵旗艦'

const hasFavorablePublicDamage = (context: ReportRenderContext) =>
  context.damageSeverity === 'none' || context.damageSeverity === 'light'

const shouldUseHighGloryShortMode = (
  context: ReportRenderContext,
  evidence: PublicClaimEvidence,
) => {
  if (context.kind !== 'sortie' || isAnyFailedSortie(context) || !hasFavorablePublicDamage(context)) {
    return false
  }

  const hasNumericAirClaim = (evidence.antiAir?.truthLoss ?? 0) >= 20
  const hasAntiSubmarineClaim =
    (evidence.antiSubmarine?.damagingHitCount ?? 0) >= 2 ||
    (evidence.antiSubmarine?.targetCount ?? 0) >= 2
  const hasCarrierAirClaim = Boolean(evidence.carrierAirLoss?.triggered)
  const hasEnemyFlagshipClaim = Boolean(evidence.enemyFlagshipSunk?.triggered)
  const hasStrategicEnemy =
    context.enemyCategory === 'main_force' ||
    context.enemyCategory === 'transport_group' ||
    context.enemyCategory === 'air_power'
  const favorableResult =
    context.resultCategory === 'decisive_success' ||
    (context.resultCategory === 'success' &&
      (hasNumericAirClaim || hasAntiSubmarineClaim || hasCarrierAirClaim || hasEnemyFlagshipClaim))

  return (
    favorableResult &&
    (hasStrategicEnemy ||
      hasNumericAirClaim ||
      hasAntiSubmarineClaim ||
      hasCarrierAirClaim ||
      hasEnemyFlagshipClaim)
  )
}

const selectPublicClaimFocus = (
  context: ReportRenderContext,
  evidence: PublicClaimEvidence,
): PublicClaimFocus => {
  if (evidence.enemyFlagshipSunk?.triggered) {
    return 'enemy_flagship_sunk'
  }

  if (evidence.carrierAirLoss?.triggered) {
    return 'carrier_air_loss'
  }

  if ((evidence.antiAir?.truthLoss ?? 0) >= 20) {
    return 'anti_air_numeric'
  }

  if (
    (evidence.antiSubmarine?.damagingHitCount ?? 0) >= 2 ||
    (evidence.antiSubmarine?.targetCount ?? 0) >= 2
  ) {
    return 'anti_submarine'
  }

  if (context.enemyCategory === 'transport_group') {
    return 'transport'
  }

  if (context.enemyCategory === 'submarine_force') {
    return 'submarine_force'
  }

  if (context.enemyCategory === 'air_power') {
    return 'air_power'
  }

  if (context.enemyCategory === 'main_force') {
    return 'main_force'
  }

  return 'generic'
}

const buildFormalAntiAirSentence = (
  battle: BattleNodeCapture,
  profile: FormalObservationProfile,
  seed: number,
  index: number,
) => {
  const summary = battle.antiAirSummary
  if (!summary?.triggered) {
    return null
  }

  const shipName = summary.shipNameRaw ? normalizeFriendlyReportName(summary.shipNameRaw) : null

  if (shipName && summary.enemyPlaneLoss != null && summary.enemyPlaneLoss > 0) {
    const count = formatFormalObservedPlaneCount(
      summary.enemyPlaneLoss,
      profile,
      seed,
      `antiAir:${parseNodeNumber(battle) ?? index + 1}`,
    )
    return `　防空戦果　「${shipName}」防空射撃ニ当リ、敵機計${count}ヲ撃墜。`
  }

  if (shipName) {
    return `　防空戦果　「${shipName}」防空戦闘ニ当リ、敵航空攻勢ヲ牽制。`
  }

  return '　防空戦果　防空戦闘ニ依リ敵航空兵力ニ損耗ヲ生ゼシム。'
}

const buildFormalAntiSubmarineSentences = (
  battle: BattleNodeCapture,
  profile: FormalObservationProfile,
) => {
  const contributions = battle.antiSubmarineSummary?.contributions ?? []
  if (contributions.length === 0) {
    return []
  }

  if (profile.id === 'fragmentary') {
    return ['　対潜戦果　対潜攻撃実施、戦果細目後報。']
  }

  const visible = contributions.slice(0, profile.id === 'surveyed' ? 2 : 1)
  return visible.map((contribution) => {
    const actor = contribution.shipNameRaw
      ? `「${normalizeFriendlyReportName(contribution.shipNameRaw)}」`
      : '我部隊ノ'
    if (profile.id === 'field_summary') {
      return `　対潜戦果　${actor}対潜攻撃数回、敵潜水艦ニ有効打撃。`
    }

    const hitCount = toFormalKansuji(contribution.damagingHitCount)
    const targetCount = toFormalKansuji(Math.max(1, contribution.targetCount))
    return `　対潜戦果　${actor}対潜攻撃${hitCount}回、敵潜水艦${targetCount}隻ニ有効打撃。`
  })
}

const buildFormalCarrierAirLossSentence = (
  truthSource: WarReportTruthSource | null,
  seed: number,
  profile: FormalObservationProfile,
) => {
  const aggregate = buildSortieCarrierAirLossAggregate(truthSource)
  if (!aggregate?.triggered) {
    return null
  }

  const count = formatFormalObservedPlaneCount(
    aggregate.truthLoss,
    profile,
    seed,
    'carrierAirLoss',
  )

  return pickVariant(seed, 'formal_after_action:carrierAirLoss', [
    `　敵空母損失ニ伴ヒ、搭載敵機計${count}喪失ト認ム。`,
    `　敵空母被害ニ伴ヒ、敵航空兵力亦大損耗ヲ生ジ、搭載敵機計${count}喪失ト認ム。`,
  ])
}

const buildFormalEnemyFlagshipSunkSentence = (
  battle: BattleNodeCapture,
  profile: FormalObservationProfile,
) => {
  const summary = battle.enemyFlagshipSunkSummary
  if (!summary?.triggered) {
    return null
  }

  const target = formatEnemyFlagshipTarget(summary.enemyNameRaw)
  if (profile.id === 'surveyed') {
    return `　特記戦果　${target}撃沈ヲ確認。`
  }
  if (profile.id === 'field_summary') {
    return `　特記戦果　${target}撃沈確実ト認ム。`
  }
  return `　特記戦果　${target}沈没セルモノト認ム。`
}

const buildStandardClaimBoard = (
  context: ReportRenderContext,
  evidence: PublicClaimEvidence,
  seed: number,
): StandardClaimBoard => {
  const focus = selectPublicClaimFocus(context, evidence)
  const antiAirEstimate =
    evidence.antiAir?.truthLoss != null && evidence.antiAir.truthLoss >= 20
      ? roundUp10(
          Math.max(evidence.antiAir.truthLoss * 2.5, evidence.antiAir.truthLoss + 60),
        )
      : null
  const carrierAirEstimate = evidence.carrierAirLoss
    ? toCarrierAircraftPropagandaEstimate(
        evidence.carrierAirLoss.truthLoss,
        'standard_bulletin',
      )
    : null
  const antiAirCount =
    antiAirEstimate == null
      ? null
      : formatStandardPublicPlaneCount(antiAirEstimate, seed, 'antiAir')
  const carrierAirCount =
    carrierAirEstimate == null
      ? null
      : formatStandardPublicPlaneCount(carrierAirEstimate, seed, 'carrierAirLoss')
  const items: StandardClaimItem[] = []

  if (evidence.enemyFlagshipSunk?.triggered) {
    items.push({
      kind: 'enemy_flagship_sunk',
      sentence: `${formatEnemyFlagshipTarget(
        evidence.enemyFlagshipSunk.enemyNameRaw,
      )}ヲ撃沈、敵戦列ヲ潰乱セシメタリ。`,
    })
  }

  if (evidence.carrierAirLoss?.triggered && carrierAirCount) {
    items.push({
      kind: 'carrier_air_loss',
      sentence: pickVariant(seed, 'standard_bulletin:carrierAirLoss', [
        `敵艦載機${carrierAirCount}亦海中ニ葬レリ。`,
        `敵母艦群損失ニ伴ヒ、艦載機${carrierAirCount}喪失セリ。`,
        `敵航空戦力亦同時ニ${carrierAirCount}ヲ失ヒ大損害ヲ受ケタリ。`,
      ]),
    })
  }

  if (evidence.antiAir?.triggered) {
    const shipClause = evidence.antiAir.shipName
      ? `殊ニ「${evidence.antiAir.shipName}」ノ防空戦闘鋭甚ニシテ、`
      : ''
    items.push({
      kind: 'anti_air',
      sentence: antiAirCount
        ? `${shipClause}敵機${antiAirCount}ヲ撃滅セリ。`
        : `${shipClause}敵航空攻勢ハ主戦闘前既ニ挫折セリ。`,
    })
  }

  if (evidence.antiSubmarine?.triggered) {
    const target = evidence.antiSubmarine.targetCount >= 2 ? '敵潜水艦数隻' : '敵潜水艦'
    const sentence = evidence.antiSubmarine.shipName
      ? `殊ニ「${evidence.antiSubmarine.shipName}」ノ対潜戦闘鋭甚ニシテ、${target}ヲ撃沈破セリ。`
      : `対潜攻撃ニ依リ、${target}ヲ撃沈破セリ。`
    items.push({
      kind: 'anti_submarine',
      sentence,
    })
  }

  return {
    focus,
    evidence,
    antiAirCount,
    carrierAirCount,
    items,
  }
}

const buildStandardClaimInventory = (board: StandardClaimBoard) => {
  if (board.items.length === 0) {
    return []
  }

  if (board.items.length === 1) {
    return [board.items[0]!.sentence]
  }

  return [
    '現在迄ニ判明セル戦果概ネ左ノ如シ。',
    ...board.items.map((item, index) => `${toSimpleKanji(index + 1)}、${item.sentence}`),
  ]
}

const buildShortAntiAirBullet = (truthSource: WarReportTruthSource | null) => {
  const aggregate = buildSortieAntiAirAggregate(truthSource)
  if (!aggregate?.triggered) {
    return ''
  }

  if (aggregate.truthLoss != null && aggregate.truthLoss >= 20) {
    const reportedLoss = roundUp10(
      Math.max(aggregate.truthLoss * 3.5, aggregate.truthLoss + 100),
    )
    if (aggregate.shipName) {
      return `「${aggregate.shipName}」奮戦、敵機${formatApproximatePlaneCount(reportedLoss)}ヲ掃蕩。`
    }
    return `敵航空攻勢、敵機${formatApproximatePlaneCount(reportedLoss)}喪失ノ裡ニ潰滅。`
  }

  if (aggregate.shipName) {
    return `「${aggregate.shipName}」防空勇戦、敵航空兵力著減。`
  }

  return '防空成功、敵航空兵力著減。'
}

const buildShortAntiAirSupportBullet = (
  truthSource: WarReportTruthSource | null,
  context: ReportRenderContext,
) => {
  const aggregate = buildSortieAntiAirAggregate(truthSource)
  if (!aggregate?.triggered) {
    return ''
  }

  if (aggregate.shipName) {
    if (context.enemyCategory === 'submarine_force') {
      return `「${aggregate.shipName}」防空戦闘鋭甚、我作戦支障ナシ。`
    }

    return `「${aggregate.shipName}」防空奮戦、敵航空企図亦挫折セリ。`
  }

  return context.enemyCategory === 'submarine_force'
    ? '防空戦闘鋭甚、我作戦支障ナシ。'
    : '防空成功、敵航空企図亦挫折セリ。'
}

const buildShortAntiSubmarineBullet = (truthSource: WarReportTruthSource | null) => {
  const aggregate = buildSortieAntiSubmarineAggregate(truthSource)
  if (!aggregate?.triggered) {
    return ''
  }

  const target = aggregate.targetCount >= 2 ? '敵潜水艦数隻' : '敵潜水艦'
  if (aggregate.shipName) {
    return aggregate.damagingHitCount >= 2 || aggregate.targetCount >= 2
      ? `「${aggregate.shipName}」対潜奮戦、${target}ヲ掃蕩。`
      : `「${aggregate.shipName}」対潜攻撃、敵潜航兵力ニ打撃。`
  }

  return aggregate.damagingHitCount >= 2 || aggregate.targetCount >= 2
    ? `${target}ヲ掃蕩、対潜戦果顕著。`
    : '対潜攻撃、敵潜航兵力ニ打撃。'
}

const buildShortCarrierAirLossBullet = (
  truthSource: WarReportTruthSource | null,
  seed: number,
) => {
  const aggregate = buildSortieCarrierAirLossAggregate(truthSource)
  if (!aggregate?.triggered) {
    return ''
  }

  const reported = toCarrierAircraftPropagandaBand(aggregate.truthLoss, 'short_bulletin')
  if (!reported) {
    return ''
  }

  return pickVariant(seed, 'short_bulletin:carrierAirLoss', [
    `敵艦載機${reported}機、母艦諸共喪失。`,
    `敵航空兵力${reported}機壊滅。`,
    `敵艦載機${reported}機海没。`,
  ])
}

const buildShortEnemyFlagshipSunkBullet = (truthSource: WarReportTruthSource | null) =>
  buildSortieEnemyFlagshipSunkAggregate(truthSource)?.triggered
    ? '敵旗艦撃沈、戦果顕著。'
    : ''

const mixSeed = (seed: number, slot: string) => {
  let value = seed >>> 0
  for (let index = 0; index < slot.length; index += 1) {
    value = Math.imul(value ^ slot.charCodeAt(index), 16777619) >>> 0
  }
  return value
}

const pickVariant = (seed: number, slot: string, variants: string[]) => {
  if (variants.length === 0) {
    return ''
  }
  return variants[mixSeed(seed, slot) % variants.length]!
}

const formalObservationProfiles: Record<
  FormalObservationProfileId,
  Omit<FormalObservationProfile, 'pluralDamageLabel'>
> = {
  surveyed: {
    id: 'surveyed',
    enemyShipLimit: 4,
    damageCountMode: 'exact',
    damageDetailLimit: 6,
    nodeDamageMode: 'observed',
    planeCountMode: 'exact',
  },
  field_summary: {
    id: 'field_summary',
    enemyShipLimit: 2,
    damageCountMode: 'salience',
    damageDetailLimit: 4,
    nodeDamageMode: 'summary',
    planeCountMode: 'bounded',
  },
  fragmentary: {
    id: 'fragmentary',
    enemyShipLimit: 0,
    damageCountMode: 'summary',
    damageDetailLimit: 2,
    nodeDamageMode: 'deferred',
    planeCountMode: 'coarse',
  },
}

const buildFormalObservationProfile = (
  context: ReportRenderContext,
  seed: number,
): FormalObservationProfile => {
  let fogScore = mixSeed(seed, 'formal_after_action:observationProfile') % 100
  fogScore += Math.min(5, Math.max(0, context.nodeCount - 1)) * 2
  fogScore += context.sawAirAttack ? 5 : 0
  fogScore += isAnyFailedSortie(context) ? 7 : 0
  fogScore += context.damageSeverity === 'heavy' ? 3 : 0
  fogScore -= context.kind === 'practice' ? 10 : 0
  fogScore -= context.nodeCount <= 1 ? 5 : 0

  const id: FormalObservationProfileId =
    fogScore < 25 ? 'surveyed' : fogScore < 75 ? 'field_summary' : 'fragmentary'

  return {
    ...formalObservationProfiles[id],
    pluralDamageLabel:
      mixSeed(seed, 'formal_after_action:observationProfile:pluralDamage') % 2 === 0
        ? '若干'
        : '数隻',
  }
}

const formatFormalObservedPlaneCount = (
  value: number,
  profile: FormalObservationProfile,
  seed: number,
  slot: string,
) => {
  const exact = Math.max(1, Math.floor(value))
  if (profile.planeCountMode === 'exact' || exact < 10) {
    return formatExactPlaneCount(exact)
  }

  const lower = Math.max(10, Math.floor(exact / 10) * 10)
  const upper = Math.max(lower, Math.ceil(exact / 10) * 10)

  if (profile.planeCountMode === 'bounded') {
    const rounded = roundUp10(exact)
    return pickVariant(seed, `formal_after_action:observedPlaneCount:${slot}`, [
      `約${toFormalKansuji(rounded)}機`,
      lower === upper
        ? `約${toFormalKansuji(exact)}機`
        : `${toFormalKansuji(lower)}乃至${toFormalKansuji(upper)}機`,
    ])
  }

  if (exact < 20) {
    return exact === 10 ? '約十機' : '十数機'
  }

  return exact === lower
    ? `約${toFormalKansuji(exact)}機`
    : `${toFormalKansuji(lower)}余機`
}

const uniqueFamilies = <T extends { id: string }>(families: Array<T | null | undefined | false>) => {
  const seen = new Set<string>()
  return families.filter((family): family is T => {
    if (!family || seen.has(family.id)) {
      return false
    }
    seen.add(family.id)
    return true
  })
}

const getRecentSelections = (
  options: WarReportRenderOptions,
  style: WarReportStyle,
) => options.recentSelections?.[style] ?? []

const countRecentFamilyUsage = (
  recentSelections: WarReportSelectionSnapshot[],
  slot: string,
  familyId: string,
  limit: number,
) =>
  recentSelections
    .slice(0, limit)
    .filter((selection) => selection.slotFamilies[slot] === familyId).length

const selectFamily = <T extends { id: string }>(
  seed: number,
  style: WarReportStyle,
  slot: string,
  families: T[],
  recentSelections: WarReportSelectionSnapshot[],
  slotFamilies: Record<string, string>,
) => {
  if (families.length === 0) {
    return null
  }

  const scoredFamilies = families.map((family, index) => {
    const recent10Count = countRecentFamilyUsage(recentSelections, slot, family.id, 10)
    const recent20Count = countRecentFamilyUsage(recentSelections, slot, family.id, 20)
    const blocked = recent20Count >= 5
    const baseScore = mixSeed(seed, `${style}:${slot}:${family.id}`) % 1000
    const orderBoost = Math.max(0, families.length - index) * 30
    const penalty =
      (recent10Count >= 3 ? 450 : 0) +
      recent20Count * 35 +
      (blocked ? 250 : 0)

    return {
      family,
      blocked,
      score: baseScore + orderBoost - penalty,
    }
  })

  const unblockedFamilies = scoredFamilies.filter((candidate) => !candidate.blocked)
  const candidatePool =
    unblockedFamilies.length >= 2 ? unblockedFamilies : scoredFamilies

  candidatePool.sort((left, right) => right.score - left.score)
  const selected = candidatePool[0]?.family ?? families[0]

  if (!selected) {
    return null
  }

  slotFamilies[slot] = selected.id
  return selected
}

const buildSelectionSnapshot = (
  style: WarReportStyle,
  mainNarrative: MainNarrative,
  fingerprint: number,
  slotFamilies: Record<string, string>,
): WarReportSelectionSnapshot => ({
  style,
  mainNarrative,
  fingerprint,
  slotFamilies,
})

const extractNarrativeTags = (context: ReportRenderContext): NarrativeTags => ({
  outcomeTone:
    context.kind === 'practice'
      ? 'practice'
      : isAnyFailedSortie(context)
        ? 'withdrawal'
        : context.resultCategory === 'decisive_success'
          ? 'decisive'
          : context.resultCategory === 'success' || context.resultCategory === 'partial_success'
            ? 'favorable'
            : 'contested',
  damageTone:
    context.damageSeverity === 'none'
      ? 'pristine'
      : context.damageSeverity === 'light'
        ? 'light'
        : context.damageSeverity === 'moderate'
          ? 'strained'
          : context.damageSeverity === 'heavy'
            ? 'critical'
            : 'unknown',
  enemyTheme:
    context.enemyCategory === 'air_power'
      ? 'air'
      : context.enemyCategory === 'submarine_force'
        ? 'submarine'
        : context.enemyCategory === 'transport_group'
          ? 'transport'
          : context.enemyCategory === 'land_force'
            ? 'land'
            : context.enemyCategory === 'main_force' || context.enemyCategory === 'patrol_force'
              ? 'surface'
              : 'generic',
  battleShape:
    context.kind === 'practice'
      ? 'practice'
      : isAnyFailedSortie(context)
        ? 'withdrawal'
        : context.nodeCount > 1
          ? 'multi_node'
          : 'single_engagement',
  airPresence: context.sawAirAttack || context.enemyCategory === 'air_power' ? 'present' : 'absent',
  standoutActor: context.mvpDisplay ? 'mvp' : context.flagshipDisplay ? 'flagship' : 'none',
  missionTone:
    context.kind === 'practice'
      ? 'practice'
      : isAnyFailedSortie(context)
        ? 'withdrawal'
        : 'completion',
})

const selectMainNarrative = (
  context: ReportRenderContext,
  tags: NarrativeTags,
  fingerprint: number,
): MainNarrative => {
  const scores: Record<MainNarrative, number> = {
    clean_sweep: 0,
    valor_highlight: 0,
    air_suppression: 0,
    submarine_intercept: 0,
    mission_completion: 0,
    damage_control: 0,
    disciplined_withdrawal: 0,
  }

  if (context.kind === 'practice') {
    scores.mission_completion += 110
  }

  if (isAnyFailedSortie(context)) {
    scores.disciplined_withdrawal += 120
  }

  if (tags.damageTone === 'light') {
    scores.damage_control += 60
  } else if (tags.damageTone === 'strained') {
    scores.damage_control += 75
  } else if (tags.damageTone === 'critical') {
    scores.damage_control += 90
  }

  if (tags.enemyTheme === 'air' || tags.airPresence === 'present') {
    scores.air_suppression += 78
  }

  if (tags.enemyTheme === 'submarine') {
    scores.submarine_intercept += 78
  }

  if (tags.standoutActor === 'mvp') {
    scores.valor_highlight += 70
  }

  if (
    !isAnyFailedSortie(context) &&
    tags.damageTone === 'pristine' &&
    (context.resultCategory === 'decisive_success' || context.winRank === 'S')
  ) {
    scores.clean_sweep += 76
  }

  if (!isAnyFailedSortie(context)) {
    scores.mission_completion += 48
  }

  if (tags.battleShape === 'multi_node') {
    scores.mission_completion += 6
  }

  const rankedNarratives = (Object.entries(scores) as [MainNarrative, number][])
    .map(([narrative, score]) => ({
      narrative,
      score,
      tieBreaker: mixSeed(fingerprint, `main:${narrative}`),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }
      return right.tieBreaker - left.tieBreaker
    })

  return rankedNarratives[0]?.narrative ?? 'mission_completion'
}

const buildPublicBodyLead = (
  context: ReportRenderContext,
  style: WarReportStyle,
  seed: number,
) => {
  const flagshipDisplay = context.flagshipDisplay ?? '不詳'
  const flagshipClause = context.flagshipTypeDisplay
    ? `${context.flagshipTypeDisplay}「${flagshipDisplay}」ヲ旗艦トシ`
    : context.flagshipDisplay
      ? `「${flagshipDisplay}」ヲ旗艦トシ`
      : `旗艦「${flagshipDisplay}」ノ下ニ`

  return pickVariant(seed, `${style}:bodyLead`, [
    context.compositionSentence,
    `当時我部隊兵力ハ、${context.friendlySummary}ヲ基幹トシ、${flagshipClause}、整斉ナル作戦行動ヲ継続セリ。`,
    `我部隊ハ、${context.friendlySummary}ヲ以テ編成セラレ、各艦相互ニ緊密ナル協同ヲ保持セリ。`,
  ])
}

const buildFormalFlagshipListing = (context: ReportRenderContext) => {
  const flagshipDisplay = context.flagshipDisplay ?? '不詳'
  return context.flagshipTypeDisplay
    ? `旗艦、${context.flagshipTypeDisplay}「${flagshipDisplay}」`
    : `旗艦「${flagshipDisplay}」`
}

type MeritCandidate = {
  shipName: string
  antiAirStrength: number
  antiSubmarineStrength: number
  isMvp: boolean
  fleetOrder: number
}

const getAntiAirMeritStrength = (truthLoss: number | null) =>
  truthLoss != null && truthLoss >= 60 ? 3 : truthLoss != null && truthLoss >= 20 ? 2 : 1

const getAntiSubmarineMeritStrength = (
  damagingHitCount: number,
  targetCount: number,
  assessedDamage: number,
) =>
  (damagingHitCount >= 3 && targetCount >= 2) || assessedDamage >= 100
    ? 3
    : damagingHitCount >= 2 || targetCount >= 2 || assessedDamage >= 50
      ? 2
      : 1

const getDistinguishedBasis = (candidate: MeritCandidate): DistinguishedCredit['basis'] => {
  if (candidate.antiAirStrength > 0 && candidate.antiSubmarineStrength > 0) {
    return 'combined_specialist'
  }
  if (candidate.antiAirStrength >= 2) {
    return 'anti_air_high'
  }
  if (candidate.antiSubmarineStrength >= 2) {
    return 'anti_submarine_high'
  }
  if (candidate.antiAirStrength > 0) {
    return 'anti_air'
  }
  if (candidate.antiSubmarineStrength > 0) {
    return 'anti_submarine'
  }
  return 'mvp'
}

const selectDistinguishedCredit = (
  context: ReportRenderContext,
  truthSource: WarReportTruthSource | null,
): DistinguishedCredit | null => {
  const candidates = new Map<string, MeritCandidate>()
  const fleetOrder = new Map(
    context.friendlyFleet.map((ship, index) => [normalizeFriendlyReportName(ship.nameJa), index]),
  )
  const getCandidate = (shipName: string) => {
    const existing = candidates.get(shipName)
    if (existing) {
      return existing
    }
    const created: MeritCandidate = {
      shipName,
      antiAirStrength: 0,
      antiSubmarineStrength: 0,
      isMvp: shipName === context.mvpDisplay,
      fleetOrder: fleetOrder.get(shipName) ?? Number.MAX_SAFE_INTEGER,
    }
    candidates.set(shipName, created)
    return created
  }

  for (const contribution of buildSortieAntiAirContributions(truthSource)) {
    const candidate = getCandidate(contribution.shipName)
    candidate.antiAirStrength = getAntiAirMeritStrength(contribution.truthLoss)
  }

  for (const contribution of buildSortieAntiSubmarineContributions(truthSource)) {
    if (!contribution.shipName) {
      continue
    }
    const candidate = getCandidate(contribution.shipName)
    candidate.antiSubmarineStrength = getAntiSubmarineMeritStrength(
      contribution.damagingHitCount,
      contribution.targetCount,
      contribution.assessedDamage,
    )
  }

  if (context.mvpDisplay) {
    getCandidate(context.mvpDisplay).isMvp = true
  }

  const ranked = Array.from(candidates.values()).sort((left, right) => {
    const leftDomains =
      Number(left.antiAirStrength >= 2) + Number(left.antiSubmarineStrength >= 2)
    const rightDomains =
      Number(right.antiAirStrength >= 2) + Number(right.antiSubmarineStrength >= 2)
    const leftPeak = Math.max(left.antiAirStrength, left.antiSubmarineStrength)
    const rightPeak = Math.max(right.antiAirStrength, right.antiSubmarineStrength)
    const leftTotal = left.antiAirStrength + left.antiSubmarineStrength
    const rightTotal = right.antiAirStrength + right.antiSubmarineStrength
    return (
      rightDomains - leftDomains ||
      rightPeak - leftPeak ||
      rightTotal - leftTotal ||
      Number(right.isMvp) - Number(left.isMvp) ||
      left.fleetOrder - right.fleetOrder ||
      left.shipName.localeCompare(right.shipName, 'ja')
    )
  })

  const highSpecialist = ranked.find(
    (candidate) => Math.max(candidate.antiAirStrength, candidate.antiSubmarineStrength) >= 2,
  )
  if (highSpecialist) {
    return {
      shipName: highSpecialist.shipName,
      basis: getDistinguishedBasis(highSpecialist),
    }
  }

  if (context.mvpDisplay) {
    return {
      shipName: context.mvpDisplay,
      basis: 'mvp',
    }
  }

  const lowSpecialist = ranked.find(
    (candidate) => candidate.antiAirStrength > 0 || candidate.antiSubmarineStrength > 0,
  )
  return lowSpecialist
    ? {
        shipName: lowSpecialist.shipName,
        basis: getDistinguishedBasis(lowSpecialist),
      }
    : null
}

const buildMvpClause = (
  context: ReportRenderContext,
  seed: number,
  slot: string,
) => {
  if (!context.mvpDisplay) {
    return ''
  }

  return `${pickVariant(seed, slot, [
    `殊ニ「${context.mvpDisplay}」ノ奮戦、武功顕著ナリ。`,
    `「${context.mvpDisplay}」ノ戦働、殊勲ト認ム。`,
    `本行動ニ於ケル「${context.mvpDisplay}」ノ奮迅、特筆ニ値ス。`,
  ])} `
}

const buildStandardDistinguishedClause = (
  context: ReportRenderContext,
  truthSource: WarReportTruthSource | null,
  seed: number,
  slot: string,
) => {
  const credit = selectDistinguishedCredit(context, truthSource)
  if (!credit) {
    return ''
  }

  if (credit.basis === 'mvp') {
    return buildMvpClause(context, seed, slot)
  }

  const variants =
    credit.basis === 'combined_specialist'
      ? [
          `殊ニ「${credit.shipName}」ノ防空並対潜戦闘、武功顕著ナリ。`,
          `「${credit.shipName}」ノ防空対潜両面ニ於ケル奮戦、殊勲ト認ム。`,
          `本行動ニ於ケル「${credit.shipName}」ノ防空並対潜戦果、特筆ニ値ス。`,
        ]
      : credit.basis === 'anti_air_high'
        ? [
          `殊ニ「${credit.shipName}」ノ防空戦闘、武功顕著ナリ。`,
          `「${credit.shipName}」ノ防空奮戦、殊勲ト認ム。`,
          `本行動ニ於ケル「${credit.shipName}」ノ対空戦闘、特筆ニ値ス。`,
        ]
        : credit.basis === 'anti_submarine_high'
          ? [
              `殊ニ「${credit.shipName}」ノ対潜戦闘、武功顕著ナリ。`,
              `「${credit.shipName}」ノ対潜奮戦、殊勲ト認ム。`,
              `本行動ニ於ケル「${credit.shipName}」ノ対潜戦果、特筆ニ値ス。`,
            ]
          : credit.basis === 'anti_submarine'
            ? [
                `「${credit.shipName}」ノ対潜戦闘、功アリ。`,
                `本行動ニ於ケル「${credit.shipName}」ノ対潜奮戦ヲ録ス。`,
                `「${credit.shipName}」ノ対潜戦闘、特筆ニ値ス。`,
              ]
            : [
                `「${credit.shipName}」ノ防空戦闘、功アリ。`,
                `本行動ニ於ケル「${credit.shipName}」ノ防空奮戦ヲ録ス。`,
                `「${credit.shipName}」ノ対空戦闘、特筆ニ値ス。`,
              ]

  return `${pickVariant(seed, slot, variants)} `
}

const buildHistoricalStandardHeadlineFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
  board: StandardClaimBoard,
) => {
  const { focus } = board

  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-practice',
        variants: [
          '対抗演習実施、演習成績概ネ良好',
          '対抗演習、部隊統制ノ充実ヲ示ス',
          '演習部隊、所定演習課目ヲ完遂',
        ],
      },
    ])
  }

  if (focus === 'enemy_flagship_sunk') {
    const target = formatEnemyFlagshipTarget(board.evidence.enemyFlagshipSunk?.enemyNameRaw)
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-enemy-flagship-focus',
        variants: [
          `${context.operationPhrase}方面作戦、${target}撃沈`,
          `${context.operationPhrase}方面交戦、${target}ヲ覆滅`,
          `${context.operationPhrase}方面戦況、${target}撃沈ノ戦果`,
        ],
      },
    ])
  }

  if (focus === 'carrier_air_loss') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-carrier-focus',
        variants: [
          board.carrierAirCount
            ? `${context.operationPhrase}方面作戦、敵艦載機${board.carrierAirCount}喪失`
            : `${context.operationPhrase}方面作戦、敵航空戦力ニ大打撃`,
          `${context.operationPhrase}方面作戦、敵航空戦力ニ大打撃`,
          `${context.operationPhrase}方面交戦、敵母艦群ニ戦果顕著`,
        ],
      },
    ])
  }

  if (focus === 'transport') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-transport-focus',
        variants: [
          `${context.operationPhrase}方面作戦、敵輸送企図ヲ挫折`,
          `${context.operationPhrase}方面交戦、敵上陸企図ヲ阻止`,
          `${context.operationPhrase}方面作戦、敵輸送作戦ヲ阻碍`,
        ],
      },
    ])
  }

  if (focus === 'anti_submarine') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-anti-submarine-focus',
        variants: [
          `${context.operationPhrase}方面対潜戦、敵潜水兵力ヲ撃摧`,
          `${context.operationPhrase}方面作戦、敵潜航企図ヲ粉砕`,
          `${context.operationPhrase}方面交戦、対潜戦果顕著`,
        ],
      },
    ])
  }

  if (focus === 'submarine_force') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-submarine-focus',
        variants: [
          `${context.operationPhrase}方面作戦、敵潜水兵力ヲ撃摧`,
          `${context.operationPhrase}方面交戦、敵潜航企図ヲ挫折`,
          `${context.operationPhrase}方面作戦、敵潜水兵力ニ戦果顕著`,
        ],
      },
    ])
  }

  if (focus === 'anti_air_numeric' || focus === 'air_power') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-air-focus',
        variants: [
          board.antiAirCount
            ? `${context.operationPhrase}方面防空戦、敵機${board.antiAirCount}撃滅`
            : `${context.operationPhrase}方面作戦、敵航空攻勢ヲ挫折`,
          `${context.operationPhrase}方面作戦、敵航空攻勢ヲ挫折`,
          `${context.operationPhrase}方面交戦、敵航空兵力ニ大戦果`,
        ],
      },
    ])
  }

  if (focus === 'main_force') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-headline-main-force-focus',
        variants: [
          `${context.operationPhrase}方面作戦、戦果顕著`,
          `${context.operationPhrase}方面交戦、敵主力ニ大打撃`,
          `${context.operationPhrase}方面作戦、敵主力挫折`,
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.enemyFrame === 'air_power' && {
      id: 'historical-standard-headline-air',
      variants: [
        `${context.operationPhrase}方面航空戦、敵航空兵力ニ大戦果`,
        `${context.operationPhrase}方面邀撃戦、敵航空攻勢ヲ挫折`,
        `${context.operationPhrase}方面作戦、敵航空企図ヲ覆滅`,
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'historical-standard-headline-submarine',
      variants: [
        `${context.operationPhrase}方面作戦、敵潜航兵力邀撃`,
        `${context.operationPhrase}方面交戦、敵潜航企図ヲ制圧`,
        `${context.operationPhrase}方面作戦、潜航敵部隊ニ打撃`,
      ],
    },
    profile.officialOutcome === 'claimed_operational_success' && {
      id: 'historical-standard-headline-operational',
      variants: [
        `${context.operationPhrase}方面作戦、作戦成果ヲ確保`,
        `${context.operationPhrase}方面交戦、敵企図挫折ノ成果`,
        `${context.operationPhrase}方面作戦、所定成果ヲ確保`,
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'historical-standard-headline-contribution',
      variants: [
        `${context.operationPhrase}方面作戦、敢闘ノ裡敵ニ打撃`,
        `${context.operationPhrase}方面交戦、敵ニ打撃ヲ加フ`,
        `${context.operationPhrase}方面作戦、敵企図ニ制肘`,
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'historical-standard-headline-crushing',
      variants: [
        `${context.operationPhrase}方面作戦、戦果顕著`,
        `${context.operationPhrase}方面交戦、敵ニ大打撃`,
        `${context.operationPhrase}方面作戦、敵企図ヲ挫折`,
      ],
    },
    {
      id: 'historical-standard-headline-general',
      variants: [
        `${context.operationPhrase}方面作戦、戦果顕著`,
        `${context.operationPhrase}方面交戦、大ナル戦果ヲ収ム`,
        `${context.operationPhrase}方面作戦、敵ニ打撃ヲ加フ`,
      ],
    },
  ])
}

const buildHistoricalStandardSubheadlineFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
  board: StandardClaimBoard,
) => {
  const { focus } = board

  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-practice',
        variants: [
          '各隊沈着機敏ナル行動ヲ示シ課目達成ニ資ス',
          '協同行動緊密ニシテ演習成果良好ナリ',
          '訓練目的ヲ了シ部隊練度ノ充実ヲ示ス',
        ],
      },
    ])
  }

  if (focus === 'enemy_flagship_sunk') {
    const target = formatEnemyFlagshipTarget(board.evidence.enemyFlagshipSunk?.enemyNameRaw)
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-enemy-flagship-focus',
        variants: [
          `${target}ヲ撃沈、敵戦列ヲ潰乱セシメタリ`,
          `${target}撃沈ニ依リ敵指揮系統ヲ混乱セシム`,
          `${target}ヲ覆滅シ敵主力企図ヲ挫折セシメタリ`,
        ],
      },
    ])
  }

  if (focus === 'carrier_air_loss') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-carrier-focus',
        variants: [
          board.carrierAirCount
            ? `敵艦載機${board.carrierAirCount}ヲ喪失セシメタリ`
            : '敵母艦群損失ニ伴ヒ、敵航空戦力亦大損害ヲ受ケタリ',
          '敵母艦群損失ニ伴ヒ、敵航空戦力亦大損害ヲ受ケタリ',
          '敵航空兵力亦同時ニ大損害ヲ受ケタリ',
        ],
      },
    ])
  }

  if (focus === 'transport') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-transport-focus',
        variants: [
          '敵輸送企図ヲ挫折セシメタリ',
          '敵上陸企図ヲ阻止セリ',
          '敵輸送作戦ヲ妨止シ所定成果ヲ収メタリ',
        ],
      },
    ])
  }

  if (focus === 'anti_submarine') {
    const actor = board.evidence.antiSubmarine?.shipName
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-anti-submarine-focus',
        variants: [
          actor
            ? `殊ニ「${actor}」ノ対潜戦闘鋭甚、敵潜航企図ヲ粉砕セリ`
            : '対潜攻撃鋭甚ニシテ敵潜航企図ヲ粉砕セリ',
          '敵潜水兵力ニ有効打撃ヲ與ヘタリ',
          '敵潜水兵力ヲ制シ所定成果ヲ収メタリ',
        ],
      },
    ])
  }

  if (focus === 'submarine_force') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-submarine-focus',
        variants: [
          '敵潜航企図ヲ挫折セシメタリ',
          '敵潜水兵力ニ有効打撃ヲ與ヘタリ',
          '敵潜水兵力ヲ制シ所定成果ヲ収メタリ',
        ],
      },
    ])
  }

  if (focus === 'anti_air_numeric' || focus === 'air_power') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-air-focus',
        variants: [
          board.antiAirCount
            ? `来襲敵機${board.antiAirCount}ヲ撃滅セリ`
            : '敵航空攻勢ヲ挫折セシメ所定成果ヲ収メタリ',
          '敵航空攻勢ヲ挫折セシメ所定成果ヲ収メタリ',
          '敵航空兵力ニ有効打撃ヲ與ヘタリ',
        ],
      },
    ])
  }

  if (focus === 'main_force') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'historical-standard-subheadline-main-force-focus',
        variants: [
          '敵主力部隊ニ有効打撃ヲ與ヘタリ',
          '敵主力企図ヲ挫折セシメタリ',
          '敵主力ノ行動ヲ牽制シ成果顕著ナリ',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.enemyDamageClaim === 'enemy_air_crushed' && {
      id: 'historical-standard-subheadline-air',
      variants: [
        '敵航空兵力ニ有効打撃ヲ與ヘタリ',
        '敵航空攻勢ヲ挫折セシメ所定成果ヲ収メタリ',
        '敵航空企図ヲ覆シ我軍主導ヲ確保セリ',
      ],
    },
    profile.enemyDamageClaim === 'enemy_submarine_hit' && {
      id: 'historical-standard-subheadline-submarine',
      variants: [
        '敵潜航兵力ニ打撃ヲ加ヘタリ',
        '敵潜航企図ヲ挫折セシメタリ',
        '敵潜水兵力ニ有効打撃ヲ与ヘタリ',
      ],
    },
    profile.enemyDamageClaim === 'enemy_main_force_hit' && {
      id: 'historical-standard-subheadline-main-force',
      variants: [
        '敵主力部隊ニ有効打撃ヲ與ヘタリ',
        '敵主力企図ヲ挫折セシメタリ',
        '敵主力ノ行動ヲ牽制シ成果顕著ナリ',
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'historical-standard-subheadline-crushing',
      variants: [
        '敵ニ有効打撃ヲ與ヘ戦果顕著ナリ',
        '敵企図ヲ挫折セシメ作戦成果ヲ確保セリ',
        '戦果顕著ニシテ我軍行動概ネ順調ナリ',
      ],
    },
    {
      id: 'historical-standard-subheadline-general',
      variants: [
        '敵ニ有効打撃ヲ与ヘ所定成果ヲ収メタリ',
        '敵企図ヲ挫折セシメ所定成果ヲ確保セリ',
        '敵部隊ノ行動ヲ制シタリ',
      ],
    },
  ])
}

const buildPublicInitiativeFamilies = (
  context: ReportRenderContext,
  style: Extract<WarReportStyle, 'standard_bulletin' | 'short_bulletin'>,
  profile: PublicPropagandaProfile,
  highGlory = false,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: `${style}-initiative-practice`,
        variants:
          style === 'short_bulletin'
            ? [
                '対抗演習ヲ実施セリ。',
                '演習行動ヲ開始セリ。',
                '所定演習課目ヲ敢行セリ。',
              ]
            : [
                `帝国海軍演習部隊ハ、${toJapaneseDate(
                  context.occurredAt,
                )}、${context.practiceOpponent ?? '対抗部隊'}ト対抗演習ヲ実施セリ。`,
                `帝国海軍演習部隊ハ、${context.practiceOpponent ?? '対抗部隊'}ヲ相手ニ演習行動ヲ開始セリ。`,
                '帝国海軍演習部隊ハ、所定訓練課目ヲ沈着敢行セリ。',
              ],
      },
    ])
  }

  if (style === 'short_bulletin' && highGlory) {
    return uniqueFamilies<TextFamily>([
      context.enemyCategory === 'air_power' && {
        id: 'short-initiative-air-high-glory',
        variants: [
          '敵航空攻勢ヲ潰滅セシメタリ。',
          '敵航空兵力ヲ撃滅セリ。',
          '赫々タル防空戦果ヲ収メタリ。',
        ],
      },
      context.enemyCategory === 'transport_group' && {
        id: 'short-initiative-transport-high-glory',
        variants: [
          '敵輸送企図ヲ粉砕セリ。',
          '敵上陸企図ヲ阻止セリ。',
          '敵輸送作戦ヲ挫折セシメタリ。',
        ],
      },
      context.enemyCategory === 'main_force' && {
        id: 'short-initiative-main-force-high-glory',
        variants: [
          '敵主力ニ大打撃ヲ与ヘタリ。',
          '赫々タル戦果ヲ収メタリ。',
          '敵主力圧倒、戦果顕著。',
        ],
      },
      {
        id: 'short-initiative-general-high-glory',
        variants: [
          '敵部隊ニ大打撃ヲ与ヘタリ。',
          '赫々タル戦果ヲ収メタリ。',
          '敵企図空シク潰ユ。',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.initiativeFrame === 'intercept' && {
      id: `${style}-initiative-intercept`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵ニ対シ直ニ之ヲ邀撃セリ。',
              '我軍、急襲ヲ敢行セリ。',
              '我軍、直ニ猛攻ヲ加ヘタリ。',
            ]
          : [
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
                profile,
              )}ニ対シ邀撃行動ヲ開始セリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ出現セル${buildPublicEncounterObject(
                profile,
              )}ヲ認メ、直ニ之ニ対処セリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル${buildPublicEncounterObject(
                profile,
              )}トノ接触ニ際シ、邀撃部署ニ就ケリ。`,
            ],
    },
    profile.initiativeFrame === 'assault' && {
      id: `${style}-initiative-assault`,
      variants:
        style === 'short_bulletin'
          ? [
              '我軍、攻撃ヲ開始セリ。',
              '我軍、猛攻ヲ加ヘタリ。',
              '我軍、敢然作戦ヲ敢行セリ。',
            ]
          : [
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ攻勢行動ヲ開始セリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル${buildPublicEncounterObject(
                profile,
              )}ニ対シ攻撃部署ニ就ケリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
                profile,
              )}ニ対スル作戦行動ヲ敢行セリ。`,
            ],
    },
    {
      id: `${style}-initiative-offensive`,
      variants:
        style === 'short_bulletin'
          ? [
              '我軍、攻撃ヲ開始セリ。',
              '我軍、直ニ之ヲ制圧セリ。',
              '我軍、果敢ニ攻撃ヲ継続セリ。',
            ]
          : [
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面行動中、${buildPublicEncounterObject(
                profile,
              )}ニ対シ攻撃ヲ開始セリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
                profile,
              )}ト接触シ、之ニ応戦セリ。`,
              `帝国海軍出撃部隊ハ、${context.operationPhrase}方面作戦ニ於テ${buildPublicEncounterObject(
                profile,
              )}ニ対スル行動ヲ継続セリ。`,
            ],
    },
  ])
}

const buildPublicDamageClaimFamilies = (
  context: ReportRenderContext,
  style: Extract<WarReportStyle, 'standard_bulletin' | 'short_bulletin'>,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: `${style}-damage-claim-practice`,
        variants:
          style === 'short_bulletin'
            ? [
                '演習成果概ネ良好ナリ。',
                '各隊協同成果顕著ナリ。',
                '訓練課目ヲ良好ニ了セリ。',
              ]
            : [
                '各艦ノ行動沈着機敏ニシテ、演習成果概ネ良好ナリ。',
                '部隊協同緊密ニシテ、所定訓練課目ヲ良好ニ了セリ。',
                '訓練成績良好ニシテ、各隊ノ協同成果顕著ナリ。',
              ],
      },
    ])
  }

  if (style === 'standard_bulletin' && isAnyFailedSortie(context)) {
    return uniqueFamilies<TextFamily>([
      {
        id: 'standard-damage-claim-purpose-achieved-transfer',
        variants: [
          '敵企図ヲ挫折セシメ所定ノ目的ヲ達成、我部隊ハ整然他ニ転進セリ。',
          '敵ニ有効打撃ヲ加ヘ所期ノ目的ヲ達成セルニ依リ、爾後他方面ニ転進セリ。',
          '所定ノ作戦目的ヲ概ネ達成シ、部隊ハ次段行動ノ為転進セリ。',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    context.enemyCategory === 'transport_group' && {
      id: `${style}-damage-claim-transport`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵輸送企図ヲ粉砕セシメタリ。',
              '敵上陸企図ヲ阻止セリ。',
              '敵輸送作戦ヲ挫折セシメタリ。',
            ]
          : [
              '敵輸送企図ヲ挫折セシメタリ。',
              '敵輸送作戦ヲ阻止セリ。',
              '敵上陸企図ヲ妨止セリ。',
            ],
    },
    profile.enemyDamageClaim === 'enemy_air_crushed' && {
      id: `${style}-damage-claim-air`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵航空兵力ニ甚大ナル打撃ヲ與ヘタリ。',
              '敵航空攻勢ヲ粉砕セシメタリ。',
              '敵航空企図ヲ覆シ大ナル戦果ヲ収メタリ。',
            ]
          : [
              '敵航空兵力ニ有効打撃ヲ與ヘタリ。',
              '敵航空攻勢ヲ挫折セシメタリ。',
              '敵航空企図ノ遂行ヲ阻止セリ。',
            ],
    },
    profile.enemyDamageClaim === 'enemy_submarine_hit' && {
      id: `${style}-damage-claim-submarine`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵潜航兵力ニ大打撃ヲ加ヘタリ。',
              '敵潜航企図ヲ粉砕セシメタリ。',
              '敵潜水兵力ニ大ナル戦果ヲ収メタリ。',
            ]
          : [
              '敵潜航兵力ニ打撃ヲ加ヘタリ。',
              '敵潜航企図ヲ挫折セシメタリ。',
              '敵潜水兵力ノ行動ヲ制セリ。',
            ],
    },
    profile.enemyDamageClaim === 'enemy_main_force_hit' && {
      id: `${style}-damage-claim-main-force`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵主力ニ大打撃ヲ加ヘタリ。',
              '敵主力部隊ニ甚大ナル打撃ヲ與ヘタリ。',
              '敵主力企図ヲ粉砕セシメタリ。',
            ]
          : [
              '敵主力部隊ニ有効打撃ヲ加ヘタリ。',
              '敵主力企図ヲ挫折セシメタリ。',
              '敵主力ニ打撃ヲ加ヘ、成果顕著ナリ。',
            ],
    },
    profile.enemyDamageClaim === 'major_blow' && {
      id: `${style}-damage-claim-major`,
      variants:
        style === 'short_bulletin'
          ? [
              '甚大ナル打撃ヲ與ヘタリ。',
              '殲滅的打撃ヲ與ヘタリ。',
              '大ナル戦果ヲ収メタリ。',
            ]
          : [
              '大ナル打撃ヲ與ヘタリ。',
              '敵ニ有効打撃ヲ加ヘタリ。',
              '成果顕著ナリ。',
            ],
    },
    {
      id: `${style}-damage-claim-general`,
      variants:
        style === 'short_bulletin'
          ? [
              '敵企図ヲ粉砕セシメタリ。',
              '敵部隊ニ大打撃ヲ加ヘタリ。',
              '戦果顕著ナリ。',
            ]
          : [
              '敵企図ヲ挫折セシメタリ。',
              '敵部隊ニ打撃ヲ与ヘタリ。',
              '所定成果ヲ収メタリ。',
            ],
    },
  ])
}

const buildPublicConcealmentFamilies = (
  style: Extract<WarReportStyle, 'standard_bulletin' | 'short_bulletin'>,
  profile: PublicPropagandaProfile,
) =>
  uniqueFamilies<TextFamily>([
    style === 'short_bulletin' && {
      id: 'short-concealment-continuity',
      variants: [
        '我軍態勢整然ナリ。',
        '我軍行動ニ支障ナシ。',
        '統制依然堅固ナリ。',
      ],
    },
    profile.selfDamageConcealment === 'none' && {
      id: `${style}-concealment-none`,
      variants: [
        '我ニ損害ナシ。',
        '各隊整然作戦ヲ継続セリ。',
        '我軍行動ニ支障ナシ。',
      ],
    },
    style === 'standard_bulletin' && profile.selfDamageConcealment === 'light' && {
      id: `${style}-concealment-light`,
      variants: [
        '我方損害軽微ナリ。',
        '部隊態勢整然ナリ。',
        '我軍行動ニ支障ナシ。',
      ],
    },
    {
      id: `${style}-concealment-omit`,
      variants: [
        '我軍態勢整然ナリ。',
        '我軍行動ニ支障ナシ。',
        '統制依然堅固ナリ。',
      ],
    },
  ])

const buildPublicHeatedClosingFamilies = (
  context: ReportRenderContext,
  style: Extract<WarReportStyle, 'standard_bulletin' | 'short_bulletin'>,
  profile: PublicPropagandaProfile,
  seed: number,
  truthSource: WarReportTruthSource | null,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: `${style}-closing-practice`,
        variants:
          style === 'short_bulletin'
            ? [
                '更ナル錬成ヲ祈ル。',
                '演習成果顕著ナリ。',
                '部隊協同ノ一層ノ練磨ヲ期ス。',
              ]
            : [
                '大本営ハ本演習成果ヲ嘉シ、益々ノ訓練錬成ヲ促スモノナリ。',
                '本演習ハ部隊練度ノ充実ヲ示スモノニシテ、将来ノ作戦遂行ニ資スル所大ナリ。',
                '大本営ハ本演習ニ示サレタル統制ノ緊密ニ着目シ、今後ノ精進ヲ期スルモノナリ。',
              ],
      },
    ])
  }

  const distinguishedClause =
    style === 'standard_bulletin'
      ? buildStandardDistinguishedClause(context, truthSource, seed, `${style}:distinguished`)
      : ''

  return uniqueFamilies<TextFamily>([
    profile.rhetoricHeat === 'maximal' && {
      id: `${style}-closing-maximal`,
      variants: [
        `${distinguishedClause}本戦果ヲ録ス。`,
        `${distinguishedClause}偉功ニ対シ慶祝ノ意ヲ表ス。`,
        `${distinguishedClause}右、発表ス。`,
      ],
    },
    {
      id: `${style}-closing-official`,
      variants: [
        `${distinguishedClause}大本営海軍部ハ本行動ノ成果ヲ公表ス。`,
        `${distinguishedClause}大本営海軍部ハ本行動ノ成果概要左ノ如ク発表ス。`,
        `${distinguishedClause}右、本行動ノ概要ヲ公表ス。`,
      ],
    },
  ])
}

const buildPublicBulletinLines = (lines: string[]) =>
  lines.map((line, index) => `${toSimpleKanji(index + 1)}、${line}`).join('\n')

const buildPublicDamageFamilies = (
  _context: ReportRenderContext,
  style: Extract<WarReportStyle, 'standard_bulletin' | 'short_bulletin'>,
  profile: PublicPropagandaProfile,
) =>
  uniqueFamilies<TextFamily>([
    profile.officialOutcome === 'claimed_operational_success' && {
      id: `${style}-continuity-operational`,
      variants:
        style === 'short_bulletin'
          ? [
              '各隊整斉トシテ後続行動ニ移ル。',
              '部隊態勢依然整然、作戦進展ヲ妨ゲズ。',
              '統制保持終始堅固ナリ。',
            ]
          : [
              '部隊態勢ヲ整ヘ、次段行動準備滞リナシ。',
              '各隊行動整斉ニシテ、作戦成果保持ニ支障ナシ。',
              '部隊統制依然堅固ニシテ、後続行動準備整ヘリ。',
            ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: `${style}-continuity-contribution`,
      variants:
        style === 'short_bulletin'
          ? [
              '敢闘ノ成果、爾後ノ作戦ニ資ス。',
              '部隊統制終始堅固ニシテ戦局進展ヲ助ク。',
              '各隊行動整然、作戦発展ニ支障ナシ。',
            ]
          : [
              '部隊統制終始堅固ニシテ、戦局進展ニ資スル態勢ヲ維持セリ。',
              '各隊行動整斉ニシテ、作戦発展ヲ阻害スル所ナシ。',
              '敢闘ノ成果保持セラレ、後続作戦ニ資スル態勢依然整然タリ。',
            ],
    },
    profile.selfDamageConcealment === 'omit' && {
      id: `${style}-continuity-concealed`,
      variants:
        style === 'short_bulletin'
          ? [
              '部隊統制終始堅固ナリ。',
              '各隊整然、戦力運用依然旺盛ナリ。',
              '作戦進展ニ支障ナシ。',
            ]
          : [
              '部隊態勢終始整然ニシテ、作戦進展ニ支障ナシ。',
              '各隊行動統一セラレ、戦力運用依然堅固ナリ。',
              '部隊統制保持良好ニシテ、作戦主導権依然我ニ在リ。',
            ],
    },
  ])

const buildStandardHeadlineFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'headline-practice',
        variants: [
          '演習部隊、対抗演習ニ於テ優勢ヲ確保',
          '対抗演習実施、部隊統制ノ充実ヲ示ス',
          '演習部隊、所定演習ヲ完遂',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.officialOutcome === 'claimed_operational_success' && {
      id: 'headline-operational-success',
      variants: [
        `${context.operationPhrase}方面交戦、敵企図挫折ノ成果ヲ確保`,
        `${context.operationPhrase}方面戦況、作戦成果ヲ確保シ次段行動ニ資ス`,
        `${context.operationPhrase}方面交戦、敵ニ打撃ヲ与ヘ戦局ニ寄与`,
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'headline-battlefield-contribution',
      variants: [
        `${context.operationPhrase}方面交戦、敢闘ノ裡敵ニ打撃`,
        `${context.operationPhrase}方面戦況、戦局進展ニ寄与スル成果`,
        `${context.operationPhrase}方面交戦、敵企図ヲ圧シ戦果ヲ録ス`,
      ],
    },
    profile.enemyFrame === 'air_power' && {
      id: 'headline-air-suppression',
      variants: [
        `${context.operationPhrase}方面交戦、敵航空兵力ヲ痛撃`,
        `${context.operationPhrase}方面戦況、敵航空攻勢ヲ挫折セシム`,
        `${context.operationPhrase}方面交戦、敵航空企図ヲ破摧`,
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'headline-submarine-claim',
      variants: [
        `${context.operationPhrase}方面交戦、敵潜水兵力ヲ制圧`,
        `${context.operationPhrase}方面戦況、敵潜航兵力ニ打撃`,
        `${context.operationPhrase}方面交戦、潜航敵部隊ヲ圧倒`,
      ],
    },
    profile.enemyFrame === 'enemy_main_force' && {
      id: 'headline-main-force-claim',
      variants: [
        `${context.operationPhrase}方面交戦、敵主力ニ打撃`,
        `${context.operationPhrase}方面戦況、敵主力ノ企図ヲ覆ス`,
        `${context.operationPhrase}方面交戦、敵艦隊ニ圧力ヲ加フ`,
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'headline-crushing-blow',
      variants: [
        `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
        `${context.operationPhrase}方面交戦、敵企図ヲ粉砕`,
        `${context.operationPhrase}方面戦況、主導権ヲ確保ス`,
      ],
    },
    {
      id: 'headline-victory',
      variants: [
        `${context.operationPhrase}方面交戦、作戦成果ヲ収ム`,
        `${context.operationPhrase}方面交戦、敵ニ打撃ヲ与ヘ戦果ヲ拡張`,
        `${context.operationPhrase}方面戦況、作戦進展ニ寄与`,
      ],
    },
  ])
}

const buildStandardSubheadlineFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'subheadline-practice',
        variants: [
          '沈着機敏ナル行動ニ依リ演習成果良好',
          '訓練目的ヲ貫徹シ部隊練度ノ充実ヲ示ス',
          '部隊協同緊密ニシテ演習課目ヲ完遂ス',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.officialOutcome === 'claimed_operational_success' && {
      id: 'subheadline-operational-success',
      variants: [
        '敵企図ヲ挫折セシメ作戦成果ヲ確保ス',
        '部隊統制堅固ニシテ次段行動ニ資ス',
        '所定行動ノ成果ヲ保持シ戦局ニ寄与ス',
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'subheadline-battlefield-contribution',
      variants: [
        '敢闘ノ裡敵ニ圧力ヲ加ヘ戦局進展ニ寄与ス',
        '奮戦ノ成果、爾後ノ作戦ニ資スル所大ナリ',
        '主力ノ行動終始果敢ニシテ敵企図ヲ抑止ス',
      ],
    },
    profile.enemyFrame === 'air_power' && {
      id: 'subheadline-air-result',
      variants: [
        '敵航空兵力ヲ痛撃シ戦局ヲ有利ニ導ク',
        '敵航空攻勢ヲ挫折セシメ作戦主導権ヲ確保ス',
        '敵空襲企図ヲ覆シ戦果拡張ニ資ス',
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'subheadline-submarine-result',
      variants: [
        '敵潜航兵力ヲ圧倒シ海面ノ安全ヲ確保ス',
        '対潜戦闘処置適切ニシテ敵潜水部隊ヲ制ス',
        '潜航敵部隊ヲ圧シ所定行動ヲ支障ナク続行ス',
      ],
    },
    profile.enemyFrame === 'enemy_main_force' && {
      id: 'subheadline-main-force-result',
      variants: [
        '敵主力ニ打撃ヲ与ヘ作戦進展ニ寄与ス',
        '敵艦隊ノ企図ヲ抑止シ主導権ヲ確保ス',
        '敵主力行動ヲ牽制シ戦局ヲ有利ニ導ク',
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'subheadline-crushing-blow',
      variants: [
        '主導権ヲ掌握シ戦果ヲ拡張ス',
        '敵企図ヲ粉砕シ作戦成果ヲ確保ス',
        '戦局ヲ有利ニ導キ赫々タル成果ヲ録ス',
      ],
    },
    {
      id: 'subheadline-frontline-success',
      variants: [
        '主導権ヲ掌握シ作戦成果ヲ拡張ス',
        '敵企図ヲ抑止シ戦局ヲ有利ニ導ク',
        '所定行動ノ成果顕著ニシテ戦局ニ寄与ス',
      ],
    },
  ])
}

const buildStandardSituationOpeningFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'situation-practice-standard',
        variants: [
          `帝国海軍演習部隊ハ、${toJapaneseDate(
            context.occurredAt,
          )}、${context.practiceOpponent ?? '対抗部隊'}ト対抗演習ヲ実施セリ。`,
          `帝国海軍演習部隊ノ一部ハ、${context.practiceOpponent ?? '対抗部隊'}ヲ相手ニ所定演習ヲ実施セリ。`,
          `帝国海軍演習部隊ハ、対抗演習ニ於テ沈着機敏ナル行動ヲ示セリ。`,
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    {
      id: 'situation-encounter',
      variants: [
        `帝国海軍出撃部隊ハ、${toJapaneseDate(
          context.occurredAt,
        )}、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(profile)}ニ遭遇セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル行動中、${buildPublicEncounterObject(
          profile,
        )}ヲ捕捉セリ。`,
        `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト交戦セリ。`,
      ],
    },
    {
      id: 'situation-intercept',
      variants: [
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ出現セル${buildPublicEncounterObject(
          profile,
        )}ニ対シ直ニ之ヲ邀撃セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面行動中、${buildPublicEncounterObject(
          profile,
        )}ノ接近ヲ認メ攻撃態勢ニ移レリ。`,
        `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト接触シ攻撃ヲ開始セリ。`,
      ],
    },
    {
      id: 'situation-deployment',
      variants: [
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ行動中、${buildPublicEncounterObject(
          profile,
        )}ノ出現ヲ見タリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル作戦行動中、${buildPublicEncounterObject(
          profile,
        )}ト相対セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ヲ発見シ交戦ニ入レリ。`,
      ],
    },
  ])
}

const buildStandardResultOpeningFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'result-practice',
        variants: [
          '各艦ノ行動沈着機敏ニシテ、演習全般ヲ良好ニ遂行セリ。',
          '部隊統制緊密ニシテ、演習目的達成ニ資スル成果ヲ示セリ。',
          '訓練成績良好ニシテ、所定課目ヲ完遂セリ。',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.officialOutcome === 'claimed_operational_success' && {
      id: 'result-operational-success',
      variants: [
        '我部隊ハ敵企図ヲ挫折セシメ、所定成果ヲ保持セリ。',
        '我部隊ノ行動沈着機敏ニシテ、所定行動概ネ整然タリ。',
        '我部隊ハ各艦協同ノ下、次段行動ニ資スル成果ヲ収メタリ。',
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'result-battlefield-contribution',
      variants: [
        '我部隊ハ敢闘ノ裡敵ニ打撃ヲ与ヘ、戦局推移ニ資セリ。',
        '我部隊ノ奮戦ハ敵企図抑止ニ資シ、所定行動概ネ整然タリ。',
        '我部隊ハ果敢ナル行動ヲ以テ敵ニ制肘ヲ加ヘ、戦局寄与ノ成果ヲ収メタリ。',
      ],
    },
    profile.enemyFrame === 'air_power' && {
      id: 'result-air-suppression',
      variants: [
        '来襲敵機群ニ打撃ヲ与ヘ、敵航空攻撃企図ヲ挫折セシメタリ。',
        '敵航空戦力ノ攻勢ヲ制シ、作戦主導権ヲ確保セリ。',
        '敵航空企図ヲ圧倒シ、局面ヲ有利ニ転ゼシメタリ。',
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'result-submarine-intercept',
      variants: [
        '対潜戦闘処置適切ニシテ、敵潜航兵力ヲ圧倒セリ。',
        '潜航敵部隊ニ打撃ヲ加ヘ、海面ノ安全確保ニ寄与セリ。',
        '敵潜水兵力ノ企図ヲ挫キ、所定行動ヲ継続セリ。',
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'result-crushing-blow',
      variants: [
        '我部隊ハ敵企図ヲ粉砕シ、赫々タル戦果ヲ収メタリ。',
        '我部隊ハ敵ニ壊滅的打撃ヲ与ヘ、戦局ヲ一挙ニ有利ナラシメタリ。',
        '我部隊ノ行動果敢ニシテ、交戦全般ヲ圧倒的優位ニ導ケリ。',
      ],
    },
    {
      id: 'result-mission-completion',
      variants: [
        '我部隊ハ主導権ヲ掌握シ、所定成果ノ保持ニ成功セリ。',
        '敵ニ対シ迅速果敢ナル攻撃ヲ実施シ、所定行動概ネ順調ナリ。',
        '我部隊ノ行動ハ沈着機敏ニシテ、各艦協同整斉タリ。',
      ],
    },
  ])
}

const buildStandardClosingFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
  seed: number,
) => {
  const mvpClause = buildMvpClause(context, seed, 'standard_bulletin:mvp')
  const leaderPrefix = context.mvpDisplay ? '{MVP}' : ''

  return uniqueFamilies<TextFamily>([
    context.kind === 'practice' && {
      id: 'closing-practice',
      variants: [
        '大本営ハ本演習成果ヲ嘉シ、益々ノ訓練錬成ヲ促スモノナリ。',
        '本演習ハ部隊練度ノ充実ヲ示スモノニシテ、将来ノ作戦遂行ニ資スル所大ナリ。',
        '大本営ハ本演習ニ示サレタル統制ノ緊密ニ着目シ、今後ノ精進ヲ期スルモノナリ。',
      ],
    },
    profile.officialOutcome === 'claimed_operational_success' && {
      id: 'closing-operational-success',
      variants: [
        `${leaderPrefix}大本営ハ本行動ニ於ケル作戦成果確保ヲ重視シ、次段行動ノ完遂ヲ期スルモノナリ。`,
        `${leaderPrefix}本行動ハ戦局推移ニ資スル成果顕著ニシテ、爾後ノ作戦発展ニ資スルモノト認ム。`,
        `${leaderPrefix}大本営ハ本交戦ニ示サレタル統制保持ヲ嘉シ、後続作戦ニ期待ヲ寄スルモノナリ。`,
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'closing-battlefield-contribution',
      variants: [
        `${leaderPrefix}大本営ハ本行動ニ於ケル敢闘ノ成果ヲ嘉シ、戦局進展ニ資スル所大ナリトス。`,
        `${leaderPrefix}本戦果ハ各隊奮励ノ賜ニシテ、爾後ノ作戦ニ寄与スル所少カラズ。`,
        `${leaderPrefix}大本営ハ本戦闘ノ成果ヲ録シ、更ナル作戦発展ニ期待ヲ寄スルモノナリ。`,
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'closing-crushing-blow',
      variants: [
        `${leaderPrefix}大本営ハ本戦果ヲ高ク評価シ、其武勲ヲ広ク布告セシムルモノナリ。`,
        `${leaderPrefix}本戦果ハ平素ノ錬成ト敢闘ノ賜ニシテ、戦局ノ進展ニ寄与スル所大ナリ。`,
        `${leaderPrefix}大本営ハ本戦闘ノ成果ヲ重視シ、今後ノ作戦遂行ニ一層ノ期待ヲ寄スルモノナリ。`,
      ],
    },
    {
      id: 'closing-public-merit',
      variants: [
        `${leaderPrefix}大本営ハ本行動ニ於ケル部隊ノ戦果ヲ録シ、其成果ヲ広ク公表スルモノナリ。`,
        `${leaderPrefix}本成果ハ平素ノ錬成ノ賜ニシテ、戦局ノ進展ニ寄与スル所大ナリ。`,
        `${leaderPrefix}大本営ハ本行動ノ成果ヲ重視シ、今後ノ作戦遂行ニ期待ヲ寄スルモノナリ。`,
      ],
    },
  ]).map((family) => ({
    ...family,
    variants: family.variants.map((variant) => variant.replace('{MVP}', mvpClause)),
  }))
}

const buildShortHeadlineFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
  highGlory: boolean,
  focus: PublicClaimFocus = 'generic',
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'short-headline-practice',
        variants: [
          '演習部隊、対抗演習ヲ完遂',
          '演習部隊、優勢裡ニ課目終了',
          '対抗演習、部隊統制良好',
        ],
      },
    ])
  }

  if (highGlory) {
    if (focus === 'enemy_flagship_sunk') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-enemy-flagship-high-glory',
          variants: [
            `${context.operationPhrase}方面、敵旗艦撃沈`,
            `${context.operationPhrase}方面交戦、敵戦列潰乱`,
            `${context.operationPhrase}方面戦況、敵指揮中枢覆滅`,
          ],
        },
      ])
    }

    if (focus === 'carrier_air_loss') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-carrier-high-glory',
          variants: [
            `${context.operationPhrase}方面、敵航空兵力壊滅`,
            `${context.operationPhrase}方面交戦、敵母艦群沈黙`,
            `${context.operationPhrase}方面戦況、敵艦載機海没`,
          ],
        },
      ])
    }

    if (focus === 'transport') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-transport-high-glory-focused',
          variants: [
            `${context.operationPhrase}方面、敵輸送企図ヲ粉砕`,
            `${context.operationPhrase}方面交戦、敵輸送作戦ヲ破砕`,
            `${context.operationPhrase}方面戦況、上陸企図潰ユ`,
          ],
        },
      ])
    }

    if (focus === 'anti_submarine') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-anti-submarine-high-glory-focused',
          variants: [
            `${context.operationPhrase}方面対潜戦、敵潜水兵力ヲ撃摧`,
            `${context.operationPhrase}方面交戦、敵潜航企図ヲ粉砕`,
            `${context.operationPhrase}方面戦況、対潜戦果顕著`,
          ],
        },
      ])
    }

    if (focus === 'submarine_force') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-submarine-high-glory-focused',
          variants: [
            `${context.operationPhrase}方面作戦、敵潜水兵力ヲ撃摧`,
            `${context.operationPhrase}方面交戦、敵潜航企図ヲ粉砕`,
            `${context.operationPhrase}方面戦況、敵潜水兵力潰ユ`,
          ],
        },
      ])
    }

    if (focus === 'anti_air_numeric' || focus === 'air_power') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-air-high-glory-focused',
          variants: [
            `${context.operationPhrase}方面、敵航空攻勢ヲ粉砕`,
            `${context.operationPhrase}方面交戦、敵航空兵力ヲ覆滅`,
            `${context.operationPhrase}方面戦況、敵機群壊滅`,
          ],
        },
      ])
    }

    if (focus === 'main_force') {
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-headline-main-force-high-glory-focused',
          variants: [
            `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
            `${context.operationPhrase}方面、敵主力圧倒`,
            `${context.operationPhrase}方面戦況、敵主力挫折`,
          ],
        },
      ])
    }

    return uniqueFamilies<TextFamily>([
      context.enemyCategory === 'air_power' && {
        id: 'short-headline-air-high-glory',
        variants: [
          `${context.operationPhrase}方面、敵航空攻勢ヲ粉砕`,
          `${context.operationPhrase}方面交戦、敵航空兵力ヲ覆滅`,
          `${context.operationPhrase}方面戦況、敵機群壊滅`,
        ],
      },
      context.enemyCategory === 'transport_group' && {
        id: 'short-headline-transport-high-glory',
        variants: [
          `${context.operationPhrase}方面、敵輸送企図ヲ粉砕`,
          `${context.operationPhrase}方面交戦、敵輸送作戦ヲ破砕`,
          `${context.operationPhrase}方面戦況、上陸企図潰ユ`,
        ],
      },
      context.enemyCategory === 'main_force' && {
        id: 'short-headline-main-force-high-glory',
        variants: [
          `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
          `${context.operationPhrase}方面、敵主力圧倒`,
          `${context.operationPhrase}方面戦況、敵主力挫折`,
        ],
      },
      {
        id: 'short-headline-general-high-glory',
        variants: [
          `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
          `${context.operationPhrase}方面、敵企図ヲ粉砕`,
          `${context.operationPhrase}方面戦況、戦果顕著`,
        ],
      },
    ])
  }

  if (profile.officialOutcome === 'claimed_crushing_blow') {
    return uniqueFamilies<TextFamily>([
      profile.enemyFrame === 'air_power' && {
        id: 'short-headline-air-crushing',
        variants: [
          `${context.operationPhrase}方面、敵航空攻勢ヲ粉砕`,
          `${context.operationPhrase}方面交戦、敵航空兵力ヲ圧倒`,
          `${context.operationPhrase}方面戦況、敵航空企図ヲ覆滅`,
        ],
      },
      profile.enemyFrame === 'submarine_force' && {
        id: 'short-headline-submarine-crushing',
        variants: [
          `${context.operationPhrase}方面、敵潜航企図ヲ粉砕`,
          `${context.operationPhrase}方面交戦、潜航敵部隊ヲ圧倒`,
          `${context.operationPhrase}方面戦況、敵潜水兵力ヲ圧倒`,
        ],
      },
      {
        id: 'short-headline-crushing-blow',
        variants: [
          `${context.operationPhrase}方面、敵企図ヲ粉砕`,
          `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
          `${context.operationPhrase}方面戦況、敵主力ヲ圧倒`,
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.enemyFrame === 'air_power' && {
      id: 'short-headline-air',
      variants: [
        `${context.operationPhrase}方面、敵航空兵力ヲ痛撃`,
        `${context.operationPhrase}方面交戦、敵航空攻勢ヲ覆滅`,
        `${context.operationPhrase}方面戦況、敵航空企図ヲ粉砕`,
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'short-headline-submarine',
      variants: [
        `${context.operationPhrase}方面、敵潜水兵力ヲ圧倒`,
        `${context.operationPhrase}方面交戦、潜航敵部隊ヲ制圧`,
        `${context.operationPhrase}方面戦況、敵潜航企図ヲ粉砕`,
      ],
    },
    {
      id: 'short-headline-general',
      variants: [
        `${context.operationPhrase}方面、作戦成果顕著`,
        `${context.operationPhrase}方面交戦、戦果ヲ拡張`,
        `${context.operationPhrase}方面戦況、敵ニ打撃`,
      ],
    },
  ])
}

const buildHighGloryShortPrimaryFamilies = (
  context: ReportRenderContext,
  focus: PublicClaimFocus,
) => {
  switch (focus) {
    case 'enemy_flagship_sunk':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-enemy-flagship',
          variants: [
            '敵旗艦撃沈、敵戦列潰乱セリ。',
            '敵旗艦ヲ覆滅シ戦果顕著。',
            '敵指揮中枢撃摧、赫々タル戦果ヲ収ム。',
          ],
        },
      ])
    case 'carrier_air_loss':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-carrier-air-loss',
          variants: [
            '敵航空兵力壊滅、母艦群既ニ沈黙。',
            '敵母艦群沈黙、戦果顕著。',
            '敵航空戦力潰滅、赫々タル戦果ヲ収ム。',
          ],
        },
      ])
    case 'transport':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-transport',
          variants: [
            '敵輸送企図ヲ粉砕セリ。',
            '敵上陸企図ヲ阻止セリ。',
            '敵輸送作戦ヲ挫折セシメタリ。',
          ],
        },
      ])
    case 'anti_submarine':
    case 'submarine_force':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-submarine',
          variants: [
            '敵潜水兵力ニ大ナル戦果ヲ収メタリ。',
            '敵潜水兵力ヲ撃摧セリ。',
            '敵潜航兵力ニ壊滅的打撃ヲ与ヘタリ。',
          ],
        },
      ])
    case 'anti_air_numeric':
    case 'air_power':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-air-power',
          variants: [
            '敵航空攻勢ヲ潰滅セシメタリ。',
            '敵航空兵力ヲ撃滅セリ。',
            '赫々タル防空戦果ヲ収メタリ。',
          ],
        },
      ])
    case 'main_force':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-main-force',
          variants: [
            '敵主力ニ大打撃ヲ与ヘタリ。',
            '赫々タル戦果ヲ収メタリ。',
            '敵主力圧倒、戦果顕著。',
          ],
        },
      ])
    case 'generic':
    default:
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-primary-generic',
          variants: [
            '敵部隊ニ大打撃ヲ与ヘタリ。',
            '赫々タル戦果ヲ収メタリ。',
            '敵企図空シク潰ユ。',
          ],
        },
      ])
  }
}

const buildHighGloryShortSecondaryFamilies = (
  _context: ReportRenderContext,
  focus: PublicClaimFocus,
) => {
  switch (focus) {
    case 'enemy_flagship_sunk':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-enemy-flagship',
          variants: [
            '敵主力企図ヲ粉砕セシメタリ。',
            '敵戦列混乱、戦機我ニ帰ス。',
            '敵主力挫折、戦果顕著。',
          ],
        },
      ])
    case 'carrier_air_loss':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-carrier-air-loss',
          variants: [
            '敵主力挫折、戦機我ニ帰ス。',
            '敵企図ヲ粉砕セシメタリ。',
            '赫々タル戦果、戦局ニ資ス。',
          ],
        },
      ])
    case 'transport':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-transport',
          variants: [
            '敵主力挫折、上陸企図空シク潰ユ。',
            '敵部隊ニ大打撃ヲ与ヘタリ。',
            '戦果顕著、敵企図ヲ粉砕セシメタリ。',
          ],
        },
      ])
    case 'anti_submarine':
    case 'submarine_force':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-submarine',
          variants: [
            '敵潜航企図ヲ粉砕セシメタリ。',
            '敵潜航企図空シク潰ユ。',
            '敵潜水兵力挫折、我作戦成ル。',
          ],
        },
      ])
    case 'anti_air_numeric':
    case 'air_power':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-air-power',
          variants: [
            '敵主力挫折、戦果顕著。',
            '敵企図ヲ粉砕セシメタリ。',
            '敵部隊ニ大打撃ヲ与ヘタリ。',
          ],
        },
      ])
    case 'main_force':
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-main-force',
          variants: [
            '敵企図ヲ粉砕セシメタリ。',
            '敵主力挫折、戦果顕著。',
            '殲滅的打撃ヲ與ヘタリ。',
          ],
        },
      ])
    case 'generic':
    default:
      return uniqueFamilies<TextFamily>([
        {
          id: 'short-secondary-generic',
          variants: [
            '敵企図ヲ粉砕セシメタリ。',
            '敵部隊ニ大打撃ヲ加ヘタリ。',
            '戦果顕著ナリ。',
          ],
        },
      ])
    }
}

const selectHighGloryShortThirdBullet = (
  focus: PublicClaimFocus,
  carrierAirLossBullet: string,
  antiAirBullet: string,
  antiAirSupportBullet: string,
  antiSubmarineBullet: string,
  closingBullet: string,
) => {
  if (focus !== 'carrier_air_loss' && carrierAirLossBullet) {
    return carrierAirLossBullet
  }

  if (focus === 'anti_submarine' && antiSubmarineBullet) {
    return antiSubmarineBullet
  }

  if (focus === 'anti_air_numeric' || focus === 'air_power') {
    if (antiAirBullet) {
      return antiAirBullet
    }
  } else if (antiAirSupportBullet) {
    return antiAirSupportBullet
  } else if (antiAirBullet) {
    return antiAirBullet
  }

  if (antiSubmarineBullet) {
    return antiSubmarineBullet
  }

  return closingBullet
}

const buildShortOpeningFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'short-opening-practice',
        variants: [
          `帝国海軍演習部隊ハ、${toJapaneseDate(
            context.occurredAt,
          )}、${context.practiceOpponent ?? '対抗部隊'}ト演習ヲ実施シ所定課目ヲ了セリ。`,
          `帝国海軍演習部隊ハ、対抗演習ニ於テ沈着機敏ナル行動ヲ示セリ。`,
          `帝国海軍演習部隊ノ行動ハ的確ニシテ、演習成果良好ナリ。`,
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.enemyFrame === 'air_power' && profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'short-opening-air-crushing',
      variants: [
        `帝国海軍出撃部隊ハ、${toJapaneseDate(
          context.occurredAt,
        )}、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト交戦、敵航空攻勢ヲ覆滅セシメタリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面交戦ニ於テ敵航空戦力ヲ圧倒セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ来襲敵機群ヲ痛撃シ戦果ヲ拡張セリ。`,
      ],
    },
    profile.enemyFrame === 'submarine_force' && profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'short-opening-submarine-crushing',
      variants: [
        `帝国海軍出撃部隊ハ、${toJapaneseDate(
          context.occurredAt,
        )}、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト交戦、敵潜航企図ヲ粉砕セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面交戦ニ於テ敵潜航兵力ヲ圧倒セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ敵潜水兵力ニ壊滅的打撃ヲ与ヘタリ。`,
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'short-opening-crushing',
      variants: [
        `帝国海軍出撃部隊ハ、${toJapaneseDate(
          context.occurredAt,
        )}、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト交戦、敵企図ヲ粉砕シ戦果ヲ拡張セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル交戦ニ於テ主導権ヲ掌握シ、赫々タル戦果ヲ収メタリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面行動中、${buildPublicEncounterObject(
          profile,
        )}ニ壊滅的打撃ヲ与ヘタリ。`,
      ],
    },
    {
      id: 'short-opening-general',
      variants: [
        `帝国海軍出撃部隊ハ、${toJapaneseDate(
          context.occurredAt,
        )}、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
          profile,
        )}ト交戦、作戦成果ヲ収メタリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於ケル交戦ニ於テ主導権ヲ掌握セリ。`,
        `帝国海軍出撃部隊ハ、${context.operationPhrase}方面行動中、${buildPublicEncounterObject(
          profile,
        )}ニ打撃ヲ与ヘタリ。`,
      ],
    },
  ])
}

const buildShortClosingFamilies = (
  context: ReportRenderContext,
  profile: PublicPropagandaProfile,
  seed: number,
) => {
  const mvpClause = buildMvpClause(context, seed, 'short_bulletin:mvp')
  const leaderPrefix = context.mvpDisplay ? '{MVP}' : ''

  return uniqueFamilies<TextFamily>([
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'short-closing-crushing',
      variants: [
        `${leaderPrefix}本戦果ヲ録ス。`,
        `${leaderPrefix}偉功ニ対シ慶祝ノ意ヲ表ス。`,
        `${leaderPrefix}右、発表ス。`,
      ],
    },
    {
      id: 'short-closing-general',
      variants: [
        `${leaderPrefix}本成果ヲ録ス。`,
        `${leaderPrefix}右、発表ス。`,
        `${leaderPrefix}一層ノ健闘ヲ祈ル。`,
      ],
    },
  ]).map((family) => ({
    ...family,
    variants: family.variants.map((variant) => variant.replace('{MVP}', mvpClause)),
  }))
}

const buildFormalHeading = (context: ReportRenderContext) => {
  const title = context.kind === 'practice' ? '演習詳報' : '戦闘詳報'
  const place = context.kind === 'practice' ? '於 演習海域' : `於 ${context.operationPhrase}`
  return [title, toJapaneseDate(context.occurredAt), place].join('\n')
}

const buildFormalSubject = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '件名：対抗演習実施詳報'
  }

  if (isAnyFailedSortie(context)) {
    return `件名：${context.operationPhrase}ニ於ケル${context.enemyDisplay}交戦並帰投経過報告`
  }

  return `件名：${context.operationPhrase}ニ於ケル${context.enemyDisplay}交戦詳報`
}

const buildFormalEnemySummary = (
  battle: BattleNodeCapture | BattleCapture,
  context: ReportRenderContext,
  profile: FormalObservationProfile,
) => {
  const enemyDeck = battle.enemyDeckNameRaw?.trim()
  const observedEnemyShips = battle.enemyShipNamesRaw.filter(Boolean)
  const enemyShips = observedEnemyShips.slice(0, profile.enemyShipLimit)
  const enemyLine = enemyDeck || buildEncounterObject(context)

  if (profile.enemyShipLimit === 0 || enemyShips.length === 0) {
    return `${enemyLine}。個艦細目未詳。`
  }

  return `${enemyLine}。確認艦種 ${enemyShips.join('、')}${observedEnemyShips.length > enemyShips.length ? ' 他' : ''}。`
}

const parseNodeNumber = (battle: BattleNodeCapture) => {
  const rawNumber = battle.nodeLabel?.match(/(\d+)/)?.[1]
  const value = rawNumber ? Number(rawNumber) : null
  return value && value > 0 ? value : null
}

const buildFormalNodeLabel = (battle: BattleNodeCapture, index: number) => {
  const nodeNumber = parseNodeNumber(battle) ?? index + 1
  return `【第${toFormalKansuji(nodeNumber)}交戦点】`
}

const buildFormalMissionOverviewFamilies = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'formal-mission-practice',
        variants: [
          '対抗演習ヲ実施シ所定課目ヲ了ス。',
          '対抗演習ヲ実施、予定行動ヲ完遂。',
          '対抗演習ニ於ケル所定ノ課目ヲ終了。',
        ],
      },
    ])
  }

  if (isAnyFailedSortie(context)) {
    return uniqueFamilies<TextFamily>([
      {
        id: 'formal-mission-withdrawal',
        variants: [
          '敵ト交戦ノ後、部隊保全ヲ優先シ帰投。',
          '敵ト交戦、損傷艦保全ノ為帰投。',
          '交戦後、状況ヲ勘案シ反転帰投。',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    {
      id: 'formal-mission-complete',
      variants: [
        '敵ト交戦ノ後、所定任務ヲ完遂。',
        '敵ト交戦、作戦所期目的達成ニ資ス。',
        '交戦後、予定行動ヲ了シ帰投。',
      ],
    },
  ])
}

const buildFormalEnemySummaryFamilies = () =>
  uniqueFamilies<TextFamily>([
    {
      id: 'formal-enemy-summary-canonical',
      variants: ['敵情総括'],
    },
  ])

const buildFormalEngagementFamilies = (profile: FormalObservationProfile) =>
  [
    profile.id === 'surveyed' && {
      id: 'formal-engagement-surveyed',
      airVariants: [
        '航空攻撃下ニ接敵、対空戦闘ヲ実施。経過概ネ判明。',
        '敵航空兵力ト交戦、各艦協同シ之ニ対処。',
        '航空関係ヲ伴フ交戦実施。主要経過概ネ判明。',
      ],
      surfaceVariants: [
        '敵部隊ト接触、砲雷戦ヲ実施。主要経過概ネ判明。',
        '水上交戦ヲ実施、各艦協同シ之ニ対処。',
        '通常水上戦闘ヲ実施。戦闘経過概ネ判明。',
      ],
    },
    profile.id === 'field_summary' && {
      id: 'formal-engagement-contact',
      airVariants: [
        '水上及航空協同ノ下ニ交戦。細目未詳。',
        '航空情況下ニ接敵、交戦継続。細目未詳。',
        '敵部隊ト接触、航空関係ヲ伴ヒ交戦。細目未詳。',
      ],
      surfaceVariants: [
        '敵前衛部隊ト接触、水上交戦実施。細目未詳。',
        '敵部隊ト接触、交戦継続。砲雷戦細目未詳。',
        '通常水上交戦。細目未詳。',
      ],
    },
    profile.id === 'fragmentary' && {
      id: 'formal-engagement-brief',
      airVariants: [
        '航空関係細目未詳。砲雷戦経過概略把握ニ止マル。',
        '航空関係ヲ伴フ交戦。砲雷戦細目未詳。',
        '航空情況下ノ交戦経過、概略把握ニ止マル。',
      ],
      surfaceVariants: [
        '砲雷戦経過概略把握ニ止マル。',
        '交戦継続。砲雷戦細目未詳。',
        '水上交戦経過、概略把握ニ止マル。',
      ],
    },
    profile.id === 'field_summary' && {
      id: 'formal-engagement-orderly',
      airVariants: [
        '航空関係ヲ伴フ交戦実施。処置概ネ整然、細目未詳。',
        '航空情況下ニ於ケル交戦。経過概略整然タリ。',
        '航空関与ノ下ニ交戦。記録概略ニ止マル。',
      ],
      surfaceVariants: [
        '水上交戦実施。処置概ネ整然、細目未詳。',
        '敵部隊ト接触後、交戦経過概略整然タリ。',
        '通常交戦実施。記録概略ニ止マル。',
      ],
    },
  ].filter((family): family is FormalEngagementFamily => Boolean(family))

const buildFormalFindingsFamilies = (context: ReportRenderContext) =>
  uniqueFamilies<TextFamily>([
    isHeavyLossFailure(context) && {
      id: 'formal-findings-heavy-loss',
      variants: [
        '反転判断概ネ適切ナリ。',
        '部隊保全判断概ネ適切ナリ。',
        '損傷下ニ於ケル処置概ネ適切ナリ。',
      ],
    },
    isFailedRetreat(context) && {
      id: 'formal-findings-withdrawal',
      variants: [
        '離脱判断概ネ適切ナリ。',
        '部隊保全処置概ネ適切ナリ。',
        '反転時機概ネ適切ナリ。',
      ],
    },
    context.kind === 'practice' && {
      id: 'formal-findings-practice',
      variants: [
        '処置概ネ適切ナリ。',
        '演習統制概ネ適切ナリ。',
        '各艦行動概ネ適切ナリ。',
      ],
    },
    context.enemyCategory === 'submarine_force' && {
      id: 'formal-findings-submarine',
      variants: [
        '対潜戦闘処置、任務達成ニ資ス。',
        '対潜戦闘処置概ネ適切ナリ。',
        '対潜方面ノ処置良好ナリ。',
      ],
    },
    context.nodeCount > 1 && {
      id: 'formal-findings-cohesion',
      variants: [
        '統制保持概ネ適切ナリ。',
        '各艦協同整斉ナリ。',
        '部隊運動概ネ整然タリ。',
      ],
    },
    {
      id: 'formal-findings-initial-response',
      variants: [
        '初動概ネ適切ナリ。',
        '諸般処置概ネ適切ナリ。',
        '部隊行動概ネ適切ナリ。',
      ],
    },
  ])

type FormalDamageCategory = 'heavy' | 'moderate' | 'light'

const formatFormalDamageCount = (
  count: number,
  category: FormalDamageCategory,
  profile: FormalObservationProfile,
) => {
  if (count <= 0) {
    return 'ナシ'
  }
  if (count === 1) {
    return '一隻'
  }
  if (profile.damageCountMode === 'exact') {
    return `${toFormalKansuji(count)}隻`
  }
  if (count >= 4) {
    return '多数'
  }
  if (
    profile.damageCountMode === 'salience' &&
    (category === 'heavy' || (category === 'moderate' && count <= 2))
  ) {
    return `${toFormalKansuji(count)}隻`
  }
  return profile.pluralDamageLabel
}

const buildFormalDamageDetail = (
  context: ReportRenderContext,
  profile: FormalObservationProfile,
) => {
  const entries = context.friendlyFleet
    .map((ship) => ({
      ship,
      state: getDamageStateLabel(ship),
    }))
    .filter(({ ship, state }) =>
      context.kind === 'practice'
        ? ship.endHp != null && ship.endHp < ship.startHp
        : state != null,
    )
    .map(({ ship, state }) =>
      `${normalizeFriendlyReportName(ship.nameJa)}${state ? `(${state})` : ''}`,
    )

  if (entries.length === 0) {
    return sanitizeDamageDetail(context.damageDetail)
  }

  const visible = entries.slice(0, profile.damageDetailLimit)
  if (profile.id === 'fragmentary') {
    return `主要損傷艦 ${visible.join('、')}。損傷細目整理中。`
  }

  return `${visible.join('、')}${entries.length > visible.length ? ' 他' : ''}`
}

const buildFormalDamageSummaryLines = (
  context: ReportRenderContext,
  profile: FormalObservationProfile,
  sectionLabel = '六',
) => {
  if (context.damageSeverity === 'unknown') {
    return [`${sectionLabel}、被害。`, '　我方損害　細目未詳。判明次第後報ス。']
  }

  if (context.damageSeverity === 'none') {
    return [`${sectionLabel}、被害。`, '　我方損害ナシ。各艦航行並戦闘能力ニ著変ナシ。']
  }

  const lightDamageCount =
    context.damagedShipCount - context.heavyDamageCount - context.moderateDamageCount

  return [
    `${sectionLabel}、被害。`,
    `　大破艦　${formatFormalDamageCount(context.heavyDamageCount, 'heavy', profile)}`,
    `　中破艦　${formatFormalDamageCount(context.moderateDamageCount, 'moderate', profile)}`,
    `　軽微損傷艦　${formatFormalDamageCount(Math.max(0, lightDamageCount), 'light', profile)}`,
    `　摘要　${buildFormalDamageDetail(context, profile)}`,
  ]
}

const buildFormalFindings = (
  context: ReportRenderContext,
  familyText: string,
  truthSource: WarReportTruthSource | null = null,
) => {
  const lines = [`　${familyText}`]
  const credit = selectDistinguishedCredit(context, truthSource)
  const distinguishedLine = credit
    ? credit.basis === 'combined_specialist'
      ? `　戦闘後判定ニ於テ「${credit.shipName}」防空並対潜戦果顕著、殊勲艦ト認定。`
      : credit.basis === 'anti_air_high'
        ? `　戦闘後判定ニ於テ「${credit.shipName}」防空戦果顕著、殊勲艦ト認定。`
        : credit.basis === 'anti_submarine_high'
          ? `　戦闘後判定ニ於テ「${credit.shipName}」対潜戦果顕著、殊勲艦ト認定。`
          : credit.basis === 'anti_air'
            ? `　戦闘後判定ニ於テ「${credit.shipName}」防空戦闘功アリ、殊勲艦ト認定。`
            : credit.basis === 'anti_submarine'
              ? `　戦闘後判定ニ於テ「${credit.shipName}」対潜戦闘功アリ、殊勲艦ト認定。`
              : `　戦闘後判定ニ於テ「${credit.shipName}」殊勲艦ト認定。`
    : ''

  if (distinguishedLine) {
    lines.push(distinguishedLine)
  }

  return lines.slice(0, 2)
}

const buildFormalEngagementOverview = (
  battle: BattleNodeCapture,
  index: number,
  family: FormalEngagementFamily,
  seed: number,
) => {
  const mode = battle.sawAirAttack ? 'air' : 'surface'
  const variants = battle.sawAirAttack ? family.airVariants : family.surfaceVariants
  if (variants.length === 0) {
    return ''
  }

  const start = mixSeed(seed, `formal_after_action:engagementOverview:${family.id}:${mode}`)
  return variants[(start + index) % variants.length]!
}

const buildFormalResultSentenceFromRank = (
  battle: BattleNodeCapture,
  index: number,
  seed: number,
) => {
  const slot = `formal_after_action:nodeResult:${battle.winRank ?? 'unknown'}:${parseNodeNumber(
    battle,
  ) ?? index + 1}`

  if (battle.winRank === 'S') {
    return pickVariant(seed, slot, [
      '敵ニ甚大ナル打撃ヲ与ヘ、我行動概ネ所期ノ通リ。',
      '敵ニ大打撃ヲ与ヘ、交戦経過概ネ順調ナリ。',
      '敵ニ有効ナル打撃ヲ累加シ、所定行動概ネ支障ナシ。',
    ])
  }

  if (battle.winRank === 'A') {
    return pickVariant(seed, slot, [
      '敵ニ有効打撃ヲ与ヘ、所定行動ヲ完遂。',
      '敵ニ打撃ヲ与ヘ、我任務行動概ネ順調ナリ。',
      '敵ニ打撃ヲ与ヘ、交戦目的ニ照ラシ概ネ良好ナリ。',
    ])
  }

  if (battle.winRank === 'B') {
    return pickVariant(seed, slot, [
      '敵ニ打撃ヲ与ヘ、交戦目的ニ資ス。',
      '敵ニ相応ノ打撃ヲ与ヘ、所定行動継続ニ資ス。',
      '敵ニ打撃ヲ与フルモ、戦果細目ハ更ニ精査ヲ要ス。',
    ])
  }

  if (battle.winRank === 'C' || battle.winRank === 'D' || battle.winRank === 'E') {
    return pickVariant(seed, slot, [
      '敵ト交戦、戦果並被害ノ精査ヲ要ス。',
      '敵ト交戦、戦果判明尚早ナリ。',
      '敵ト交戦、交戦結果ニ付更ナル検討ヲ要ス。',
    ])
  }

  return pickVariant(seed, slot, [
    '敵ト交戦、戦果並被害ノ精査ヲ要ス。',
    '敵ト交戦、交戦結果細目未詳。',
    '敵ト交戦、経過概略ノ把握ニ止マル。',
  ])
}

const buildFormalOverallResultSentence = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '対抗演習ヲ実施、所定課目ヲ了ス。'
  }

  if (context.failureMode === 'failed_with_heavy_losses') {
    return '敵ト交戦後、損害増大ニ依リ戦場ヲ離脱。'
  }

  if (context.failureMode === 'failed_with_retreat') {
    return '敵ニ打撃ヲ加フルモ、部隊保全ノ為反転。'
  }

  if (context.resultCategory === 'decisive_success' || context.winRank === 'S') {
    return '敵ニ甚大ナル打撃ヲ与ヘ、我行動概ネ所期ノ通リ。'
  }

  if (context.resultCategory === 'success' || context.winRank === 'A') {
    return '敵ニ有効打撃ヲ与ヘ、所定行動ヲ完遂。'
  }

  if (context.resultCategory === 'partial_success' || context.winRank === 'B') {
    return '敵ニ打撃ヲ与ヘ、交戦目的ニ資ス。'
  }

  return '敵ト交戦、戦果並被害ノ精査ヲ要ス。'
}

const buildFormalActionSummary = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '対抗演習ヲ実施、所定課目ヲ了ス。'
  }

  if (isAnyFailedSortie(context)) {
    return `${buildEncounterObject(context)}ニ対シ交戦行動ヲ実施。`
  }

  return `${buildEncounterObject(context)}ニ対シ所定ノ戦闘行動ヲ実施。`
}

const buildFormalOwnDamageSentence = (
  battle: BattleNodeCapture,
  context: ReportRenderContext,
  index: number,
  seed: number,
  profile: FormalObservationProfile,
) => {
  if (battle.damageSummary.severity === 'unknown') {
    return profile.nodeDamageMode === 'deferred'
      ? '被害細目後報。'
      : '被害ノ有無、目下確認中。'
  }

  if (battle.damageSummary.severity !== 'none') {
    if (profile.nodeDamageMode === 'observed') {
      return sanitizeDamageDetail(battle.damageSummary.detail)
    }
    if (profile.nodeDamageMode === 'summary') {
      return battle.damageSummary.severity === 'light'
        ? '軽微損傷艦アリ。節別判定未詳。'
        : '被害アリ。節別判定未詳。'
    }
    return '損傷細目後報。'
  }

  if (hasNonTrivialDamage(context)) {
    if (context.nodeCount <= 1 && profile.nodeDamageMode === 'observed') {
      return sanitizeDamageDetail(context.damageDetail)
    }

    if (profile.nodeDamageMode === 'deferred') {
      return context.damageSeverity === 'light' ? '軽度損傷アリ。細目後報。' : '被害細目後報。'
    }

    return pickVariant(
      seed,
      `formal_after_action:nodeDamage:uncertain:${parseNodeNumber(battle) ?? index + 1}`,
      context.damageSeverity === 'light'
        ? [
            '軽微損傷艦アリ。交戦点別細目未詳。',
            '軽微損傷認ム。節別判定未詳。',
            '損傷艦アリ。交戦点別細目未詳。',
            '軽度損傷アリ。細目後報。',
          ]
        : [
            '損傷艦アリ。交戦点別細目未詳。',
            '被害アリ。節別判定未詳。',
            '損傷細目後報。',
            '被害細目後報。',
          ],
    )
  }

  if (profile.nodeDamageMode === 'deferred') {
    return '現在迄被害報告ナシ。'
  }

  return pickVariant(
    seed,
    `formal_after_action:nodeDamage:none:${parseNodeNumber(battle) ?? index + 1}`,
    ['被害認メズ。', '我方損害ナシ。', '損傷艦ヲ認メズ。'],
  )
}

const buildFormalNodeLines = (
  battle: BattleNodeCapture,
  index: number,
  context: ReportRenderContext,
  engagementFamily: FormalEngagementFamily,
  seed: number,
  profile: FormalObservationProfile,
) => {
  const lines = [
    buildFormalNodeLabel(battle, index),
    `　交戦時刻　${toJapaneseTime(battle.occurredAt)}`,
    `　敵情　${buildFormalEnemySummary(battle, context, profile)}`,
    `　交戦結果　${buildFormalResultSentenceFromRank(battle, index, seed)}`,
    `　交戦概要　${buildFormalEngagementOverview(battle, index, engagementFamily, seed)}`,
    `　我方被害　${buildFormalOwnDamageSentence(battle, context, index, seed, profile)}`,
  ]

  const antiAirSentence = buildFormalAntiAirSentence(battle, profile, seed, index)
  if (antiAirSentence) {
    lines.push(antiAirSentence)
  }
  lines.push(...buildFormalAntiSubmarineSentences(battle, profile))
  const enemyFlagshipSunkSentence = buildFormalEnemyFlagshipSunkSentence(battle, profile)
  if (enemyFlagshipSunkSentence) {
    lines.push(enemyFlagshipSunkSentence)
  }

  return lines
}

const buildFormalPracticeBody = (
  context: ReportRenderContext,
  truthSource: BattleCapture | null,
  addressSnapshot: AddressSnapshot,
  missionOverview: string,
  enemySummaryLabel: string,
  findingsText: string,
  profile: FormalObservationProfile,
) => {
  const source = truthSource
  const enemySummary = source
    ? buildFormalEnemySummary(source, context, profile)
    : '対抗部隊細目未詳。'
  const lines = [
    addressSnapshot.senderLine,
    addressSnapshot.recipientLine,
    '',
    buildFormalSubject(context),
    '',
    '一、任務概要。',
    `　${toJapaneseDate(context.occurredAt)}、対抗演習ヲ実施セリ。`,
    `　${missionOverview}`,
    '二、参加兵力。',
    `　${context.friendlySummary}。${buildFormalFlagshipListing(context)}。`,
    '三、敵情。',
    `　${enemySummaryLabel}　${enemySummary}`,
    '四、経過。',
    `　${context.practiceOpponent ?? '対抗部隊'}ト交戦。交戦結果　${buildFormalOverallResultSentence(context)}`,
    `　演習戦闘実施。砲雷戦細目未詳。`,
    ...buildFormalDamageSummaryLines(context, profile, '五'),
    '六、所見。',
    ...buildFormalFindings(context, findingsText),
    '',
    '以上',
  ]

  return lines.join('\n')
}

const buildFormalSortieBody = (
  context: ReportRenderContext,
  truthSource: WarReportTruthSource | null,
  addressSnapshot: AddressSnapshot,
  missionOverview: string,
  enemySummaryLabel: string,
  engagementFamily: FormalEngagementFamily,
  findingsText: string,
  seed: number,
  profile: FormalObservationProfile,
) => {
  const battles = truthSource?.kind === 'sortie' ? truthSource.sortie.battles : []
  const lines = [
    addressSnapshot.senderLine,
    addressSnapshot.recipientLine,
    '',
    buildFormalSubject(context),
    '',
    '一、任務概要。',
    `　${toJapaneseDate(context.occurredAt)}、${context.operationPhrase}方面ニ於テ行動。`,
    `　${missionOverview}`,
    '二、参加兵力。',
    `　${context.friendlySummary}。${buildFormalFlagshipListing(context)}。`,
    '三、敵情。',
    `　${enemySummaryLabel}　${buildEncounterObject(context)}。`,
    `　交戦点数　${toFormalKansuji(Math.max(context.nodeCount, 1))}。`,
    '四、戦闘経過。',
  ]

  if (battles.length === 0) {
    lines.push('　交戦細目未詳。')
  } else {
    battles.forEach((battle, index) => {
      lines.push(
        ...buildFormalNodeLines(battle, index, context, engagementFamily, seed, profile),
        '',
      )
    })
    if (lines.at(-1) === '') {
      lines.pop()
    }
  }

  lines.push('五、戦果。')
  lines.push(`　戦果総括　${buildFormalOverallResultSentence(context)}`)
  const carrierAirLossSentence = buildFormalCarrierAirLossSentence(truthSource, seed, profile)
  if (carrierAirLossSentence) {
    lines.push(carrierAirLossSentence)
  }
  lines.push(`　敵情総括　${buildEncounterObject(context)}。`)
  lines.push(`　行動総括　${buildFormalActionSummary(context)}`)
  lines.push(...buildFormalDamageSummaryLines(context, profile, '六'))
  lines.push('七、所見。')
  lines.push(...buildFormalFindings(context, findingsText, truthSource))
  lines.push('', '以上')

  return lines.join('\n')
}

const buildStandardBulletin = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const fingerprint = options.variantSeed ?? 0
  const tags = extractNarrativeTags(context)
  const mainNarrative = selectMainNarrative(context, tags, fingerprint)
  const propagandaProfile = buildPublicPropagandaProfile(context, 'standard_bulletin', fingerprint)
  const claimEvidence = buildPublicClaimEvidence(options.truthSource ?? null)
  const claimBoard = buildStandardClaimBoard(context, claimEvidence, fingerprint)
  const recentSelections = getRecentSelections(options, 'standard_bulletin')
  const slotFamilies: Record<string, string> = {}

  const headlineFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'headline',
    buildHistoricalStandardHeadlineFamilies(context, propagandaProfile, claimBoard),
    recentSelections,
    slotFamilies,
  )
  const subheadlineFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'subheadline',
    buildHistoricalStandardSubheadlineFamilies(context, propagandaProfile, claimBoard),
    recentSelections,
    slotFamilies,
  )
  const situationOpeningFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'initiative',
    buildPublicInitiativeFamilies(context, 'standard_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const damageClaimFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'damageClaim',
    buildPublicDamageClaimFamilies(context, 'standard_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const concealmentFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'concealment',
    buildPublicConcealmentFamilies('standard_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const closingFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'closing',
    buildPublicHeatedClosingFamilies(
      context,
      'standard_bulletin',
      propagandaProfile,
      fingerprint,
      options.truthSource ?? null,
    ),
    recentSelections,
    slotFamilies,
  )

  const shouldIncludeStandardConcealment =
    context.kind === 'practice'
      ? false
      : propagandaProfile.selfDamageConcealment === 'light'
        ? mixSeed(fingerprint, 'standard_bulletin:concealment-include') % 2 === 0
        : propagandaProfile.selfDamageConcealment === 'none'
          ? mixSeed(fingerprint, 'standard_bulletin:concealment-include') % 4 === 0
          : false

  const closingParagraphParts = [
    shouldIncludeStandardConcealment
      ? pickVariant(
          fingerprint,
          `standard_bulletin:concealment:${concealmentFamily?.id ?? 'fallback'}`,
          concealmentFamily?.variants ?? ['我軍態勢整然ナリ。'],
        )
      : '',
    pickVariant(
      fingerprint,
      `standard_bulletin:closing:${closingFamily?.id ?? 'fallback'}`,
      closingFamily?.variants ?? ['大本営海軍部ハ本行動ノ成果ヲ公表ス。'],
    ),
  ].filter(Boolean)

  const claimInventory = context.kind === 'sortie' ? buildStandardClaimInventory(claimBoard) : []

  const report: GeneratedWarReport = {
    bulletin: [
      '大本営海軍部発表',
      '',
      toJapaneseDate(context.occurredAt),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:headline:${headlineFamily?.id ?? 'fallback'}`,
        headlineFamily?.variants ?? [`${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`],
      ),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:subheadline:${subheadlineFamily?.id ?? 'fallback'}`,
        subheadlineFamily?.variants ?? ['作戦目的達成ニ資スル打撃ヲ与フ'],
      ),
    ].join('\n'),
    body: [
      pickVariant(
        fingerprint,
        `standard_bulletin:initiative:${situationOpeningFamily?.id ?? 'fallback'}`,
        situationOpeningFamily?.variants ?? [
          `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
            propagandaProfile,
          )}ト交戦セリ。`,
        ],
      ),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:damageClaim:${damageClaimFamily?.id ?? 'fallback'}`,
        damageClaimFamily?.variants ?? ['我部隊ハ主導権ヲ掌握シ、作戦目的達成ニ寄与セリ。'],
      ),
      ...(claimInventory.length > 0 ? ['', ...claimInventory] : []),
      '',
      buildPublicBodyLead(context, 'standard_bulletin', fingerprint),
      '',
      closingParagraphParts.join(' '),
    ].join('\n'),
    selectionSnapshot: buildSelectionSnapshot(
      'standard_bulletin',
      mainNarrative,
      fingerprint,
      slotFamilies,
    ),
  }

  return report
}

const buildShortBulletin = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const fingerprint = options.variantSeed ?? 0
  const tags = extractNarrativeTags(context)
  const mainNarrative = selectMainNarrative(context, tags, fingerprint)
  const propagandaProfile = buildPublicPropagandaProfile(context, 'short_bulletin', fingerprint)
  const claimEvidence = buildPublicClaimEvidence(options.truthSource ?? null)
  const highGloryShortMode = shouldUseHighGloryShortMode(context, claimEvidence)
  const claimFocus = selectPublicClaimFocus(context, claimEvidence)
  const recentSelections = getRecentSelections(options, 'short_bulletin')
  const slotFamilies: Record<string, string> = {}

  const headlineFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'headline',
    buildShortHeadlineFamilies(context, propagandaProfile, highGloryShortMode, claimFocus),
    recentSelections,
    slotFamilies,
  )
  const openingFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'initiative',
    buildPublicInitiativeFamilies(
      context,
      'short_bulletin',
      propagandaProfile,
      highGloryShortMode,
    ),
    recentSelections,
    slotFamilies,
  )
  const damageClaimFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'damageClaim',
    buildPublicDamageClaimFamilies(context, 'short_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const concealmentFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'concealment',
    buildPublicConcealmentFamilies('short_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const closingFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'closing',
    buildShortClosingFamilies(context, propagandaProfile, fingerprint),
    recentSelections,
    slotFamilies,
  )

  const antiAirBullet =
    context.kind === 'sortie' ? buildShortAntiAirBullet(options.truthSource ?? null) : ''
  const antiAirSupportBullet =
    context.kind === 'sortie'
      ? buildShortAntiAirSupportBullet(options.truthSource ?? null, context)
      : ''
  const antiSubmarineBullet =
    context.kind === 'sortie' ? buildShortAntiSubmarineBullet(options.truthSource ?? null) : ''
  const carrierAirLossBullet =
    context.kind === 'sortie'
      ? buildShortCarrierAirLossBullet(options.truthSource ?? null, fingerprint)
      : ''
  const enemyFlagshipSunkBullet =
    context.kind === 'sortie'
      ? buildShortEnemyFlagshipSunkBullet(options.truthSource ?? null)
      : ''

  const priorityThirdBullet =
    enemyFlagshipSunkBullet || carrierAirLossBullet || antiAirBullet || antiSubmarineBullet

  let bulletinLines: string[]

  if (highGloryShortMode) {
    const primaryFamily = selectFamily(
      fingerprint,
      'short_bulletin',
      'primaryClaim',
      buildHighGloryShortPrimaryFamilies(context, claimFocus),
      recentSelections,
      slotFamilies,
    )
    const secondaryFamily = selectFamily(
      fingerprint,
      'short_bulletin',
      'secondaryClaim',
      buildHighGloryShortSecondaryFamilies(context, claimFocus),
      recentSelections,
      slotFamilies,
    )
    const closingBullet = pickVariant(
      fingerprint,
      `short_bulletin:closing:${closingFamily?.id ?? 'fallback'}`,
      closingFamily?.variants ?? ['右、発表ス。'],
    )
    const primaryBullet =
      claimFocus === 'carrier_air_loss' && carrierAirLossBullet
        ? carrierAirLossBullet
        : pickVariant(
            fingerprint,
            `short_bulletin:primaryClaim:${primaryFamily?.id ?? 'fallback'}`,
            primaryFamily?.variants ?? ['敵部隊ニ大打撃ヲ与ヘタリ。'],
          )
    const thirdBullet =
      enemyFlagshipSunkBullet ||
      (claimFocus === 'carrier_air_loss'
        ? closingBullet
        : selectHighGloryShortThirdBullet(
            claimFocus,
            carrierAirLossBullet,
            antiAirBullet,
            antiAirSupportBullet,
            antiSubmarineBullet,
            closingBullet,
          ))

    bulletinLines = [
      primaryBullet,
      pickVariant(
        fingerprint,
        `short_bulletin:secondaryClaim:${secondaryFamily?.id ?? 'fallback'}`,
        secondaryFamily?.variants ?? ['敵企図ヲ粉砕セシメタリ。'],
      ),
      thirdBullet,
    ].filter(Boolean)
  } else {
    bulletinLines = priorityThirdBullet
      ? [
          pickVariant(
            fingerprint,
            `short_bulletin:initiative:${openingFamily?.id ?? 'fallback'}`,
            openingFamily?.variants ?? ['我軍、攻撃ヲ開始セリ。'],
          ),
          pickVariant(
            fingerprint,
            `short_bulletin:damageClaim:${damageClaimFamily?.id ?? 'fallback'}`,
            damageClaimFamily?.variants ?? ['敵企図ヲ挫折セシメタリ。'],
          ),
          priorityThirdBullet,
        ]
      : [
          pickVariant(
            fingerprint,
            `short_bulletin:initiative:${openingFamily?.id ?? 'fallback'}`,
            openingFamily?.variants ?? ['我軍、攻撃ヲ開始セリ。'],
          ),
          pickVariant(
            fingerprint,
            `short_bulletin:damageClaim:${damageClaimFamily?.id ?? 'fallback'}`,
            damageClaimFamily?.variants ?? ['敵企図ヲ挫折セシメタリ。'],
          ),
          (context.kind === 'practice' ||
          mixSeed(fingerprint, 'short_bulletin:include-continuity') % 4 === 0)
            ? pickVariant(
                fingerprint,
                `short_bulletin:concealment:${concealmentFamily?.id ?? 'fallback'}`,
                concealmentFamily?.variants ?? ['我軍態勢整然ナリ。'],
              )
            : '',
          pickVariant(
            fingerprint,
            `short_bulletin:closing:${closingFamily?.id ?? 'fallback'}`,
            closingFamily?.variants ?? ['戦果顕著ナリ。'],
          ),
        ].filter(Boolean)
  }

  return {
    bulletin: [
      '大本営海軍部発表',
      '',
      toJapaneseDate(context.occurredAt),
      '',
      pickVariant(
        fingerprint,
        `short_bulletin:headline:${headlineFamily?.id ?? 'fallback'}`,
        headlineFamily?.variants ?? [`${context.operationPhrase}方面、敵企図ヲ粉砕`],
      ),
    ].join('\n'),
    body: buildPublicBulletinLines(bulletinLines.slice(0, 4)),
    selectionSnapshot: buildSelectionSnapshot(
      'short_bulletin',
      mainNarrative,
      fingerprint,
      slotFamilies,
    ),
  }
}

const buildFormalAfterAction = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const fingerprint = options.variantSeed ?? 0
  const tags = extractNarrativeTags(context)
  const mainNarrative = selectMainNarrative(context, tags, fingerprint)
  const recentSelections = getRecentSelections(options, 'formal_after_action')
  const slotFamilies: Record<string, string> = {}
  const observationProfile = buildFormalObservationProfile(context, fingerprint)
  slotFamilies.observationProfile = observationProfile.id
  const addressSnapshot = options.addressSnapshot ?? {
    senderLine: '発：出撃艦隊提督',
    recipientLine: '宛：聯合艦隊司令部',
    usesDetectedAdmiralSender: false,
    detectedAdmiral: null,
  }

  const missionOverviewFamily = selectFamily(
    fingerprint,
    'formal_after_action',
    'missionOverview',
    buildFormalMissionOverviewFamilies(context),
    recentSelections,
    slotFamilies,
  )
  const enemySummaryFamily = selectFamily(
    fingerprint,
    'formal_after_action',
    'enemySummary',
    buildFormalEnemySummaryFamilies(),
    recentSelections,
    slotFamilies,
  )
  const engagementFamily =
    selectFamily(
      fingerprint,
      'formal_after_action',
      'engagementOverview',
      buildFormalEngagementFamilies(observationProfile),
      recentSelections,
      slotFamilies,
    ) ?? buildFormalEngagementFamilies(observationProfile)[0]
  const findingsFamily = selectFamily(
    fingerprint,
    'formal_after_action',
    'findings',
    buildFormalFindingsFamilies(context),
    recentSelections,
    slotFamilies,
  )

  return {
    bulletin: buildFormalHeading(context),
    body:
      context.kind === 'practice'
        ? buildFormalPracticeBody(
            context,
            options.truthSource?.kind === 'practice' ? options.truthSource.practice : null,
            addressSnapshot,
            pickVariant(
              fingerprint,
              `formal_after_action:missionOverview:${missionOverviewFamily?.id ?? 'fallback'}`,
              missionOverviewFamily?.variants ?? ['対抗演習ヲ実施シ所定課目ヲ了ス。'],
            ),
            pickVariant(
              fingerprint,
              `formal_after_action:enemySummary:${enemySummaryFamily?.id ?? 'fallback'}`,
              enemySummaryFamily?.variants ?? ['総括判断'],
            ),
            pickVariant(
              fingerprint,
              `formal_after_action:findings:${findingsFamily?.id ?? 'fallback'}`,
              findingsFamily?.variants ?? ['処置概ネ適切ナリ。'],
            ),
            observationProfile,
          )
        : buildFormalSortieBody(
            context,
            options.truthSource ?? null,
            addressSnapshot,
            pickVariant(
              fingerprint,
              `formal_after_action:missionOverview:${missionOverviewFamily?.id ?? 'fallback'}`,
              missionOverviewFamily?.variants ?? ['敵ト交戦ノ後、所定任務ヲ完遂。'],
            ),
            pickVariant(
              fingerprint,
              `formal_after_action:enemySummary:${enemySummaryFamily?.id ?? 'fallback'}`,
              enemySummaryFamily?.variants ?? ['総括判断'],
            ),
            engagementFamily,
            pickVariant(
              fingerprint,
              `formal_after_action:findings:${findingsFamily?.id ?? 'fallback'}`,
              findingsFamily?.variants ?? ['処置概ネ適切ナリ。'],
            ),
            fingerprint,
            observationProfile,
          ),
    selectionSnapshot: buildSelectionSnapshot(
      'formal_after_action',
      mainNarrative,
      fingerprint,
      slotFamilies,
    ),
  }
}

export const generateWarReport = (
  context: ReportRenderContext,
  style: WarReportStyle = 'standard_bulletin',
  options: WarReportRenderOptions = {},
): GeneratedWarReport => {
  switch (style) {
    case 'formal_after_action':
      return buildFormalAfterAction(context, options)
    case 'short_bulletin':
      return buildShortBulletin(context, options)
    case 'standard_bulletin':
    default:
      return buildStandardBulletin(context, options)
  }
}
