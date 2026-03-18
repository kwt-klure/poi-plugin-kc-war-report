import {
  buildDamageAssessment,
  buildFleetCompositionText,
  normalizeFriendlyReportName,
  normalizePracticeCapture,
  normalizeSortieSession,
} from '../battle/model'
import type {
  AddressSnapshot,
  BattleCapture,
  BattleNodeCapture,
  FleetShipSnapshot,
  SortieSessionCapture,
} from '../battle/types'
import { buildWarReportFromRecord } from '../report/render'

const formalAddressSnapshot: AddressSnapshot = {
  senderLine: '発：海軍少将 テスト',
  recipientLine: '宛：聯合艦隊司令部',
  usesDetectedAdmiralSender: true,
  detectedAdmiral: {
    name: 'テスト',
    rankValue: 4,
    rankLabel: '海軍少将',
  },
}

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

  it('keeps public styles broad while avoiding fabricated precision', () => {
    const report = buildWarReportFromRecord(normalizeSortieSession(sortieSession, 'completed'))

    expect(report.bulletin).toContain('ブルネイ泊地沖')
    expect(report.body).toMatch(/敵潜[水航]兵力/)
    expect(report.body).not.toContain('撃墜')
    expect(report.body).not.toContain('魚雷')
  })

  it('turns interrupted sorties into propaganda-heavy public victory claims', () => {
    const failed = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'failed'),
      'standard_bulletin',
    )

    expect(failed.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(failed.body).toMatch(/成果|戦果|敵企図/)
    expect(failed.body).not.toMatch(/転進|反転|離脱/)
    expect(failed.body).not.toContain('敵機')
  })

  it('routes practice captures into single-report practice phrasing', () => {
    const report = buildWarReportFromRecord(normalizePracticeCapture(practiceCapture), 'short_bulletin')

    expect(report.bulletin).toContain('演習部隊')
    expect(report.body).toContain('演習')
  })

  it('keeps formal practice reports descriptive instead of exposing game-style ranks', () => {
    const formal = buildWarReportFromRecord(normalizePracticeCapture(practiceCapture), 'formal_after_action', {
      truthSource: {
        kind: 'practice',
        practice: practiceCapture,
      },
      addressSnapshot: formalAddressSnapshot,
    })

    expect(formal.body).toContain('交戦結果')
    expect(formal.body).not.toContain('戦果判定')
    expect(formal.body).not.toContain('総合戦果判定')
    expect(formal.body).not.toMatch(/戦果判定\s*[SABCDE]/)
  })

  it('renders aliased friendly names in truth-only formal sections', () => {
    const report = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: sortieSession,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(report.body).toContain('旗艦「ジョンストン」')
    expect(report.body).toContain('「アトランタ」殊勲艦')
    expect(report.body).not.toContain('Johnston')
    expect(report.body).not.toContain('Atlanta')
    expect(report.body).not.toContain('Верный')
    expect(report.body).not.toContain('ジョンストン改')
  })

  it('renders three distinct document formats from one normalized record', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: sortieSession,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.body).toContain('【大本営海軍報道部発表】')
    expect(formal.bulletin).toContain('戦闘詳報')
    expect(formal.body).toContain('発：海軍少将 テスト')
    expect(formal.body).toContain('宛：聯合艦隊司令部')
    expect(formal.body).toContain('【第二交戦点】')
    expect(formal.body).not.toContain('Node 2')
    expect(formal.body).toContain('交戦結果')
    expect(formal.body).toContain('戦果総括')
    expect(formal.body).not.toContain('戦果判定')
    expect(formal.body).not.toContain('総合戦果判定')
    expect(formal.body).toContain('砲雷戦細目未詳')
    expect(formal.body).toContain('以上')
    expect(short.body).toContain('【大本営発表】')
  })

  it('keeps formal findings cold and concise instead of using bulletin praise phrasing', () => {
    const formal = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: sortieSession,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(formal.body).toContain('七、所見。')
    expect(formal.body).toMatch(/対潜戦闘処置|対潜方面|処置概ネ|部隊行動概ネ/)
    expect(formal.body).toContain('殊勲艦ト認定')
    expect(formal.body).not.toContain('奮戦顕著')
    expect(formal.body).not.toContain('沈着勇戦')
    expect(formal.body).not.toContain('其武功ヲ広く周知')
  })

  it('uses a less awkward encounter object for air-power cases while keeping public-facing enemy labels', () => {
    const record = normalizeSortieSession(airPowerSortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: airPowerSortieSession,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.body).toContain('敵航空兵力ヲ擁スル敵部隊')
    expect(formal.body).toContain('敵航空兵力。')
    expect(`${short.bulletin}\n${short.body}`).toContain('敵航空')
  })

  it('keeps remodel suffixes out of rendered named references', () => {
    const record = normalizeSortieSession(airPowerSortieSession, 'completed')

    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: airPowerSortieSession,
      },
      addressSnapshot: formalAddressSnapshot,
    })

    expect(formal.bulletin).not.toContain('神風改')
    expect(formal.body).not.toContain('神風改')
    expect(formal.bulletin).not.toContain('最上改二特')
    expect(formal.body).not.toContain('最上改二特')
    expect(formal.body).toContain('「神風」')
    expect(formal.body).toContain('「フレッチャー」')
  })

  it('renders successful sortie damage differently across the three styles', () => {
    const damagedSortie = {
      ...sortieSession,
      friendlyFleetLatest: ships.map((ship, index) => ({
        ...ship,
        startHp: index === 0 ? 15 : ship.startHp,
        endHp: index === 0 ? 15 : ship.endHp,
      })),
    }
    const record = normalizeSortieSession(damagedSortie, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: damagedSortie,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(standard.body).not.toContain('中破艦')
    expect(formal.body).toContain('中破艦　一隻')
    expect(short.body).not.toContain('中破艦')
  })

  it('varies formal node-level narration across similar engagements', () => {
    const repeatedBattleSortie: SortieSessionCapture = {
      ...airPowerSortieSession,
      id: 'sortie-3',
      nodeTrail: ['Node 3', 'Node 4', 'Node 8'],
      battles: [
        airPowerBattle,
        {
          ...airPowerBattle,
          occurredAt: Date.UTC(2026, 2, 14, 6, 12, 0),
          nodeLabel: 'Node 4',
        },
        {
          ...airPowerBattle,
          occurredAt: Date.UTC(2026, 2, 14, 6, 15, 0),
          nodeLabel: 'Node 8',
        },
      ],
    }

    const formal = buildWarReportFromRecord(
      normalizeSortieSession(repeatedBattleSortie, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: repeatedBattleSortie,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    const resultLines = formal.body.match(/　交戦結果　.+/g) ?? []
    const overviewLines = formal.body.match(/　交戦概要　.+/g) ?? []
    const damageLines = formal.body.match(/　我方被害　.+/g) ?? []
    const postBattleLines = formal.body.match(/　戦闘後判定　.+/g) ?? []

    expect(resultLines).toHaveLength(3)
    expect(overviewLines).toHaveLength(3)
    expect(damageLines).toHaveLength(3)
    expect(postBattleLines).toHaveLength(3)
    expect(new Set(resultLines).size).toBeGreaterThan(1)
    expect(new Set(overviewLines).size).toBeGreaterThan(1)
    expect(new Set(damageLines).size).toBeGreaterThan(1)
    expect(new Set(postBattleLines).size).toBeGreaterThan(1)
  })

  it('renders retreat failures differently across the three styles without fabricating ammo counts', () => {
    const failedSortie = {
      ...sortieSession,
      friendlyFleetLatest: ships.map((ship, index) => ({
        ...ship,
        endHp: index === 0 ? 7 : index === 1 ? 18 : ship.endHp,
      })),
    }
    const record = normalizeSortieSession(failedSortie, 'failed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: failedSortie,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(record.failureMode).toBe('failed_with_retreat')
    expect(standard.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(standard.body).toMatch(/成果|戦果|敵企図/)
    expect(standard.body).not.toMatch(/転進|反転|離脱/)
    expect(formal.body).toContain('大破艦　一隻')
    expect(formal.body).toContain('砲雷戦細目未詳')
    expect(formal.body).toContain('戦果総括')
    expect(short.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(`${short.bulletin}\n${short.body}`).toMatch(/粉砕|赫々|圧倒|壊滅的/)
    expect(`${short.bulletin}\n${short.body}`).not.toMatch(/転進|反転|離脱/)
    expect(standard.body).not.toContain('撃墜')
    expect(formal.body).not.toContain('発砲')
    expect(short.body).not.toContain('魚雷')
  })

  it('renders heavy-loss failures with stronger wording in all three styles', () => {
    const failedSortie = {
      ...sortieSession,
      friendlyFleetLatest: ships.map((ship, index) => ({
        ...ship,
        endHp: index === 0 ? 7 : index === 1 ? 8 : ship.endHp,
      })),
    }
    const record = normalizeSortieSession(failedSortie, 'failed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: failedSortie,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(record.failureMode).toBe('failed_with_heavy_losses')
    expect(record.damageSummary.heavyDamageCount).toBeGreaterThanOrEqual(2)
    expect(standard.body).toMatch(/成果|戦果|敵企図/)
    expect(`${standard.bulletin}\n${standard.body}`).not.toMatch(/損傷|損耗|損害|大破|中破/)
    expect(formal.body).toContain('大破艦　若干')
    expect(formal.body).toContain('七、所見。')
    expect(short.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(`${short.bulletin}\n${short.body}`).toMatch(/粉砕|赫々|圧倒|壊滅的/)
    expect(`${short.bulletin}\n${short.body}`).not.toMatch(/損傷|損耗|損害|大破|中破/)
  })

  it('selects air suppression as the main narrative for air-power engagements', () => {
    const record = normalizeSortieSession(airPowerSortieSession, 'completed')
    const report = buildWarReportFromRecord(record, 'standard_bulletin')

    expect(report.selectionSnapshot?.mainNarrative).toBe('air_suppression')
    expect(report.selectionSnapshot?.slotFamilies.headline).toBeTruthy()
  })

  it('selects disciplined withdrawal for failed sorties', () => {
    const failedRecord = normalizeSortieSession(sortieSession, 'failed')
    const report = buildWarReportFromRecord(failedRecord, 'short_bulletin')

    expect(report.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
  })

  it('de-duplicates frequent slot families using recent selection history', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')
    const repeatedFamilyHistory = Array.from({ length: 6 }, (_, index) => ({
      style: 'standard_bulletin' as const,
      mainNarrative: 'mission_completion' as const,
      fingerprint: index + 1,
      slotFamilies: {
        headline: 'headline-decisive-blow',
      },
    }))

    const report = buildWarReportFromRecord(record, 'standard_bulletin', {
      recentSelections: {
        standard_bulletin: repeatedFamilyHistory,
      },
    })

    expect(report.selectionSnapshot?.slotFamilies.headline).not.toBe('headline-decisive-blow')
  })

  it('keeps public styles deterministic for one record while allowing a manual seed override', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')

    const first = buildWarReportFromRecord(record, 'standard_bulletin')
    const second = buildWarReportFromRecord(record, 'standard_bulletin')
    const overridden = buildWarReportFromRecord(record, 'standard_bulletin', {
      variantSeed: 1,
    })

    expect(second).toEqual(first)
    expect(overridden.bulletin).not.toBe(first.bulletin)
    expect(overridden.selectionSnapshot?.fingerprint).toBe(1)
  })

  it('keeps composition summaries stable after the sortie refactor', () => {
    expect(buildFleetCompositionText(ships)).toBe('駆逐艦二隻、軽巡洋艦一隻')
  })
})
