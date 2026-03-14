import { toSimpleKanji } from '../battle/model'
import type {
  GeneratedWarReport,
  ReportRenderContext,
  WarReportStyle,
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

const isFailedRetreat = (context: ReportRenderContext) =>
  context.failureMode === 'failed_with_retreat'

const isHeavyLossFailure = (context: ReportRenderContext) =>
  context.failureMode === 'failed_with_heavy_losses'

const isAnyFailedSortie = (context: ReportRenderContext) => context.failureMode != null

const hasNonTrivialDamage = (context: ReportRenderContext) =>
  context.damageSeverity !== 'none' && context.damageSeverity !== 'unknown'

const hasHeavySuccessfulDamage = (context: ReportRenderContext) =>
  !isAnyFailedSortie(context) && context.damageSeverity === 'heavy'

const formatCountLabel = (count: number) => {
  if (count <= 0) {
    return 'ナシ'
  }
  if (count === 1) {
    return '一隻'
  }
  return '若干'
}

const usesSeizureVerb = (context: ReportRenderContext) =>
  context.headlineEnemyPhrase.includes('制圧')

const buildEncounterObject = (context: ReportRenderContext) =>
  context.enemyDisplay === '敵航空兵力' ? '敵航空兵力ヲ擁スル敵部隊' : context.enemyDisplay

const buildShortSuccessVerb = (context: ReportRenderContext) =>
  usesSeizureVerb(context) ? '制圧' : '撃退'

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
    const shipLine =
      isAnyFailedSortie(context) && !isHeavyLossFailure(context)
        ? `　「${context.mvpDisplay}」ノ行動、離脱援護上寄与スル所アリ。`
        : `　「${context.mvpDisplay}」ノ行動、寄与スル所アリ。`
    lines.push(shipLine)
  }

  return lines.slice(0, 2)
}

const buildStandardSuccessfulDamageSentence = (context: ReportRenderContext) => {
  if (hasHeavySuccessfulDamage(context)) {
    return '我方一部艦艇ニ損害アリシモ、部隊ハ航行並ニ戦闘能力ヲ保持シ、任務遂行ニ支障ナカリキ。'
  }

  return '我方各艦ハ一艦ノ損傷モ無ク、航行並ニ戦闘能力ヲ完全ニ保持シ、任務遂行ニ何等ノ支障ナカリキ。'
}

const buildFormalSuccessfulDamageLines = (context: ReportRenderContext) => {
  if (!hasNonTrivialDamage(context)) {
    return ['五、我方損害ナシ。各艦航行並ニ戦闘能力異状ナシ。']
  }

  const lines = ['五、我方損害左ノ如シ。']

  if (context.heavyDamageCount > 0) {
    lines.push(`　大破艦　${formatCountLabel(context.heavyDamageCount)}`)
  }
  if (context.moderateDamageCount > 0) {
    lines.push(`　中破艦　${formatCountLabel(context.moderateDamageCount)}`)
  }

  const lightDamageCount =
    context.damagedShipCount - context.heavyDamageCount - context.moderateDamageCount
  if (lightDamageCount > 0) {
    lines.push(`　軽微損傷艦　${formatCountLabel(lightDamageCount)}`)
  } else {
    lines.push('　其ノ他著変ナシ')
  }

  if (context.heavyDamageCount > 0) {
    lines.push('　航行能力　概ネ保持', '　戦闘能力　一部低下')
  } else {
    lines.push('　航行能力　概ネ異状ナシ', '　戦闘能力　保持')
  }

  return lines
}

const buildShortSuccessfulDamageHeadline = (context: ReportRenderContext) => {
  if (!hasNonTrivialDamage(context)) {
    return '出撃部隊、損害ナク任務完遂'
  }
  if (context.damageSeverity === 'heavy') {
    return '出撃部隊、損害ヲ生ズルモ任務完遂'
  }
  return '出撃部隊、小損害アリト雖モ任務完遂'
}

