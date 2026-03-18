import { normalizeFriendlyReportName, toSimpleKanji } from '../battle/model'
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

type PublicDamageDisclosure = 'concealed'

type PublicToneLevel = 'official' | 'maximal'

type PublicPropagandaProfile = {
  officialOutcome: PublicOfficialOutcome
  enemyFrame: PublicEnemyFrame
  damageDisclosure: PublicDamageDisclosure
  toneLevel: PublicToneLevel
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
  const toneLevel: PublicToneLevel = style === 'short_bulletin' ? 'maximal' : 'official'
  const enemyFrame: PublicEnemyFrame =
    context.enemyCategory === 'air_power'
      ? 'air_power'
      : context.enemyCategory === 'submarine_force'
        ? 'submarine_force'
        : context.enemyCategory === 'main_force'
          ? 'enemy_main_force'
          : 'enemy_force'

  if (context.failureMode === 'failed_with_retreat') {
    return {
      officialOutcome:
        toneLevel === 'maximal' ? 'claimed_crushing_blow' : 'claimed_operational_success',
      enemyFrame,
      damageDisclosure: 'concealed',
      toneLevel,
    }
  }

  if (context.failureMode === 'failed_with_heavy_losses') {
    return {
      officialOutcome:
        toneLevel === 'maximal'
          ? 'claimed_crushing_blow'
          : 'claimed_battlefield_contribution',
      enemyFrame,
      damageDisclosure: 'concealed',
      toneLevel,
    }
  }

  return {
    officialOutcome: toneLevel === 'maximal' ? 'claimed_crushing_blow' : 'claimed_victory',
    enemyFrame,
    damageDisclosure: 'concealed',
    toneLevel,
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

const formatCountLabel = (count: number) => {
  if (count <= 0) {
    return 'ナシ'
  }
  if (count === 1) {
    return '一隻'
  }
  return '若干'
}

const sanitizeDamageDetail = (detail: string) =>
  detail.replace(/^損傷艦:\s*/, '').trim() || '細目未詳'

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
) =>
  pickVariant(seed, `${style}:bodyLead`, [
    context.compositionSentence,
    `当時我兵力ハ、${context.friendlySummary}ヲ基幹トシ、旗艦「${
      context.flagshipDisplay ?? '不詳'
    }」ノ下ニ整然作戦行動ヲ継続セリ。`,
    `我部隊ハ、${context.friendlySummary}ヲ以テ編成セラレ、敵情変化ニ即応シ得ル態勢ヲ保持セリ。`,
  ])

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
    profile.damageDisclosure === 'concealed' && {
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
        '我部隊ハ敵企図ヲ挫折セシメ、作戦成果確保ニ成功セリ。',
        '我部隊ノ行動沈着機敏ニシテ、所定成果ヲ保持シ得タリ。',
        '我部隊ハ戦局推移ヲ有利ニ導キ、次段行動ニ資スル成果ヲ収メタリ。',
      ],
    },
    profile.officialOutcome === 'claimed_battlefield_contribution' && {
      id: 'result-battlefield-contribution',
      variants: [
        '我部隊ハ敢闘ノ裡敵ニ打撃ヲ与ヘ、戦局進展ニ寄与セリ。',
        '我部隊ノ奮戦ハ敵企図抑止ニ資シ、作戦成果顕著ナリ。',
        '我部隊ハ果敢ナル行動ヲ以テ敵ニ圧力ヲ加ヘ、戦局寄与ノ戦果ヲ収メタリ。',
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
        '我部隊ハ主導権ヲ掌握シ、作戦成果拡張ニ資スル打撃ヲ与ヘタリ。',
        '敵ニ対シ迅速果敢ナル攻撃ヲ実施シ、所定行動ノ成果顕著ナリ。',
        '我部隊ノ行動ハ沈着機敏ニシテ、戦局進展ニ寄与スル所大ナリ。',
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
) => {
  if (context.kind === 'practice') {
    return uniqueFamilies<TextFamily>([
      {
        id: 'short-headline-practice',
        variants: [
          '演習部隊\n対抗演習ヲ完遂',
          '演習部隊\n優勢裡ニ課目終了',
          '対抗演習\n部隊統制良好',
        ],
      },
    ])
  }

  return uniqueFamilies<TextFamily>([
    profile.enemyFrame === 'air_power' && {
      id: 'short-headline-air',
      variants: [
        `${context.operationPhrase}方面\n敵航空兵力ヲ痛撃`,
        `${context.operationPhrase}方面交戦\n敵航空攻勢ヲ覆滅`,
        `${context.operationPhrase}方面戦況\n敵航空企図ヲ粉砕`,
      ],
    },
    profile.enemyFrame === 'submarine_force' && {
      id: 'short-headline-submarine',
      variants: [
        `${context.operationPhrase}方面\n敵潜水兵力ヲ圧倒`,
        `${context.operationPhrase}方面交戦\n潜航敵部隊ヲ制圧`,
        `${context.operationPhrase}方面戦況\n敵潜航企図ヲ粉砕`,
      ],
    },
    profile.officialOutcome === 'claimed_crushing_blow' && {
      id: 'short-headline-crushing-blow',
      variants: [
        `${context.operationPhrase}方面\n敵企図ヲ粉砕`,
        `${context.operationPhrase}方面交戦\n赫々タル戦果ヲ収ム`,
        `${context.operationPhrase}方面戦況\n敵主力ヲ圧倒`,
      ],
    },
    {
      id: 'short-headline-general',
      variants: [
        `${context.operationPhrase}方面\n作戦成果顕著`,
        `${context.operationPhrase}方面交戦\n戦果ヲ拡張`,
        `${context.operationPhrase}方面戦況\n敵ニ打撃`,
      ],
    },
  ])
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
        `${leaderPrefix}大本営ハ本戦果ヲ高ク評価シ、其成果ヲ広ク公表ス。`,
        `${leaderPrefix}本成果ハ平素ノ錬成ト敢闘ノ賜ナリ。`,
        `${leaderPrefix}大本営ハ本戦果ヲ録シ、更ナル活躍ヲ期ス。`,
      ],
    },
    {
      id: 'short-closing-general',
      variants: [
        `${leaderPrefix}本成果ハ平素ノ錬成ノ賜ナリ。`,
        `${leaderPrefix}大本営ハ本成果ヲ重視シ、作戦進展ニ寄与スル所大ナリトス。`,
        `${leaderPrefix}大本営ハ部隊ノ戦果ヲ録シ、其成果ヲ公表ス。`,
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
) => {
  const enemyDeck = battle.enemyDeckNameRaw?.trim()
  const enemyShips = battle.enemyShipNamesRaw.filter(Boolean).slice(0, 4)
  const enemyLine = enemyDeck || buildEncounterObject(context)

  if (enemyShips.length === 0) {
    return `${enemyLine}。個艦細目未詳。`
  }

  return `${enemyLine}。確認艦種 ${enemyShips.join('、')}${battle.enemyShipNamesRaw.length > 4 ? ' 他' : ''}。`
}

const parseNodeNumber = (battle: BattleNodeCapture) => {
  const rawNumber = battle.nodeLabel?.match(/(\d+)/)?.[1]
  const value = rawNumber ? Number(rawNumber) : null
  return value && value > 0 ? value : null
}

const buildFormalNodeLabel = (battle: BattleNodeCapture, index: number) => {
  const nodeNumber = parseNodeNumber(battle) ?? index + 1
  return `【第${toSimpleKanji(nodeNumber)}交戦点】`
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
      id: 'formal-enemy-summary-standard',
      variants: ['総括判断', '敵情概括', '敵情総括'],
    },
    {
      id: 'formal-enemy-summary-brief',
      variants: ['敵情判断', '敵情整理', '敵情所見'],
    },
  ])

