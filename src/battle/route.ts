import type { NormalizedWarReportRecord, ReportRenderContext } from './types'

const getResultPhrase = (record: NormalizedWarReportRecord) => {
  if (record.kind === 'practice') {
    switch (record.resultCategory) {
      case 'decisive_success':
        return '対抗演習ヲ完遂シ、優秀ナル成績ヲ収メタリ'
      case 'success':
        return '対抗演習ヲ完遂シ、所期ノ成果ヲ収メタリ'
      case 'partial_success':
      case 'contested':
        return '対抗演習ヲ実施シ、戦技ノ研鑽ヲ遂ゲタリ'
      default:
        return '対抗演習ヲ実施シ、所定ノ演習行動ヲ完遂セリ'
    }
  }

  if (record.failureMode != null) {
    return '之ニ対シ攻撃ヲ実施セリ'
  }

  switch (record.resultCategory) {
    case 'decisive_success':
      return '之ニ対シ攻撃ヲ実施、所定任務ヲ完遂セリ'
    case 'success':
      return '之ニ対シ攻撃ヲ実施、任務ヲ達成セリ'
    case 'partial_success':
      return '之ニ対シ攻撃ヲ実施、所定ノ行動ヲ継続セリ'
    case 'contested':
      return '之ニ対シ攻撃ヲ実施、交戦継続ノ態勢ヲ保持セリ'
    default:
      return '之ニ対シ攻撃ヲ実施セリ'
  }
}

const buildOpeningEnemyClause = (record: NormalizedWarReportRecord) => {
  if (record.kind === 'practice') {
    return ''
  }

  return `${record.enemyDisplay}ト相見エ`
}

const buildCompositionSentence = (record: NormalizedWarReportRecord) => {
  const flagshipDisplay = record.flagshipName ?? '不詳'
  const base = `当時我部隊兵力ハ、${record.friendlySummary}ヲ基幹トスル兵力ニシテ、旗艦「${flagshipDisplay}」ノ指揮ノ下、沈着機敏ニ行動セリ。`

  if (record.highlightFlags.antiAirScreen) {
    return `${base}殊ニ秋月型駆逐艦ヲ中核トスル防空火網ハ緊密ニシテ、敵航空攻撃企図ヲ挫折セシムルニ大イニ寄与セリ。`
  }

  if (record.kind === 'sortie' && record.nodeCount > 1) {
    return `${base}各艦相互ニ緊密ナル協同ヲ保持シ、敵情ニ応ジ迅速適切ナル処置ヲ執リタリ。`
  }

  return `${base}各艦ハ終始統制宜シク、敵情ニ応ジ迅速適切ナル処置ヲ執リタリ。`
}

const buildDamageSentence = (record: NormalizedWarReportRecord) => {
  if (record.failureMode === 'failed_with_heavy_losses') {
    return '我方ニ大破艦複数ヲ生ジ、部隊戦力著シク低下セリ。'
  }

  if (record.failureMode === 'failed_with_retreat') {
    return '我方ニ大破艦ヲ生ジ、爾後ノ行動継続困難ト認メラレタリ。'
  }

  if (record.status === 'failed' && record.damageSummary.severity === 'none') {
    return '我方各艦ハ大ナル損傷ナク帰投セシモ、戦局ノ推移ニ鑑ミ作戦終止ノ止ムナキニ至レリ。'
  }

  switch (record.damageSummary.severity) {
    case 'none':
      return '我方各艦ハ一艦ノ損傷モ無ク、航行並ニ戦闘能力ヲ完全ニ保持シ、任務続行ニ何等ノ支障ナカリキ。'
    case 'light':
      return '我方一部艦艇ニ軽微ナル損傷アリシモ、隊形・任務遂行ニ支障ナシ。'
    case 'moderate':
      return '我方一部艦艇ニ相応ノ損傷アリシモ、部隊ハ統制ヲ失ハズ任務継続可能ノ態勢ヲ保テリ。'
    case 'heavy':
      return '我方相応ノ損害ヲ蒙リタルモ、部隊ハ隊形ヲ維持シ所定行動ヲ継続セリ。'
    default:
      return '我方損害ノ細部ハ目下調査中ナルモ、任務遂行態勢ハ保持セリ。'
  }
}

const buildClosingEmphasis = (record: NormalizedWarReportRecord) => {
  if (record.status === 'failed') {
    return '各艦乗員ノ敢闘'
  }
  if (record.highlightFlags.antiAirScreen) {
    return '防空戦闘力ノ優秀'
  }
  if (record.kind === 'practice') {
    return '部隊練度ノ充実'
  }
  if (record.engagementCategory === 'submarine_engagement') {
    return '対潜戦闘力ノ優秀'
  }
  return '各艦乗員ノ沈着勇戦'
}

export const routeWarRecord = (record: NormalizedWarReportRecord): ReportRenderContext => ({
  occurredAt: record.occurredAt,
  kind: record.kind,
  status: record.status,
  failureMode: record.failureMode,
  operationLabel: record.operationLabel,
  operationPhrase: record.operationPhrase,
  mapLabel: record.mapLabel,
  enemyCategory: record.enemyCategory,
  enemyDisplay: record.enemyDisplay,
  enemyForceLabel: record.enemyForceLabel,
  headlineEnemyPhrase: record.headlineEnemyPhrase,
  resultCategory: record.resultCategory,
  openingEnemyClause: buildOpeningEnemyClause(record),
  resultPhrase: getResultPhrase(record),
  friendlySummary: record.friendlySummary,
  flagshipDisplay: record.flagshipName,
  mvpDisplay: record.mvpName,
  damageSeverity: record.damageSummary.severity,
  damageLabel: record.damageSummary.label,
  damageDetail: record.damageSummary.detail,
  damagedShipCount: record.damageSummary.damagedShipCount,
  heavyDamageCount: record.damageSummary.heavyDamageCount,
  moderateDamageCount: record.damageSummary.moderateDamageCount,
  damageSentence: buildDamageSentence(record),
  compositionSentence: buildCompositionSentence(record),
  closingEmphasis: buildClosingEmphasis(record),
  practiceOpponent: record.practiceOpponent,
  winRank: record.winRank,
  sawAirAttack: record.sawAirAttack,
  nodeCount: record.nodeCount,
})