const buildShortSuccessfulDamageSentence = (context: ReportRenderContext) => {
  if (!hasNonTrivialDamage(context)) {
    return '我方損害ナシ。'
  }
  if (context.damageSeverity === 'heavy') {
    return '我方相応ノ損害アリ。'
  }
  return '我方小損害アリ。'
}

const buildStandardDamageLine = (context: ReportRenderContext) => {
  if (isHeavyLossFailure(context)) {
    return '我方損害大、隊形ヲ保持シ帰投'
  }
  if (isFailedRetreat(context)) {
    return '我方損害ヲ生ジ、隊形ヲ整ヘ帰投'
  }
  if (hasHeavySuccessfulDamage(context)) {
    return '我方一部損害ヲ生ズルモ所定任務ヲ完遂'
  }
  return '我方損害ナク所定任務ヲ完遂'
}

const buildStandardHeadline = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '演習部隊、対抗演習ヲ完遂'
  }

  if (isAnyFailedSortie(context)) {
    return `出撃部隊、${context.operationPhrase}ニ於テ${buildEncounterObject(context)}ト交戦`
  }

  return `出撃部隊、${context.operationPhrase}ニ於テ${context.headlineEnemyPhrase.replace(/シ$/, '')}`
}

const buildStandardOpening = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return `帝国海軍演習部隊ノ一部ハ、${toJapaneseDate(
      context.occurredAt,
    )}、対抗演習実施中、${context.practiceOpponent ?? '対抗部隊'}ニ対シ所定ノ演習行動ヲ実施シ、${context.resultPhrase}。`
  }

  if (isAnyFailedSortie(context)) {
    return `帝国海軍出撃部隊ノ一部ハ、${toJapaneseDate(
      context.occurredAt,
    )}、${context.operationPhrase}ニ於ケル行動中、${buildEncounterObject(
      context,
    )}ト遭遇シ、之ニ対シ果敢ニ攻撃ヲ実施セリ。`
  }

  return `帝国海軍出撃部隊ノ一部ハ、${toJapaneseDate(
    context.occurredAt,
  )}、${context.operationPhrase}ニ於ケル行動中、${buildEncounterObject(
    context,
  )}ト遭遇シ、之ニ対シ攻撃ヲ実施、所定任務ヲ完遂セリ。`
}

const buildStandardDamageParagraph = (context: ReportRenderContext) => {
  if (isHeavyLossFailure(context)) {
    return '然レドモ交戦中、我方ニ大破艦複数ヲ生ジ、部隊戦力著シク低下セリ。爾後ノ戦闘続行困難ト認メラレタルヲ以テ、部隊ハ指揮官ノ判断ニ依リ隊形ヲ保持シツツ帰投セリ。'
  }

  if (isFailedRetreat(context)) {
    return '然レドモ交戦中、我方ニ大破艦ヲ生ジ、爾後ノ行動継続困難ト認メラレタルヲ以テ、部隊ハ指揮官ノ判断ニ依リ隊形ヲ整ヘ帰投セリ。'
  }

  return `交戦ノ結果、${context.enemyForceLabel}ハ我部隊ノ攻撃ニ依リ其企図ヲ達成スル能ハズ、戦場ヲ離脱セリ。${buildStandardSuccessfulDamageSentence(
    context,
  )}`
}

const buildStandardClosing = (context: ReportRenderContext) => {
  const mvpSentence = context.mvpDisplay
    ? `殊ニ「${context.mvpDisplay}」ハ本戦闘ニ於テ奮戦顕著ニシテ、部隊行動ノ中核タル働キヲ示セリ。`
    : ''

  if (isHeavyLossFailure(context)) {
    return `本行動ハ所期ノ成果ヲ収ムルニ至ラザリシモ、各艦乗員ハ終始敢闘シ、困難ナル情況下ニ於テ隊伍ヲ乱サズ帰投セリ。${mvpSentence}大本営ハ本行動ニ於ケル部隊ノ敢闘ヲ認メ、将来ノ雪辱ヲ期スルモノナリ。`
  }

  if (isFailedRetreat(context)) {
    return `本行動ハ所期ノ成果ヲ収ムルニ至ラザリシモ、各艦乗員ハ終始敢闘シ、部隊ハ隊伍ヲ乱サズ帰投セリ。${mvpSentence}大本営ハ本行動ニ於ケル部隊ノ敢闘ヲ認メ、将来ノ雪辱ヲ期スルモノナリ。`
  }

  return `本行動ハ、${context.closingEmphasis}ト平素ノ訓練充実トニ負フ所大ナリ。${mvpSentence}大本営ハ本行動ニ於ケル出撃部隊ノ奮戦ヲ嘉シ、其武功ヲ広ク周知セシムルモノナリ。`
}