const buildFormalEngagementFamilies = () => [
  {
    id: 'formal-engagement-standard',
    airVariants: [
      '航空攻撃ヲ伴フ交戦。砲雷戦細目未詳。',
      '航空戦ヲ交ヘタル交戦。砲雷戦細目未詳。',
      '空襲企図ヲ伴フ交戦。砲雷戦細目未詳。',
    ],
    surfaceVariants: [
      '通常交戦。砲雷戦細目未詳。',
      '水上交戦実施。砲雷戦細目未詳。',
      '砲雷戦実施。細目未詳。',
    ],
  },
  {
    id: 'formal-engagement-brief',
    airVariants: [
      '航空戦伴随。砲雷戦細目未詳。',
      '空襲企図認ム。砲雷戦細目未詳。',
      '航空攻撃下ニ交戦。砲雷戦細目未詳。',
    ],
    surfaceVariants: [
      '通常交戦実施。細目未詳。',
      '水上戦闘。砲雷戦細目未詳。',
      '交戦実施。砲雷戦細目未詳。',
    ],
  },
  {
    id: 'formal-engagement-record',
    airVariants: [
      '航空攻撃ヲ交ヘタル交戦経過ナリ。砲雷戦細目未詳。',
      '航空戦下ニ交戦。砲雷戦細目未詳。',
      '航空企図ヲ伴ヒ交戦。砲雷戦細目未詳。',
    ],
    surfaceVariants: [
      '交戦経過ハ通常戦闘ナリ。砲雷戦細目未詳。',
      '水上戦闘経過。砲雷戦細目未詳。',
      '交戦ハ通常推移。砲雷戦細目未詳。',
    ],
  },
] satisfies FormalEngagementFamily[]

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
        '統制保持良好。',
        '各艦協同概ネ良好。',
        '部隊運動概ネ整然タリ。',
      ],
    },
    {
      id: 'formal-findings-initial-response',
      variants: [
        '初動概ネ適切ナリ。',
        '処置概ネ良好。',
        '部隊行動概ネ適切ナリ。',
      ],
    },
  ])

