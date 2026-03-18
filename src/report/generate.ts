import { normalizeFriendlyReportName, toSimpleKanji } from '../battle/model'
import type {
  AddressSnapshot,
  BattleCapture,
  BattleNodeCapture,
  GeneratedWarReport,
  ReportRenderContext,
  WarReportRenderOptions,
  WarReportStyle,
  WarReportTruthSource,
} from '../battle/types'

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

const usesSeizureVerb = (context: ReportRenderContext) =>
  context.headlineEnemyPhrase.includes('制圧')

const buildEncounterObject = (context: ReportRenderContext) =>
  context.enemyDisplay === '敵航空兵力' ? '敵航空兵力ヲ擁スル敵部隊' : context.enemyDisplay

const formatCountLabel = (count: number) => {
  if (count <= 0) {
    return 'ナシ'
  }
  if (count === 1) {
    return '一隻'
  }
  return '若干'
}

const mixSeed = (seed: number, slot: string) => {
  let value = seed >>> 0
  for (let index = 0; index < slot.length; index += 1) {
    value = Math.imul(value ^ slot.charCodeAt(index), 16777619) >>> 0
  }
  return value
}

const pickVariant = (
  seed: number,
  slot: string,
  variants: string[],
  recent: string[] = [],
) => {
  if (variants.length === 0) {
    return ''
  }

  const baseIndex = mixSeed(seed, slot) % variants.length
  for (let offset = 0; offset < variants.length; offset += 1) {
    const candidate = variants[(baseIndex + offset) % variants.length]!
    if (!recent.includes(candidate) || offset === variants.length - 1) {
      return candidate
    }
  }

  return variants[baseIndex]!
}

const getRecentBulletins = (
  options: WarReportRenderOptions,
  style: WarReportStyle,
) => options.recentReports?.[style]?.map((report) => report.bulletin) ?? []

const getRecentClosings = (
  options: WarReportRenderOptions,
  style: WarReportStyle,
) =>
  options.recentReports?.[style]
    ?.map((report) => report.body.split('\n').filter(Boolean).at(-1) ?? '')
    .filter(Boolean) ?? []

const buildFormalFindings = (context: ReportRenderContext) => {
  const lines: string[] = []

  if (isHeavyLossFailure(context)) {
    lines.push('　反転判断概ネ適切ナリ。')
  } else if (isFailedRetreat(context)) {
    lines.push('　離脱判断概ネ適切ナリ。')
  } else if (context.kind === 'practice') {
    lines.push('　処置概ネ適切ナリ。')
  } else if (context.enemyForceLabel === '敵潜水兵力') {
    lines.push('　対潜戦闘処置、任務達成ニ資ス。')
  } else if (context.nodeCount > 1) {
    lines.push('　統制保持良好。')
  } else {
    lines.push('　初動概ネ適切ナリ。')
  }

  if (context.mvpDisplay) {
    lines.push(`　戦闘後判定ニ於テ「${context.mvpDisplay}」殊勲艦ト認定。`)
  }

  return lines.slice(0, 2)
}

const buildPublicSuccessClaim = (context: ReportRenderContext, style: WarReportStyle, seed: number) => {
  if (context.kind === 'practice') {
    return pickVariant(seed, `${style}:practice-success`, [
      '対抗演習ニ於テ優勢ヲ確保セリ',
      '訓練目的ヲ貫徹シ練度ノ充実ヲ示セリ',
      '部隊統制良好ニシテ所定演習ヲ完遂セリ',
    ])
  }

  if (usesSeizureVerb(context)) {
    return pickVariant(seed, `${style}:seizure`, [
      `${context.enemyDisplay}ノ戦力基盤ヲ圧倒`,
      `${context.enemyDisplay}ノ企図ヲ全面的ニ封殺`,
      `${context.enemyDisplay}ニ重大ナル打撃ヲ与ヘ制圧態勢ヲ確立`,
    ])
  }

  return pickVariant(seed, `${style}:success`, [
    `${context.enemyDisplay}ヲ痛撃シ戦局ヲ有利ニ導ク`,
    `${context.enemyDisplay}ノ攻勢ヲ粉砕シ赫々タル戦果ヲ収ム`,
    `${context.enemyDisplay}ニ対シ主導権ヲ掌握シ作戦目的ヲ貫徹`,
  ])
}