const buildStandardBulletin = (context: ReportRenderContext): GeneratedWarReport => ({
  bulletin: [
    '海軍省提供',
    '',
    toJapaneseDate(context.occurredAt),
    '',
    buildStandardHeadline(context),
    '',
    buildStandardDamageLine(context),
  ].join('\n'),
  body: [
    '【大本営海軍報道部発表】',
    '',
    buildStandardOpening(context),
    '',
    context.compositionSentence,
    '',
    buildStandardDamageParagraph(context),
    '',
    buildStandardClosing(context),
  ].join('\n'),
})

const buildFormalHeading = (context: ReportRenderContext) => {
  const title = context.kind === 'practice' ? '演習詳報抄' : '戦闘詳報抄'
  const place = context.kind === 'practice' ? '於 演習海域' : `於 ${context.operationPhrase}`
  return [title, toJapaneseDate(context.occurredAt), place].join('\n')
}

const buildFormalSubject = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '件名：対抗演習実施経過報告'
  }
  if (isAnyFailedSortie(context)) {
    return `件名：${context.operationPhrase}ニ於ケル${context.enemyDisplay}遭遇戦闘並ニ帰投経過報告`
  }
  return `件名：${context.operationPhrase}ニ於ケル${context.enemyDisplay}遭遇戦闘ノ件`
}

const buildFormalBody = (context: ReportRenderContext) => {
  const lines = [
    '発：出撃部隊指揮官',
    '宛：上級司令部',
    '',
    buildFormalSubject(context),
    '',
    '標記ノ件ニ関シ、左記ノ通リ報告ス。',
    '',
    `一、我${context.kind === 'practice' ? '演習' : '出撃'}部隊ハ、${toJapaneseDate(
      context.occurredAt,
    )}、${context.operationPhrase}ニ於ケル行動中、${buildEncounterObject(context)}ト遭遇セリ。`,
    `二、当時我兵力ハ、${context.friendlySummary}ヲ以テ編成、旗艦「${
      context.flagshipDisplay ?? '不詳'
    }」之ヲ率ヰタリ。`,
    '三、各艦直ニ戦闘配置ニ移行、敵ト交戦セリ。',
  ]

  if (context.kind === 'practice') {
    lines.push(
      `四、右交戦後、${context.resultPhrase}。`,
      '五、我方損害ナシ。各艦航行並ニ戦闘能力異状ナシ。',
      '六、所見。',
      ...buildFormalFindings(context),
    )
  } else if (isHeavyLossFailure(context)) {
    lines.push(
      '四、交戦中、我方ニ大破艦複数ヲ生ジ、部隊戦力著シク低下。',
      '五、右ニ依リ所定任務続行困難ト認メ、反転帰投セリ。',
      '六、我方損害左ノ如シ。',
      '　大破艦　複数',
      '　中破以下　若干',
      '　戦闘能力　著シク低下',
      '　航行能力　一部支障アリ',
      '七、所定任務未達成ニ終ル。',
      '八、所見。',
      ...buildFormalFindings(context),
    )
  } else if (isFailedRetreat(context)) {
    lines.push(
      '四、交戦中、我方ニ大破艦ヲ生ズ。右ニ依リ爾後ノ任務続行困難ト認メ、反転帰投セリ。',
      '五、我方損害左ノ如シ。',
      '　大破艦　アリ',
      '　中破以下　若干',
      '　航行能力　一部支障アリ',
      '　戦闘能力　低下',
      '六、所定任務未達成ニ終ル。',
      '七、所見。',
      ...buildFormalFindings(context),
    )
  } else {
    lines.push(
      `四、交戦ノ結果、${context.enemyForceLabel}ハ我攻撃ニ依リ企図遂行不能ト認メラレ、退避セリ。`,
      ...buildFormalSuccessfulDamageLines(context),
      '六、右交戦後、所定任務ヲ完遂セリ。',
      '七、所見。',
      ...buildFormalFindings(context),
    )
  }

  lines.push('', '以上')

  return lines.join('\n')
}