const buildFormalDamageSummaryLines = (
  context: ReportRenderContext,
  sectionLabel = '六',
) => {
  if (!hasNonTrivialDamage(context)) {
    return [`${sectionLabel}、被害。`, '　我方損害ナシ。各艦航行並戦闘能力ニ著変ナシ。']
  }

  const lightDamageCount =
    context.damagedShipCount - context.heavyDamageCount - context.moderateDamageCount

  return [
    `${sectionLabel}、被害。`,
    `　大破艦　${formatCountLabel(context.heavyDamageCount)}`,
    `　中破艦　${formatCountLabel(context.moderateDamageCount)}`,
    `　軽微損傷艦　${formatCountLabel(Math.max(0, lightDamageCount))}`,
    `　摘要　${sanitizeDamageDetail(context.damageDetail)}`,
  ]
}

const buildFormalFindings = (
  context: ReportRenderContext,
  familyText: string,
) => {
  const lines = [`　${familyText}`]

  if (context.mvpDisplay) {
    lines.push(`　戦闘後判定ニ於テ「${context.mvpDisplay}」殊勲艦ト認定。`)
  }

  return lines.slice(0, 2)
}

const buildFormalEngagementOverview = (
  battle: BattleNodeCapture,
  index: number,
  family: FormalEngagementFamily,
  seed: number,
) =>
  battle.sawAirAttack
    ? pickVariant(
        seed,
        `formal_after_action:engagementOverview:${family.id}:air:${parseNodeNumber(battle) ?? index + 1}`,
        family.airVariants,
      )
    : pickVariant(
        seed,
        `formal_after_action:engagementOverview:${family.id}:surface:${parseNodeNumber(battle) ?? index + 1}`,
        family.surfaceVariants,
      )

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

const buildFormalOwnDamageSentence = (battle: BattleNodeCapture, index: number, seed: number) => {
  if (battle.damageSummary.severity !== 'none') {
    return sanitizeDamageDetail(battle.damageSummary.detail)
  }

  return pickVariant(
    seed,
    `formal_after_action:nodeDamage:none:${parseNodeNumber(battle) ?? index + 1}`,
    ['被害認メズ。', '我方損害ナシ。', '損傷艦ヲ認メズ。'],
  )
}