const buildPublicDamageClaim = (context: ReportRenderContext, style: WarReportStyle, seed: number) => {
  if (isHeavyLossFailure(context)) {
    return pickVariant(seed, `${style}:damage-heavy-failure`, [
      '一部艦艇ニ損傷ヲ認メタルモ主力態勢ヲ保持シ次段行動ニ備ヘタリ。',
      '我部隊ニ若干ノ損害アリト雖モ戦力ノ核心ハ依然健在ナリ。',
      '敵反撃ニ依リ一部損傷ヲ生ゼシモ、部隊統制ハ終始保持セラレタリ。',
    ])
  }

  if (isFailedRetreat(context)) {
    return pickVariant(seed, `${style}:damage-retreat`, [
      '我方一部艦艇ニ損傷ヲ見タル為、隊形ヲ整ヘテ転進セリ。',
      '作戦継続ニ先立チ部隊保全ヲ優先シ整然ト反転セリ。',
      '損傷艦収容ノ上、次段作戦準備ノ為戦場ヲ離脱セリ。',
    ])
  }

  if (!hasNonTrivialDamage(context)) {
    return pickVariant(seed, `${style}:damage-none`, [
      '我方損害軽微ニシテ戦力ニ何等ノ動揺ナシ。',
      '我部隊ハ終始戦力旺盛ニシテ任務遂行ニ支障ナシ。',
      '我方各艦ノ戦闘力ハ保持セラレ、続行態勢依然堅固ナリ。',
    ])
  }

  if (context.damageSeverity === 'heavy') {
    return pickVariant(seed, `${style}:damage-heavy`, [
      '我方一部艦艇ニ相応ノ損害アリト雖モ主力ハ依然健在ナリ。',
      '若干ノ損耗ヲ伴ヒタルモ、全般戦況ニ重大ナル影響ナシ。',
      '一部艦艇ノ損傷ヲ認メタルモ作戦全体ノ帰趨ヲ動カスニ至ラズ。',
    ])
  }

  return pickVariant(seed, `${style}:damage-light`, [
    '我方一部艦艇ニ軽微損傷アリト雖モ行動能力旺盛ナリ。',
    '若干ノ被害ヲ蒙リタルモ隊形・統制共ニ良好ナリ。',
    '局地的損傷ヲ見タルモ全般戦闘力ハ毫モ動揺セズ。',
  ])
}

const buildPublicClosing = (
  context: ReportRenderContext,
  style: WarReportStyle,
  seed: number,
  recent: string[],
) => {
  if (context.kind === 'practice') {
    return pickVariant(
      seed,
      `${style}:practice-closing`,
      [
        '大本営ハ本演習ニ示サレタル統制ノ緊密ニ着目シ、今後ノ精進ヲ期スルモノナリ。',
        '本演習ハ部隊練度ノ充実ヲ示スモノニシテ、将来ノ作戦遂行ニ資スル所大ナリ。',
        '大本営ハ本演習成果ヲ嘉シ、益々ノ訓練錬成ヲ促スモノナリ。',
      ],
      recent,
    )
  }

  if (isAnyFailedSortie(context)) {
    return pickVariant(
      seed,
      `${style}:failure-closing`,
      [
        '大本営ハ本戦闘ニ於ケル部隊ノ敢闘ヲ嘉シ、爾後ノ作戦発展ニ資スルモノト認ム。',
        '本行動ハ所期ノ全目標ニ及バザリシモ、部隊敢闘ノ成果ハ次段作戦ニ継承セラルベシ。',
        '大本営ハ本行動ニ示サレタル奮戦ヲ録シ、次段作戦ニ於ケル更ナル戦果ヲ期スルモノナリ。',
      ],
      recent,
    )
  }

  const mvpClause = context.mvpDisplay
    ? `殊ニ「${context.mvpDisplay}」ノ奮戦、武功顕著ナリ。`
    : ''

  return pickVariant(
    seed,
    `${style}:success-closing`,
    [
      `${mvpClause}大本営ハ本行動ニ於ケル部隊ノ武勲ヲ録シ、其戦果ヲ広ク布告セシムルモノナリ。`,
      `${mvpClause}本戦果ハ平素ノ錬成ト敢闘ノ賜ニシテ、戦局ノ進展ニ寄与スル所大ナリ。`,
      `${mvpClause}大本営ハ本戦闘ノ成果ヲ重視シ、今後ノ作戦遂行ニ一層ノ期待ヲ寄スルモノナリ。`,
    ],
    recent,
  )
}

