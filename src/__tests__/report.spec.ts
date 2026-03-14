import {
  buildDamageAssessment,
  buildFleetCompositionText,
  normalizeFriendlyReportName,
  normalizePracticeCapture,
  normalizeSortieSession,
} from '../battle/model'
import type {
  BattleCapture,
  BattleNodeCapture,
  FleetShipSnapshot,
  SortieSessionCapture,
} from '../battle/types'
import { buildWarReportFromRecord } from '../report/render'

const ships: FleetShipSnapshot[] = [
  {
    instanceId: 1,
    shipId: 100,
    nameJa: 'Johnston改',
    typeId: 2,
    typeNameJa: '駆逐艦',
    level: 99,
    startHp: 34,
    endHp: 34,
    maxHp: 34,
  },
  {
    instanceId: 2,
    shipId: 421,
    nameJa: 'Atlanta',
    typeId: 3,
    typeNameJa: '軽巡洋艦',
    level: 90,
    startHp: 37,
    endHp: 37,
    maxHp: 37,
  },
  {
    instanceId: 3,
    shipId: 422,
    nameJa: 'Верный',
    typeId: 2,
    typeNameJa: '駆逐艦',
    level: 88,
    startHp: 30,
    endHp: 30,
    maxHp: 30,
  },
]

const nodeBattle: BattleNodeCapture = {
  occurredAt: Date.UTC(2026, 2, 14, 4, 40, 0),
  mode: 'normal',
  nodeLabel: 'Node 2',
  operationLabelRaw: 'ブルネイ泊地沖',
  operationPhraseRaw: 'ブルネイ泊地沖',
  friendlyFleet: ships,
  enemyDeckNameRaw: '敵深海潜水艦隊 II群',
  enemyShipNamesRaw: ['潜水ヨ級', '潜水カ級'],
  winRank: 'S',
  damageSummary: buildDamageAssessment(ships),
  sawAirAttack: true,
  antiAirScreen: true,
  flagshipNameRaw: 'Johnston改',
  mvpNameRaw: 'Atlanta',
}

const sortieSession: SortieSessionCapture = {
  id: 'sortie-1',
  startedAt: Date.UTC(2026, 2, 14, 4, 30, 0),
  updatedAt: Date.UTC(2026, 2, 14, 4, 45, 0),
  mapLabel: '2-1',
  operationLabelRaw: '2-1 海域',
  operationPhraseRaw: '2-1 海域',
  friendlyFleetInitial: ships,
  friendlyFleetLatest: ships,
  nodeTrail: ['Node 1', 'Node 2'],
  battles: [nodeBattle],
}

const airPowerBattle: BattleNodeCapture = {
  occurredAt: Date.UTC(2026, 2, 14, 6, 10, 0),
  mode: 'normal',
  nodeLabel: 'Node 3',
  operationLabelRaw: 'ペナン島沖',
  operationPhraseRaw: 'ペナン島沖',
  friendlyFleet: ships,
  enemyDeckNameRaw: '敵航空兵力',
  enemyShipNamesRaw: ['正規空母ヲ級', '軽巡ホ級'],
  winRank: 'S',
  damageSummary: buildDamageAssessment(ships),
  sawAirAttack: true,
  antiAirScreen: false,
  flagshipNameRaw: 'Johnston改',
  mvpNameRaw: 'Fletcher改',
}

const airPowerSortieSession: SortieSessionCapture = {
  id: 'sortie-2',
  startedAt: Date.UTC(2026, 2, 14, 6, 0, 0),
  updatedAt: Date.UTC(2026, 2, 14, 6, 20, 0),
  mapLabel: '7-4',
  operationLabelRaw: 'ペナン島沖',
  operationPhraseRaw: 'ペナン島沖',
  friendlyFleetInitial: ships.map((ship, index) => ({
    ...ship,
    nameJa:
      index === 0 ? '神風改' : index === 1 ? '最上改二特' : ship.nameJa,
  })),
  friendlyFleetLatest: ships.map((ship, index) => ({
    ...ship,
    nameJa:
      index === 0 ? '神風改' : index === 1 ? '最上改二特' : ship.nameJa,
  })),
  nodeTrail: ['Node 1', 'Node 3'],
  battles: [airPowerBattle],
}

const practiceCapture: BattleCapture = {
  occurredAt: Date.UTC(2026, 2, 14, 4, 30, 0),
  kind: 'practice',
  mode: 'practice',
  operationLabelRaw: '演習: 相手提督',
  operationPhraseRaw: '対抗演習',
  mapLabel: null,
  friendlyFleet: ships,
  enemyDeckNameRaw: '敵主力艦隊',
  enemyShipNamesRaw: ['戦艦ル級', '軽巡ホ級'],
  winRank: 'S',
  damageSummary: buildDamageAssessment(ships),
  sawAirAttack: false,
  antiAirScreen: false,
  practiceOpponent: '相手提督 (Lv.120)',
  flagshipNameRaw: 'Johnston改',
  mvpNameRaw: 'Atlanta',
}