const buildFormalAfterAction = (context: ReportRenderContext): GeneratedWarReport => ({
  bulletin: buildFormalHeading(context),
  body: buildFormalBody(context),
})

const buildShortHeadline = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return '対抗演習実施\n所定演習完了'
  }
  if (isHeavyLossFailure(context)) {
    return `${context.operationPhrase}ニ於テ${buildEncounterObject(context)}ト交戦\n我方損害大、任務中止ノ上帰投`
  }
  if (isFailedRetreat(context)) {
    return `${context.operationPhrase}ニ於テ${buildEncounterObject(context)}ト交戦\n我方損害ヲ生ジ帰投`
  }
  return `${context.operationPhrase}ニ於テ${context.enemyDisplay}ヲ${buildShortSuccessVerb(
    context,
  )}\n${buildShortSuccessfulDamageHeadline(
    context,
  )}`
}

const buildShortBody = (context: ReportRenderContext) => {
  if (context.kind === 'practice') {
    return [
      '【大本営発表】',
      '',
      `帝国海軍演習部隊ノ一部ハ、${context.practiceOpponent ?? '対抗部隊'}ニ対シ対抗演習ヲ実施セリ。`,
      `${context.resultPhrase}。`,
      context.mvpDisplay ? `殊ニ「${context.mvpDisplay}」奮戦顕著ナリ。` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (isHeavyLossFailure(context)) {
    return [
      '【大本営発表】',
      '',
      `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}ニ於テ${buildEncounterObject(
        context,
      )}ト交戦セリ。`,
      '交戦中、我方損害大ニシテ、部隊ハ任務ヲ中止シ帰投セリ。',
      context.mvpDisplay ? `殊ニ「${context.mvpDisplay}」奮戦顕著ナリ。` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (isFailedRetreat(context)) {
    return [
      '【大本営発表】',
      '',
      `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}ニ於テ${buildEncounterObject(
        context,
      )}ト交戦セリ。`,
      '交戦中、我方損害ヲ生ジタルヲ以テ、部隊ハ帰投セリ。',
      context.mvpDisplay ? `殊ニ「${context.mvpDisplay}」奮戦顕著ナリ。` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    '【大本営発表】',
    '',
    `帝国海軍出撃部隊ノ一部ハ、${context.operationPhrase}ニ於テ${buildEncounterObject(
      context,
    )}ト交戦シ、之ヲ${buildShortSuccessVerb(context)}セリ。`,
    buildShortSuccessfulDamageSentence(context),
    '所定任務ヲ完遂セリ。',
    context.mvpDisplay ? `殊ニ「${context.mvpDisplay}」奮戦顕著ナリ。` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const buildShortBulletin = (context: ReportRenderContext): GeneratedWarReport => ({
  bulletin: ['海軍省提供', '', toJapaneseDate(context.occurredAt), '', buildShortHeadline(context)].join(
    '\n',
  ),
  body: buildShortBody(context),
})

export const generateWarReport = (
  context: ReportRenderContext,
  style: WarReportStyle = 'standard_bulletin',
): GeneratedWarReport => {
  switch (style) {
    case 'formal_after_action':
      return buildFormalAfterAction(context)
    case 'short_bulletin':
      return buildShortBulletin(context)
    case 'standard_bulletin':
    default:
      return buildStandardBulletin(context)
  }
}