const buildPublicHeadline = (
  context: ReportRenderContext,
  style: WarReportStyle,
  seed: number,
  recent: string[],
) => {
  if (context.kind === 'practice') {
    return pickVariant(
      seed,
      `${style}:practice-headline`,
      [
        '演習部隊、対抗演習ニ於テ優勢ヲ確保',
        '対抗演習実施、部隊統制ノ充実ヲ示ス',
        '演習部隊、所定演習ヲ完遂',
      ],
      recent,
    )
  }

  if (style === 'short_bulletin') {
    if (isHeavyLossFailure(context)) {
      return pickVariant(
        seed,
        `${style}:heavy-loss-headline`,
        [
          `${context.operationPhrase}方面交戦\n敵ニ打撃ヲ与ヘ転進`,
          `${context.operationPhrase}方面戦況\n敢闘ノ上次段作戦準備ニ移行`,
          `${context.operationPhrase}方面交戦\n部隊整然ト反転`,
        ],
        recent,
      )
    }

    if (isFailedRetreat(context)) {
      return pickVariant(
        seed,
        `${style}:retreat-headline`,
        [
          `${context.operationPhrase}方面交戦\n敵企図ヲ挫キ転進`,
          `${context.operationPhrase}方面交戦\n戦果ヲ拡張シ隊形ヲ保チ帰投`,
          `${context.operationPhrase}方面交戦\n一部損傷アリト雖モ主導権保持`,
        ],
        recent,
      )
    }

    return pickVariant(
      seed,
      `${style}:success-headline`,
      [
        `${context.operationPhrase}方面\n${context.enemyDisplay}ヲ${usesSeizureVerb(context) ? '制圧' : '痛撃'}`,
        `${context.operationPhrase}方面戦況\n${buildPublicSuccessClaim(context, style, seed)}`,
        `${context.operationPhrase}方面\n敵企図ヲ粉砕`,
      ],
      recent,
    )
  }

  if (isHeavyLossFailure(context)) {
    return pickVariant(
      seed,
      `${style}:heavy-loss-headline`,
      [
        `大本営海軍報道部、${context.operationPhrase}方面ニ於ケル交戦戦果ヲ公表`,
        `${context.operationPhrase}方面戦況、我部隊敢闘ノ上次段作戦準備ニ移行`,
        `${context.operationPhrase}方面交戦、敵ニ打撃ヲ与ヘ戦場整理完了`,
      ],
      recent,
    )
  }

  if (isFailedRetreat(context)) {
    return pickVariant(
      seed,
      `${style}:retreat-headline`,
      [
        `${context.operationPhrase}方面交戦、敵企図ヲ挫折セシメ部隊転進`,
        `${context.operationPhrase}方面戦闘、我部隊敢闘ノ上戦場ヲ離脱`,
        `${context.operationPhrase}方面交戦、敵兵力ニ打撃ヲ与ヘ整理転進`,
      ],
      recent,
    )
  }

  return pickVariant(
    seed,
    `${style}:success-headline`,
    [
      `${context.operationPhrase}方面、${buildPublicSuccessClaim(context, style, seed)}`,
      `${context.operationPhrase}方面戦況、${context.enemyDisplay}ノ企図ヲ粉砕`,
      `${context.operationPhrase}方面交戦、赫々タル戦果ヲ収ム`,
    ],
    recent,
  )
}