describe('war report sortie architecture', () => {
  it('normalizes foreign friendly ship names into katakana aliases', () => {
    expect(normalizeFriendlyReportName('Johnston改')).toBe('ジョンストン')
    expect(normalizeFriendlyReportName('Верный')).toBe('ヴェールヌイ')
    expect(normalizeFriendlyReportName('Ташкент改')).toBe('タシュケント')
    expect(normalizeFriendlyReportName('由良改二')).toBe('由良')
    expect(normalizeFriendlyReportName('最上改二特')).toBe('最上')
  })

  it('normalizes a sortie session into a fixed aggregate enemy category', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')

    expect(record.kind).toBe('sortie')
    expect(record.enemyCategory).toBe('submarine_force')
    expect(record.enemyDisplay).toBe('敵潜水兵力')
    expect(record.headlineEnemyPhrase).toBe('敵潜水兵力ヲ制圧シ')
    expect(record.engagementCategory).toBe('submarine_engagement')
    expect(record.nodeCount).toBe(1)
  })

  it('uses return-to-port damage state for sortie summaries instead of only the last-battle loss delta', () => {
    const record = normalizeSortieSession(
      {
        ...sortieSession,
        friendlyFleetLatest: ships.map((ship, index) => ({
          ...ship,
          startHp: index === 0 ? 15 : ship.startHp,
          endHp: index === 0 ? 15 : ship.endHp,
        })),
      },
      'completed',
    )

    expect(record.damageSummary.severity).toBe('moderate')
    expect(record.damageSummary.moderateDamageCount).toBe(1)
    expect(record.damageSummary.damagedShipCount).toBe(1)
  })

  it('keeps headline enemy classification aligned with the body for sortie records', () => {
    const report = buildWarReportFromRecord(normalizeSortieSession(sortieSession, 'completed'))

    expect(report.bulletin).toContain('敵潜水兵力ヲ制圧')
    expect(report.body).toContain('敵潜水兵力ト遭遇シ')
    expect(report.bulletin).not.toContain('敵航空兵力')
  })

  it('marks interrupted sorties as failed campaign reports in the standard bulletin style', () => {
    const failed = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'failed'),
      'standard_bulletin',
    )

    expect(failed.bulletin).toContain('我方損害ヲ生ジ、隊形ヲ整ヘ帰投')
    expect(failed.body).toContain('指揮官ノ判断ニ依リ隊形ヲ整ヘ帰投セリ')
    expect(failed.body).toContain('将来ノ雪辱ヲ期スルモノナリ')
  })

  it('routes practice captures into single-report practice phrasing', () => {
    const report = buildWarReportFromRecord(normalizePracticeCapture(practiceCapture), 'short_bulletin')

    expect(report.bulletin).toContain('対抗演習実施')
    expect(report.body).toContain('相手提督 (Lv.120)')
  })

  it('renders aliased friendly names in sortie composition and commendation sentences', () => {
    const report = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'completed'),
      'standard_bulletin',
    )

    expect(report.body).toContain('旗艦「ジョンストン」ノ指揮ノ下')
    expect(report.body).toContain('敵航空攻撃企図ヲ挫折セシムル')
    expect(report.body).toContain('殊ニ「アトランタ」')
    expect(report.body).not.toContain('諸戦闘ヲ通ジ')
    expect(report.body).toContain('其武功ヲ広ク周知セシムルモノナリ')
    expect(report.body).not.toContain('Johnston')
    expect(report.body).not.toContain('Atlanta')
    expect(report.body).not.toContain('Верный')
    expect(report.body).not.toContain('ジョンストン改')
  })

  it('renders three distinct document formats from one normalized record', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.body).toContain('【大本営海軍報道部発表】')
    expect(formal.bulletin).toContain('戦闘詳報抄')
    expect(formal.body).toContain('発：出撃部隊指揮官')
    expect(formal.body).toContain('宛：上級司令部')
    expect(formal.body).toContain('標記ノ件ニ関シ、左記ノ通リ報告ス。')
    expect(formal.body).toContain('件名：ブルネイ泊地沖ニ於ケル敵潜水兵力遭遇戦闘ノ件')
    expect(formal.body).toContain('各艦直ニ戦闘配置ニ移行、敵ト交戦セリ。')
    expect(formal.body).toContain('以上')
    expect(short.body).toContain('【大本営発表】')
    expect(short.body).toContain('殊ニ「アトランタ」奮戦顕著ナリ。')
  })

  it('keeps formal findings cold and concise instead of using bulletin praise phrasing', () => {
    const formal = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'completed'),
      'formal_after_action',
    )

    expect(formal.body).toContain('七、所見。')
    expect(formal.body).toContain('対潜戦闘処置、任務達成ニ資ス。')
    expect(formal.body).toContain('「アトランタ」ノ行動、寄与スル所アリ。')
    expect(formal.body).not.toContain('奮戦顕著')
    expect(formal.body).not.toContain('沈着勇戦')
    expect(formal.body).not.toContain('其武功ヲ広ク周知セシムルモノナリ')
  })

  it('uses a less awkward encounter object for air-power cases while keeping public-facing enemy labels', () => {
    const record = normalizeSortieSession(airPowerSortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.bulletin).toContain('敵航空兵力ヲ撃退')
    expect(standard.body).toContain('敵航空兵力ヲ擁スル敵部隊ト遭遇シ')
    expect(formal.body).toContain('敵航空兵力ヲ擁スル敵部隊ト遭遇セリ。')
    expect(short.body).toContain('敵航空兵力ヲ擁スル敵部隊ト交戦シ')
    expect(short.bulletin).toContain('敵航空兵力ヲ撃退')
  })

  it('keeps remodel suffixes out of all rendered document modes', () => {
    const record = normalizeSortieSession(airPowerSortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    for (const report of [standard, formal, short]) {
      expect(report.bulletin).not.toContain('神風改')
      expect(report.body).not.toContain('神風改')
      expect(report.bulletin).not.toContain('最上改二特')
      expect(report.body).not.toContain('最上改二特')
      expect(report.bulletin).not.toContain('Fletcher改')
      expect(report.body).not.toContain('Fletcher改')
    }

    expect(standard.body).toContain('「神風」')
    expect(formal.body).toContain('「神風」')
    expect(standard.body).toContain('「フレッチャー」')
    expect(formal.body).toContain('「フレッチャー」')
    expect(short.body).toContain('「フレッチャー」')
  })

  it('renders successful sortie damage differently across the three styles', () => {
    const record = normalizeSortieSession(
      {
        ...sortieSession,
        friendlyFleetLatest: ships.map((ship, index) => ({
          ...ship,
          startHp: index === 0 ? 15 : ship.startHp,
          endHp: index === 0 ? 15 : ship.endHp,
        })),
      },
      'completed',
    )

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.bulletin).toContain('我方損害ナク所定任務ヲ完遂')
    expect(standard.body).toContain('一艦ノ損傷モ無ク')
    expect(standard.body).not.toContain('中破艦')
    expect(formal.body).toContain('中破艦　一隻')
    expect(formal.body).not.toContain('五、我方損害ナシ。')
    expect(short.bulletin).toContain('小損害アリト雖モ任務完遂')
    expect(short.body).toContain('我方小損害アリ。')
  })

  it('renders retreat failures differently across the three styles without naming damaged ships', () => {
    const record = normalizeSortieSession(
      {
        ...sortieSession,
        friendlyFleetLatest: ships.map((ship, index) => ({
          ...ship,
          endHp: index === 0 ? 7 : index === 1 ? 18 : ship.endHp,
        })),
      },
      'failed',
    )

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(record.failureMode).toBe('failed_with_retreat')
    expect(standard.body).toContain('我方ニ大破艦ヲ生ジ')
    expect(formal.body).toContain('大破艦　アリ')
    expect(formal.body).toContain('所定任務未達成ニ終ル。')
    expect(short.bulletin).toContain('我方損害ヲ生ジ帰投')
    expect(short.body).toContain('部隊ハ帰投セリ')
    expect(standard.body).not.toContain('ジョンストン改(大破)')
    expect(formal.body).not.toContain('ジョンストン改(大破)')
    expect(formal.body).not.toContain('損傷艦:')
    expect(short.body).not.toContain('損傷艦:')
  })

  it('renders heavy-loss failures with stronger wording in all three styles', () => {
    const record = normalizeSortieSession(
      {
        ...sortieSession,
        friendlyFleetLatest: ships.map((ship, index) => ({
          ...ship,
          endHp: index === 0 ? 7 : index === 1 ? 8 : ship.endHp,
        })),
      },
      'failed',
    )

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(record.failureMode).toBe('failed_with_heavy_losses')
    expect(record.damageSummary.heavyDamageCount).toBeGreaterThanOrEqual(2)
    expect(standard.body).toContain('所期ノ成果ヲ収ムルニ至ラザリシモ')
    expect(standard.body).toContain('将来ノ雪辱ヲ期スルモノナリ')
    expect(formal.body).toContain('大破艦　複数')
    expect(formal.body).toContain('戦闘能力　著シク低下')
    expect(short.bulletin).toContain('我方損害大、任務中止ノ上帰投')
    expect(short.body).toContain('我方損害大ニシテ')
    expect(standard.body).not.toContain('ジョンストン改(大破)')
    expect(formal.body).not.toContain('ジョンストン改(大破)')
    expect(short.body).not.toContain('ジョンストン改(大破)')
  })

  it('keeps composition summaries stable after the sortie refactor', () => {
    expect(buildFleetCompositionText(ships)).toBe('駆逐艦二隻、軽巡洋艦一隻')
  })
})