const buildFormalPostBattleLine = (battle: BattleNodeCapture, index: number, seed: number) => {
  if (!battle.mvpNameRaw) {
    return null
  }

  const normalizedName = normalizeFriendlyReportName(battle.mvpNameRaw)
  return pickVariant(
    seed,
    `formal_after_action:nodePostBattle:${parseNodeNumber(battle) ?? index + 1}`,
    [
      `　戦闘後判定　「${normalizedName}」殊勲艦。`,
      `　戦闘後判定　「${normalizedName}」殊勲ト認ム。`,
      `　戦闘後判定　「${normalizedName}」殊勲艦ト認定。`,
    ],
  )
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

const buildFormalNodeLines = (
  battle: BattleNodeCapture,
  index: number,
  context: ReportRenderContext,
  engagementFamily: FormalEngagementFamily,
  seed: number,
) => {
  const lines = [
    buildFormalNodeLabel(battle, index),
    `　交戦時刻　${toJapaneseTime(battle.occurredAt)}`,
    `　敵情　${buildFormalEnemySummary(battle, context)}`,
    `　交戦結果　${buildFormalResultSentenceFromRank(battle, index, seed)}`,
    `　交戦概要　${buildFormalEngagementOverview(battle, index, engagementFamily, seed)}`,
    `　我方被害　${buildFormalOwnDamageSentence(battle, index, seed)}`,
  ]

  const postBattleLine = buildFormalPostBattleLine(battle, index, seed)
  if (postBattleLine) {
    lines.push(postBattleLine)
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
) => {
  const source = truthSource
  const enemySummary = source ? buildFormalEnemySummary(source, context) : '対抗部隊細目未詳。'
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
    `　${context.friendlySummary}。旗艦「${context.flagshipDisplay ?? '不詳'}」。`,
    '三、敵情。',
    `　${enemySummaryLabel}　${enemySummary}`,
    '四、経過。',
    `　${context.practiceOpponent ?? '対抗部隊'}ト交戦。交戦結果　${buildFormalOverallResultSentence(context)}`,
    `　演習戦闘実施。砲雷戦細目未詳。`,
    ...buildFormalDamageSummaryLines(context, '五'),
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
    `　${context.friendlySummary}。旗艦「${context.flagshipDisplay ?? '不詳'}」。`,
    '三、敵情。',
    `　${enemySummaryLabel}　${buildEncounterObject(context)}。`,
    `　交戦点数　${toSimpleKanji(Math.max(context.nodeCount, 1))}。`,
    '四、戦闘経過。',
  ]

  if (battles.length === 0) {
    lines.push('　交戦細目未詳。')
  } else {
    battles.forEach((battle, index) => {
      lines.push(...buildFormalNodeLines(battle, index, context, engagementFamily, seed), '')
    })
    if (lines.at(-1) === '') {
      lines.pop()
    }
  }

  lines.push('五、戦果。')
  lines.push(`　戦果総括　${buildFormalOverallResultSentence(context)}`)
  lines.push(`　敵情総括　${buildEncounterObject(context)}ニ対シ所定ノ戦闘行動ヲ実施。`)
  lines.push(...buildFormalDamageSummaryLines(context, '六'))
  lines.push('七、所見。')
  lines.push(...buildFormalFindings(context, findingsText))
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
  const recentSelections = getRecentSelections(options, 'standard_bulletin')
  const slotFamilies: Record<string, string> = {}

  const headlineFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'headline',
    buildStandardHeadlineFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const subheadlineFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'subheadline',
    buildStandardSubheadlineFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const situationOpeningFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'situationOpening',
    buildStandardSituationOpeningFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const resultOpeningFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'resultOpening',
    buildStandardResultOpeningFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const damageFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'damage',
    buildPublicDamageFamilies(context, 'standard_bulletin', propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const closingFamily = selectFamily(
    fingerprint,
    'standard_bulletin',
    'closing',
    buildStandardClosingFamilies(context, propagandaProfile, fingerprint),
    recentSelections,
    slotFamilies,
  )

  const report: GeneratedWarReport = {
    bulletin: [
      '海軍省提供',
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
      '【大本営海軍報道部発表】',
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:situationOpening:${situationOpeningFamily?.id ?? 'fallback'}`,
        situationOpeningFamily?.variants ?? [
          `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildPublicEncounterObject(
            propagandaProfile,
          )}ト交戦セリ。`,
        ],
      ),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:resultOpening:${resultOpeningFamily?.id ?? 'fallback'}`,
        resultOpeningFamily?.variants ?? ['我部隊ハ主導権ヲ掌握シ、作戦目的達成ニ寄与セリ。'],
      ),
      '',
      buildPublicBodyLead(context, 'standard_bulletin', fingerprint),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:damage:${damageFamily?.id ?? 'fallback'}`,
        damageFamily?.variants ?? ['我方各艦ハ戦闘力ヲ保持シ続行態勢堅固ナリ。'],
      ),
      '',
      pickVariant(
        fingerprint,
        `standard_bulletin:closing:${closingFamily?.id ?? 'fallback'}`,
        closingFamily?.variants ?? ['大本営ハ本戦果ヲ重視シ、更ナル活躍ヲ期スルモノナリ。'],
      ),
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
  const recentSelections = getRecentSelections(options, 'short_bulletin')
  const slotFamilies: Record<string, string> = {}

  const headlineFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'headline',
    buildShortHeadlineFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const openingFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'opening',
    buildShortOpeningFamilies(context, propagandaProfile),
    recentSelections,
    slotFamilies,
  )
  const damageFamily = selectFamily(
    fingerprint,
    'short_bulletin',
    'damage',
    buildPublicDamageFamilies(context, 'short_bulletin', propagandaProfile),
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

  return {
    bulletin: [
      '海軍省提供',
      '',
      toJapaneseDate(context.occurredAt),
      '',
      pickVariant(
        fingerprint,
        `short_bulletin:headline:${headlineFamily?.id ?? 'fallback'}`,
        headlineFamily?.variants ?? [`${context.operationPhrase}方面\n敵企図ヲ粉砕`],
      ),
    ].join('\n'),
    body: [
      '【大本営発表】',
      '',
      pickVariant(
        fingerprint,
        `short_bulletin:opening:${openingFamily?.id ?? 'fallback'}`,
        openingFamily?.variants ?? ['帝国海軍出撃部隊ハ交戦ニ於テ所定行動ヲ完遂セリ。'],
      ),
      pickVariant(
        fingerprint,
        `short_bulletin:damage:${damageFamily?.id ?? 'fallback'}`,
        damageFamily?.variants ?? ['我方戦力ニ支障ナシ。'],
      ),
      pickVariant(
        fingerprint,
        `short_bulletin:closing:${closingFamily?.id ?? 'fallback'}`,
        closingFamily?.variants ?? ['大本営ハ本戦果ヲ録ス。'],
      ),
    ].join('\n'),
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
      buildFormalEngagementFamilies(),
      recentSelections,
      slotFamilies,
    ) ?? buildFormalEngagementFamilies()[0]
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