const buildPublicOpening = (context: ReportRenderContext, style: WarReportStyle, seed: number) => {
  if (context.kind === 'practice') {
    return pickVariant(seed, `${style}:practice-opening`, [
      `帝国海軍演習部隊ハ、${context.practiceOpponent ?? '対抗部隊'}ヲ相手ニ所定ノ対抗演習ヲ実施シ、部隊統制ノ緊密ヲ示セリ。`,
      `帝国海軍演習部隊ノ一部ハ、${toJapaneseDate(
        context.occurredAt,
      )}、${context.practiceOpponent ?? '対抗部隊'}ト演習ヲ行ヒ、良好ナル成果ヲ収メタリ。`,
      `帝国海軍演習部隊ハ、対抗演習ニ於テ沈着機敏ナル行動ヲ示シ、訓練目的ヲ達成セリ。`,
    ])
  }

  if (isAnyFailedSortie(context)) {
    return pickVariant(seed, `${style}:failure-opening`, [
      `帝国海軍出撃部隊ハ、${toJapaneseDate(
        context.occurredAt,
      )}、${context.operationPhrase}方面ニ於テ${buildEncounterObject(context)}ト接触、之ニ対シ積極果敢ナル攻撃ヲ加ヘタリ。`,
      `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}方面ニ於ケル行動中、${buildEncounterObject(
        context,
      )}ト交戦シ、敵企図ノ破砕ニ努メタリ。`,
      `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildEncounterObject(
        context,
      )}ノ出現ヲ見、直ニ之ヲ邀撃セリ。`,
    ])
  }

  return pickVariant(seed, `${style}:success-opening`, [
    `帝国海軍出撃部隊ハ、${toJapaneseDate(
      context.occurredAt,
    )}、${context.operationPhrase}方面ニ於テ${buildEncounterObject(context)}ト交戦、敵企図ヲ粉砕シ戦果ヲ拡張セリ。`,
    `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}方面ニ於ケル行動中、${buildEncounterObject(
      context,
    )}ヲ捕捉、之ニ対シ迅速果敢ナル攻撃ヲ加ヘタリ。`,
    `帝国海軍出撃部隊ハ、${context.operationPhrase}方面ニ於テ${buildEncounterObject(
      context,
    )}ニ遭遇、主導権ヲ掌握シ作戦目的達成ニ資スル打撃ヲ与ヘタリ。`,
  ])
}

const buildPublicBodyLead = (context: ReportRenderContext, style: WarReportStyle, seed: number) =>
  pickVariant(seed, `${style}:lead`, [
    context.compositionSentence,
    `当時我兵力ハ、${context.friendlySummary}ヲ基幹トシ、旗艦「${
      context.flagshipDisplay ?? '不詳'
    }」ノ下ニ整然作戦行動ヲ継続セリ。`,
    `我部隊ハ、${context.friendlySummary}ヲ以テ編成セラレ、敵情変化ニ即応シ得ル態勢ヲ保持セリ。`,
  ])

const buildStandardBulletin = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const seed = options.variantSeed ?? 0
  const recentBulletins = getRecentBulletins(options, 'standard_bulletin')
  const recentClosings = getRecentClosings(options, 'standard_bulletin')
  const headline = buildPublicHeadline(context, 'standard_bulletin', seed, recentBulletins)
  const opening = buildPublicOpening(context, 'standard_bulletin', seed)
  const damageClaim = buildPublicDamageClaim(context, 'standard_bulletin', seed)
  const closing = buildPublicClosing(context, 'standard_bulletin', seed, recentClosings)

  return {
    bulletin: [
      '海軍省提供',
      '',
      toJapaneseDate(context.occurredAt),
      '',
      headline,
      '',
      buildPublicSuccessClaim(context, 'standard_bulletin', seed),
    ].join('\n'),
    body: [
      '【大本営海軍報道部発表】',
      '',
      opening,
      '',
      buildPublicBodyLead(context, 'standard_bulletin', seed),
      '',
      damageClaim,
      '',
      closing,
    ].join('\n'),
  }
}

const buildShortBulletin = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const seed = options.variantSeed ?? 0
  const recentBulletins = getRecentBulletins(options, 'short_bulletin')
  const recentClosings = getRecentClosings(options, 'short_bulletin')
  const headline = buildPublicHeadline(context, 'short_bulletin', seed, recentBulletins)
  const opening = buildPublicOpening(context, 'short_bulletin', seed)
  const closing = buildPublicClosing(context, 'short_bulletin', seed, recentClosings)

  return {
    bulletin: ['海軍省提供', '', toJapaneseDate(context.occurredAt), '', headline].join('\n'),
    body: [
      '【大本営発表】',
      '',
      opening,
      buildPublicDamageClaim(context, 'short_bulletin', seed),
      closing,
    ].join('\n'),
  }
}

const sanitizeDamageDetail = (detail: string) =>
  detail.replace(/^損傷艦:\s*/, '').trim() || '細目未詳'

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

const buildFormalEnemySummary = (battle: BattleNodeCapture | BattleCapture, context: ReportRenderContext) => {
  const enemyDeck = battle.enemyDeckNameRaw?.trim()
  const enemyShips = battle.enemyShipNamesRaw.filter(Boolean).slice(0, 4)
  const enemyLine = enemyDeck || buildEncounterObject(context)

  if (enemyShips.length === 0) {
    return `${enemyLine}。個艦細目未詳。`
  }

  return `${enemyLine}。確認艦種 ${enemyShips.join('、')}${battle.enemyShipNamesRaw.length > 4 ? ' 他' : ''}。`
}

const buildFormalNodeLines = (
  battle: BattleNodeCapture,
  index: number,
  context: ReportRenderContext,
) => {
  const nodeName = battle.nodeLabel ?? `Node ${index + 1}`
  const lines = [
    `【${nodeName}】`,
    `　交戦時刻　${toJapaneseTime(battle.occurredAt)}`,
    `　敵情　${buildFormalEnemySummary(battle, context)}`,
    `　戦果判定　${battle.winRank ?? '不詳'}`,
    `　交戦概要　${battle.sawAirAttack ? '航空攻撃ヲ伴フ交戦。' : '通常交戦。'} 砲雷戦細目未詳。`,
    `　我方被害　${
      battle.damageSummary.severity === 'none'
        ? '被害認メズ。'
        : sanitizeDamageDetail(battle.damageSummary.detail)
    }`,
  ]

  if (battle.mvpNameRaw) {
    lines.push(`　戦闘後判定　「${normalizeFriendlyReportName(battle.mvpNameRaw)}」殊勲艦。`)
  }

  return lines
}

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

const buildFormalPracticeBody = (
  context: ReportRenderContext,
  truthSource: BattleCapture | null,
  addressSnapshot: AddressSnapshot,
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
    '二、参加兵力。',
    `　${context.friendlySummary}。旗艦「${context.flagshipDisplay ?? '不詳'}」。`,
    '三、敵情。',
    `　${enemySummary}`,
    '四、経過。',
    `　${context.practiceOpponent ?? '対抗部隊'}ト交戦。戦果判定 ${context.winRank ?? '不詳'}。`,
    `　${context.resultPhrase}。砲雷戦細目未詳。`,
    ...buildFormalDamageSummaryLines(context, '五'),
    '六、所見。',
    ...buildFormalFindings(context),
    '',
    '以上',
  ]

  return lines.join('\n')
}

const buildFormalSortieBody = (
  context: ReportRenderContext,
  truthSource: WarReportTruthSource | null,
  addressSnapshot: AddressSnapshot,
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
    isAnyFailedSortie(context)
      ? '　敵ト交戦ノ後、部隊保全ヲ優先シ帰投。'
      : '　敵ト交戦ノ後、所定任務ヲ完遂。',
    '二、参加兵力。',
    `　${context.friendlySummary}。旗艦「${context.flagshipDisplay ?? '不詳'}」。`,
    '三、敵情。',
    `　総括判断　${buildEncounterObject(context)}。`,
    `　交戦 node 数　${toSimpleKanji(Math.max(context.nodeCount, 1))}。`,
    '四、戦闘経過。',
  ]

  if (battles.length === 0) {
    lines.push('　交戦細目未詳。')
  } else {
    battles.forEach((battle, index) => {
      lines.push(...buildFormalNodeLines(battle, index, context), '')
    })
    if (lines.at(-1) === '') {
      lines.pop()
    }
  }

  lines.push('五、戦果。')
  lines.push(`　総合戦果判定　${context.winRank ?? (context.status === 'failed' ? '未達成' : '不詳')}。`)
  lines.push(`　敵情総括　${buildEncounterObject(context)}ニ対シ所定ノ戦闘行動ヲ実施。`)
  lines.push(...buildFormalDamageSummaryLines(context, '六'))
  lines.push('七、所見。')
  lines.push(...buildFormalFindings(context))
  lines.push('', '以上')

  return lines.join('\n')
}

const buildFormalAfterAction = (
  context: ReportRenderContext,
  options: WarReportRenderOptions,
): GeneratedWarReport => {
  const addressSnapshot = options.addressSnapshot ?? {
    senderLine: '発：出撃艦隊提督',
    recipientLine: '宛：聯合艦隊司令部',
    usesDetectedAdmiralSender: false,
    detectedAdmiral: null,
  }

  return {
    bulletin: buildFormalHeading(context),
    body:
      context.kind === 'practice'
        ? buildFormalPracticeBody(
            context,
            options.truthSource?.kind === 'practice' ? options.truthSource.practice : null,
            addressSnapshot,
          )
        : buildFormalSortieBody(context, options.truthSource ?? null, addressSnapshot),
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
