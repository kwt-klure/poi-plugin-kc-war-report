import {
  buildDamageAssessment,
  buildFleetCompositionText,
  getFlagshipTypeLabel,
  normalizeFlagshipTypeLabel,
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

const antiAirShips: FleetShipSnapshot[] = [
  {
    instanceId: 31,
    shipId: 900,
    nameJa: '初月改二',
    typeId: 2,
    typeNameJa: '駆逐艦',
    level: 99,
    startHp: 37,
    endHp: 37,
    maxHp: 37,
  },
  {
    instanceId: 32,
    shipId: 901,
    nameJa: '矢矧改二乙',
    typeId: 3,
    typeNameJa: '軽巡洋艦',
    level: 99,
    startHp: 53,
    endHp: 53,
    maxHp: 53,
  },
  {
    instanceId: 33,
    shipId: 902,
    nameJa: '最上改二特',
    typeId: 5,
    typeNameJa: '航空巡洋艦',
    level: 99,
    startHp: 57,
    endHp: 57,
    maxHp: 57,
  },
]

const antiAirBattle: BattleNodeCapture = {
  occurredAt: Date.UTC(2026, 2, 29, 2, 20, 0),
  mode: 'boss',
  nodeLabel: 'Node 18',
  operationLabelRaw: '7-2-2 ペナン島沖',
  operationPhraseRaw: 'ペナン島沖',
  friendlyFleet: antiAirShips,
  enemyDeckNameRaw: '敵航空兵力',
  enemyShipNamesRaw: ['正規空母ヲ級改flagship', '軽巡ツ級'],
  winRank: 'A',
  damageSummary: buildDamageAssessment(antiAirShips),
  sawAirAttack: true,
  antiAirScreen: true,
  antiAirSummary: {
    triggered: true,
    shipNameRaw: '初月改二',
    ciKind: 3,
    enemyPlaneLoss: 53,
  },
  carrierAirLossSummary: {
    triggered: true,
    carrierLossCount: 1,
    carrierAircraftLossEstimate: 118,
  },
  flagshipNameRaw: '初月改二',
  mvpNameRaw: '初月改二',
}

const antiAirSortieSession: SortieSessionCapture = {
  id: 'sortie-aa-1',
  startedAt: Date.UTC(2026, 2, 29, 2, 10, 0),
  updatedAt: Date.UTC(2026, 2, 29, 2, 25, 0),
  mapLabel: '7-2',
  operationLabelRaw: 'ペナン島沖',
  operationPhraseRaw: 'ペナン島沖',
  friendlyFleetInitial: antiAirShips,
  friendlyFleetLatest: antiAirShips,
  nodeTrail: ['Node 3', 'Node 18'],
  battles: [antiAirBattle],
}

type FormalObservationProfileIdForTest = 'surveyed' | 'field_summary' | 'fragmentary'

const renderFormalSortie = (session: SortieSessionCapture, variantSeed: number) =>
  buildWarReportFromRecord(normalizeSortieSession(session, 'completed'), 'formal_after_action', {
    truthSource: {
      kind: 'sortie',
      sortie: session,
    },
    addressSnapshot: formalAddressSnapshot,
    variantSeed,
  })

const findFormalReportByProfile = (
  session: SortieSessionCapture,
  profile: FormalObservationProfileIdForTest,
) => {
  for (let variantSeed = 0; variantSeed < 256; variantSeed += 1) {
    const report = renderFormalSortie(session, variantSeed)
    if (report.selectionSnapshot?.slotFamilies.observationProfile === profile) {
      return report
    }
  }

  throw new Error(`No formal report found for observation profile: ${profile}`)
}

describe('war report sortie architecture', () => {
  it('normalizes foreign friendly ship names into katakana aliases', () => {
    expect(normalizeFriendlyReportName('Johnston改')).toBe('ジョンストン')
    expect(normalizeFriendlyReportName('Верный')).toBe('ヴェールヌイ')
    expect(normalizeFriendlyReportName('Ташкент改')).toBe('タシュケント')
    expect(normalizeFriendlyReportName('由良改二')).toBe('由良')
    expect(normalizeFriendlyReportName('最上改二特')).toBe('最上')
  })

  it('uses broad battleship labels for named flagships', () => {
    expect(normalizeFlagshipTypeLabel('戦艦')).toBe('戦艦')
    expect(normalizeFlagshipTypeLabel('高速戦艦')).toBe('戦艦')
    expect(normalizeFlagshipTypeLabel('航空戦艦')).toBe('戦艦')
    expect(normalizeFlagshipTypeLabel('駆逐艦')).toBe('駆逐艦')
    expect(getFlagshipTypeLabel(ships, '扶桑')).toBeNull()
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

    expect(report.bulletin).toContain('大本営海軍部発表')
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
    expect(failed.body).toMatch(/目的.*転進/)
    expect(failed.body).not.toContain('敵機')
  })

  it('routes practice captures into single-report practice phrasing', () => {
    const report = buildWarReportFromRecord(normalizePracticeCapture(practiceCapture), 'short_bulletin')

    expect(report.bulletin).toContain('大本営海軍部発表')
    expect(report.bulletin).toContain('演習部隊')
    expect(report.body).toContain('一、')
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

    expect(report.body).toContain('旗艦、駆逐艦「ジョンストン」')
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

    expect(standard.bulletin).toContain('大本営海軍部発表')
    expect(standard.bulletin).not.toContain('海軍省提供')
    expect(standard.body).not.toContain('【大本営海軍報道部発表】')
    expect(formal.bulletin).toContain('戦闘詳報')
    expect(formal.body).toContain('発：海軍少将 テスト')
    expect(formal.body).toContain('宛：聯合艦隊司令部')
    expect(formal.body).toContain('【第二交戦点】')
    expect(formal.body).not.toContain('Node 2')
    expect(formal.body).toContain('交戦結果')
    expect(formal.body).toContain('戦果総括')
    expect(formal.body).not.toContain('戦果判定')
    expect(formal.body).not.toContain('総合戦果判定')
    expect(formal.body).toContain('　交戦概要　')
    expect(formal.body).toContain('以上')
    expect(short.bulletin).toContain('大本営海軍部発表')
    expect(short.bulletin).not.toContain('海軍省提供')
    expect(short.body).toContain('一、')
    expect(short.body).toContain('二、')
    expect(short.body).not.toContain('【大本営発表】')
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

  it('does not promote surface enemies to air power from sawAirAttack noise alone', () => {
    const noisySurfaceSortie: SortieSessionCapture = {
      ...sortieSession,
      id: 'sortie-surface-noise',
      operationLabelRaw: '鎮守府正面海域',
      operationPhraseRaw: '鎮守府正面海域',
      mapLabel: '1-1',
      nodeTrail: ['Node 1', 'Node 2'],
      battles: [
        {
          ...nodeBattle,
          nodeLabel: 'Node 1',
          operationLabelRaw: '鎮守府正面海域',
          operationPhraseRaw: '鎮守府正面海域',
          enemyDeckNameRaw: '敵はぐれ艦隊',
          enemyShipNamesRaw: ['駆逐イ級', '駆逐ロ級'],
          sawAirAttack: true,
        },
      ],
    }

    const record = normalizeSortieSession(noisySurfaceSortie, 'completed')
    const standard = buildWarReportFromRecord(record, 'standard_bulletin')

    expect(record.enemyCategory).not.toBe('air_power')
    expect(record.enemyDisplay).not.toBe('敵航空兵力')
    expect(`${standard.bulletin}\n${standard.body}`).not.toContain('敵航空攻勢')
    expect(`${standard.bulletin}\n${standard.body}`).not.toContain('敵航空兵力')
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

  it('writes anti-air credit back into all three document voices without leaking game mechanic terms', () => {
    const record = normalizeSortieSession(antiAirSortieSession, 'completed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin', {
      truthSource: {
        kind: 'sortie',
        sortie: antiAirSortieSession,
      },
    })
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: antiAirSortieSession,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin', {
      truthSource: {
        kind: 'sortie',
        sortie: antiAirSortieSession,
      },
    })

    expect(formal.body).toContain('防空戦果')
    expect(formal.body).toMatch(
      /「初月」防空射撃ニ当リ、敵機計(?:五十三機|約六十機|五十乃至六十機|五十余機)ヲ撃墜。/,
    )
    expect(standard.body).toMatch(
      /「初月」ノ防空戦闘鋭甚ニシテ、敵機(?:百四十余機|約百四十機|百二十乃至百六十機|百四十機（内不確実三十機）)ヲ撃滅セリ。/,
    )
    expect(short.body).toMatch(
      /敵艦載機三百余機、母艦諸共喪失。|敵航空兵力三百余機壊滅。|敵艦載機三百余機海没。/,
    )
    expect(short.body).not.toContain('「初月」奮戦、敵機百九十余機ヲ掃蕩。')

    expect(formal.body).toMatch(
      /敵空母(?:損失ニ伴ヒ、搭載敵機計|被害ニ伴ヒ、敵航空兵力亦大損耗ヲ生ジ、搭載敵機計)(?:百十八機|約百二十機|百十乃至百二十機|百十余機)喪失ト認ム。/,
    )
    expect(standard.body).toMatch(/敵艦載機|敵母艦群損失|敵航空戦力亦同時ニ/)

    for (const text of [`${formal.bulletin}\n${formal.body}`, `${standard.bulletin}\n${standard.body}`, `${short.bulletin}\n${short.body}`]) {
      expect(text).not.toContain('対空CI')
      expect(text).not.toContain('カットイン')
      expect(text).not.toContain('slot')
      expect(text).not.toContain('trigger')
      expect(text).not.toContain('proc')
      expect(text).not.toContain('初月改二')
      expect(text).not.toContain('矢矧改二乙')
      expect(text).not.toContain('最上改二特')
    }
  })

  it('uses deterministic historical count forms and reuses one count within a standard bulletin', () => {
    const antiAirOnlySortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-aa-public-count-forms',
      battles: [
        {
          ...antiAirBattle,
          carrierAirLossSummary: null,
        },
      ],
    }
    const record = normalizeSortieSession(antiAirOnlySortie, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: antiAirOnlySortie,
    }
    const observedForms = new Set<string>()

    for (let variantSeed = 0; variantSeed < 32; variantSeed += 1) {
      const standard = buildWarReportFromRecord(record, 'standard_bulletin', {
        truthSource,
        variantSeed,
      })
      const count = standard.body.match(/敵機(.+?)ヲ撃滅セリ。/)?.[1]

      expect(count).toBeTruthy()
      observedForms.add(count!)
      if (standard.bulletin.includes('敵機')) {
        expect(standard.bulletin).toContain(count!)
      }

      const repeated = buildWarReportFromRecord(record, 'standard_bulletin', {
        truthSource,
        variantSeed,
      })
      expect(repeated).toEqual(standard)
    }

    expect(observedForms).toEqual(
      new Set([
        '百四十余機',
        '約百四十機',
        '百二十乃至百六十機',
        '百四十機（内不確実三十機）',
      ]),
    )
  })

  it('uses an inventory only when a standard bulletin has multiple concrete claims', () => {
    const antiAirOnlySortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-aa-single-public-claim',
      battles: [
        {
          ...antiAirBattle,
          carrierAirLossSummary: null,
        },
      ],
    }
    const singleClaim = buildWarReportFromRecord(
      normalizeSortieSession(antiAirOnlySortie, 'completed'),
      'standard_bulletin',
      {
        truthSource: {
          kind: 'sortie',
          sortie: antiAirOnlySortie,
        },
      },
    )
    const noClaim = buildWarReportFromRecord(
      normalizeSortieSession(sortieSession, 'completed'),
      'standard_bulletin',
      {
        truthSource: {
          kind: 'sortie',
          sortie: sortieSession,
        },
      },
    )

    expect(singleClaim.body).toMatch(/「初月」ノ防空戦闘鋭甚ニシテ、敵機/)
    expect(singleClaim.body).not.toContain('現在迄ニ判明セル戦果概ネ左ノ如シ。')
    expect(noClaim.body).not.toContain('現在迄ニ判明セル戦果概ネ左ノ如シ。')
  })

  it('lets high anti-air credit outrank MVP in formal and standard distinguished credit', () => {
    const airDefenseSortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-aa-distinguished',
      battles: [
        {
          ...antiAirBattle,
          mvpNameRaw: '矢矧改二乙',
        },
      ],
    }
    const record = normalizeSortieSession(airDefenseSortie, 'completed')

    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource: {
        kind: 'sortie',
        sortie: airDefenseSortie,
      },
      addressSnapshot: formalAddressSnapshot,
    })
    const standard = buildWarReportFromRecord(record, 'standard_bulletin', {
      truthSource: {
        kind: 'sortie',
        sortie: airDefenseSortie,
      },
    })

    expect(formal.body).toContain('戦闘後判定ニ於テ「初月」防空戦果顕著、殊勲艦ト認定。')
    expect(formal.body).not.toContain('「矢矧」殊勲艦')
    expect(standard.body).toMatch(
      /「初月」ノ防空戦闘、武功顕著ナリ。|「初月」ノ防空奮戦、殊勲ト認ム。|「初月」ノ対空戦闘、特筆ニ値ス。/,
    )
    expect(standard.body).not.toContain('矢矧')
  })

  it('mentions enemy flagship sinking in all document voices without assigning it to a ship', () => {
    const flagshipSunkBattle = {
      ...antiAirBattle,
      enemyFlagshipSunkSummary: {
        triggered: true,
        enemyShipId: 2101,
        enemyNameRaw: '戦艦レ級',
      },
    } as BattleNodeCapture
    const flagshipSunkSortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-enemy-flagship-sunk',
      battles: [flagshipSunkBattle],
    }
    const record = normalizeSortieSession(flagshipSunkSortie, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: flagshipSunkSortie,
    }

    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource,
      addressSnapshot: formalAddressSnapshot,
    })
    const standard = buildWarReportFromRecord(record, 'standard_bulletin', {
      truthSource,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin', {
      truthSource,
    })
    const allText = `${formal.body}\n${standard.body}\n${short.body}`

    expect(formal.body).toMatch(
      /敵旗艦「戦艦レ級」(?:撃沈ヲ確認|撃沈確実ト認ム|沈没セルモノト認ム)。/,
    )
    expect(standard.bulletin).toContain('敵旗艦「戦艦レ級」')
    expect(standard.body).toContain('現在迄ニ判明セル戦果概ネ左ノ如シ。')
    expect(standard.body).toContain('一、敵旗艦「戦艦レ級」ヲ撃沈、敵戦列ヲ潰乱セシメタリ。')
    expect(standard.body).toMatch(/二、(?:敵艦載機|敵母艦群損失|敵航空戦力亦同時ニ)/)
    expect(standard.body).toMatch(/三、殊ニ「初月」ノ防空戦闘鋭甚ニシテ、敵機/)
    expect(standard.body).toContain('敵旗艦「戦艦レ級」ヲ撃沈、敵戦列ヲ潰乱セシメタリ。')
    expect(short.body).toContain('敵旗艦撃沈、戦果顕著。')
    expect(allText).not.toContain('「初月」敵旗艦')
    expect(allText).not.toContain('「矢矧」敵旗艦')

    for (const profile of ['surveyed', 'field_summary', 'fragmentary'] as const) {
      const profiledFormal = findFormalReportByProfile(flagshipSunkSortie, profile)
      expect(profiledFormal.body).toMatch(
        /敵旗艦「戦艦レ級」(?:撃沈ヲ確認|撃沈確実ト認ム|沈没セルモノト認ム)。/,
      )
      expect(profiledFormal.body).not.toMatch(/「(?:初月|矢矧)」.*敵旗艦/)
    }
  })

  it('escalates high-glory short bulletins into result-first numeric dispatches', () => {
    const highGlorySortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-short-high-glory',
      operationLabelRaw: 'カレー洋海域',
      operationPhraseRaw: 'カレー洋海域',
      battles: [
        {
          ...antiAirBattle,
          operationLabelRaw: 'カレー洋海域',
          operationPhraseRaw: 'カレー洋海域',
          enemyDeckNameRaw: '敵主力打撃群',
          enemyShipNamesRaw: ['戦艦ル級', '空母ヲ級', '輸送ワ級', '駆逐ハ級後期型'],
        },
      ],
    }
    const record = normalizeSortieSession(highGlorySortie, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: highGlorySortie,
    }

    const short = buildWarReportFromRecord(record, 'short_bulletin', {
      truthSource,
      variantSeed: 2,
    })

    expect(short.body).toContain('三、')
    expect(short.body).not.toMatch(/攻撃ヲ開始セリ|攻撃ヲ継続セリ/)
    expect(short.body).toMatch(/赫々タル戦果|大打撃|圧倒|粉砕|潰滅|壊滅|撃滅/)
    expect(short.body).toMatch(/百余機|二百余機|三百余機|五百余機|七百余機/)
  })

  it('promotes carrier and air-power claims into standard bulletin headline slots instead of generic main-force copy', () => {
    const highGlorySortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-standard-claim-promotion',
      operationLabelRaw: 'カレー洋海域',
      operationPhraseRaw: 'カレー洋海域',
      battles: [
        {
          ...antiAirBattle,
          operationLabelRaw: 'カレー洋海域',
          operationPhraseRaw: 'カレー洋海域',
          enemyDeckNameRaw: '敵強襲上陸主力艦隊',
          enemyShipNamesRaw: ['戦艦タ級', '空母ヲ級', '輸送ワ級', '駆逐ハ級後期型'],
        },
      ],
    }
    const record = normalizeSortieSession(highGlorySortie, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: highGlorySortie,
    }

    const standard = buildWarReportFromRecord(record, 'standard_bulletin', {
      truthSource,
      variantSeed: 2,
    })

    expect(standard.bulletin).toMatch(/航空戦力|母艦群|航空企図|艦載機/)
    expect(standard.bulletin).not.toContain('敵主力部隊ニ有効打撃ヲ與ヘタリ')
    expect(standard.body).toMatch(/敵艦載機|敵母艦群損失|敵航空戦力亦同時ニ|敵機/)
  })

  it('keeps high-glory main-force short bulletins result-first even without numeric side events', () => {
    const mainForceRecord = normalizeSortieSession(
      {
        ...sortieSession,
        id: 'sortie-main-force-high-glory-slotting',
        operationLabelRaw: '沖ノ島沖',
        operationPhraseRaw: '沖ノ島沖',
        battles: [
          {
            ...nodeBattle,
            operationLabelRaw: '沖ノ島沖',
            operationPhraseRaw: '沖ノ島沖',
            enemyDeckNameRaw: '敵侵攻中核艦隊',
            enemyShipNamesRaw: ['戦艦ル級', '戦艦ル級', '軽巡ヘ級'],
            sawAirAttack: false,
          },
        ],
      },
      'completed',
    )

    const short = buildWarReportFromRecord(mainForceRecord, 'short_bulletin', {
      variantSeed: 3,
    })
    const bullets = short.body.split('\n').filter((line) => /^(一|二|三)、/.test(line))

    expect(bullets).toHaveLength(3)
    expect(bullets[0]).not.toMatch(/攻撃ヲ開始セリ|攻撃ヲ継続セリ/)
    expect(bullets[1]).not.toMatch(/攻撃ヲ開始セリ|攻撃ヲ継続セリ/)
    expect(bullets[0]).toMatch(/大打撃|赫々タル戦果|主力圧倒|戦果顕著/)
    expect(bullets[1]).toMatch(/粉砕|挫折|戦果顕著|殲滅的打撃/)
  })

  it('promotes numeric anti-air over submarine category in shared public claim priority', () => {
    const submarineAirMixSortie: SortieSessionCapture = {
      ...antiAirSortieSession,
      id: 'sortie-submarine-focus-with-aa-highlight',
      operationLabelRaw: '昭南本土航路',
      operationPhraseRaw: '昭南本土航路',
      battles: [
        {
          ...antiAirBattle,
          operationLabelRaw: '昭南本土航路',
          operationPhraseRaw: '昭南本土航路',
          enemyDeckNameRaw: '敵潜水兵力',
          enemyShipNamesRaw: ['潜水ヨ級', '潜水カ級', '潜水カ級'],
          carrierAirLossSummary: undefined,
        },
      ],
    }
    const record = normalizeSortieSession(submarineAirMixSortie, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: submarineAirMixSortie,
    }

    const short = buildWarReportFromRecord(record, 'short_bulletin', {
      truthSource,
      variantSeed: 2,
    })
    const bullets = short.body.split('\n').filter((line) => /^(一|二|三)、/.test(line))

    expect(short.bulletin).toMatch(/敵航空|敵機群/)
    expect(bullets).toHaveLength(3)
    expect(bullets[0]).toMatch(/敵航空攻勢|敵航空兵力|防空戦果/)
    expect(bullets[1]).toMatch(/敵主力挫折|敵企図|敵部隊/)
    expect(bullets[2]).toMatch(/「初月」奮戦、敵機百九十余機ヲ掃蕩/)
  })

  it('renders formal node labels with kansuji even above ten', () => {
    const twentyNodeSortie: SortieSessionCapture = {
      ...sortieSession,
      id: 'sortie-node-20',
      battles: [
        {
          ...nodeBattle,
          nodeLabel: 'Node 20',
        },
      ],
    }

    const formal = buildWarReportFromRecord(
      normalizeSortieSession(twentyNodeSortie, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: twentyNodeSortie,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(formal.body).toContain('【第二十交戦点】')
    expect(formal.body).not.toContain('【第20交戦点】')
  })

  it('does not add anti-air credit lines when no anti-air summary exists', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: sortieSession,
    }

    const standard = buildWarReportFromRecord(record, 'standard_bulletin', { truthSource })
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource,
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin', { truthSource })

    expect(formal.body).not.toContain('防空戦果')
    expect(standard.body).not.toContain('敵機百')
    expect(short.body).not.toContain('敵機百')
  })

  it('keeps formal carrier counts truth-bounded while public voices use their own rhetoric bands', () => {
    const record = normalizeSortieSession(antiAirSortieSession, 'completed')
    const truthSource = {
      kind: 'sortie' as const,
      sortie: antiAirSortieSession,
    }

    const standard = buildWarReportFromRecord(record, 'standard_bulletin', { truthSource })
    const formal = buildWarReportFromRecord(record, 'formal_after_action', {
      truthSource,
      addressSnapshot: formalAddressSnapshot,
    })
    const short = buildWarReportFromRecord(record, 'short_bulletin', { truthSource })

    expect(formal.body).toMatch(/(?:百十八機|約百二十機|百十乃至百二十機|百十余機)喪失ト認ム。/)
    expect(standard.body).toMatch(
      /二百余機|約二百機|百五十乃至二百五十機|二百機（内不確実四十機）/,
    )
    expect(short.body).toContain('三百余機')
    expect(short.body).not.toContain('二百余機')
  })

  it('selects one deterministic formal observation profile without changing public styles', () => {
    const observedProfiles = new Set<string>()

    for (let variantSeed = 0; variantSeed < 128; variantSeed += 1) {
      const first = renderFormalSortie(antiAirSortieSession, variantSeed)
      const repeated = renderFormalSortie(antiAirSortieSession, variantSeed)

      expect(repeated).toEqual(first)
      observedProfiles.add(first.selectionSnapshot?.slotFamilies.observationProfile ?? '')
    }

    expect(observedProfiles).toEqual(new Set(['surveyed', 'field_summary', 'fragmentary']))

    const record = normalizeSortieSession(antiAirSortieSession, 'completed')
    const truthSource = { kind: 'sortie' as const, sortie: antiAirSortieSession }
    const standard = buildWarReportFromRecord(record, 'standard_bulletin', { truthSource })
    const short = buildWarReportFromRecord(record, 'short_bulletin', { truthSource })

    expect(standard.selectionSnapshot?.slotFamilies.observationProfile).toBeUndefined()
    expect(short.selectionSnapshot?.slotFamilies.observationProfile).toBeUndefined()
  })

  it('renders exact, bounded, and coarse formal aircraft counts from the same truth', () => {
    const surveyed = findFormalReportByProfile(antiAirSortieSession, 'surveyed')
    const fieldSummary = findFormalReportByProfile(antiAirSortieSession, 'field_summary')
    const fragmentary = findFormalReportByProfile(antiAirSortieSession, 'fragmentary')

    expect(surveyed.body).toContain('敵機計五十三機ヲ撃墜。')
    expect(surveyed.body).toContain('搭載敵機計百十八機喪失ト認ム。')
    expect(fieldSummary.body).toMatch(/敵機計(?:約六十機|五十乃至六十機)ヲ撃墜。/)
    expect(fieldSummary.body).toMatch(
      /搭載敵機計(?:約百二十機|百十乃至百二十機)喪失ト認ム。/,
    )
    expect(fragmentary.body).toContain('敵機計五十余機ヲ撃墜。')
    expect(fragmentary.body).toContain('搭載敵機計百十余機喪失ト認ム。')
    expect(`${surveyed.body}\n${fieldSummary.body}\n${fragmentary.body}`).not.toContain(
      '敵機計百四十',
    )
  })

  it('applies one coherent war-fog profile to damage counts and enemy detail', () => {
    const damagedFleet: FleetShipSnapshot[] = [
      { ...ships[0], instanceId: 101, shipId: 1001, nameJa: '雪風改二', startHp: 40, endHp: 8, maxHp: 40 },
      { ...ships[1], instanceId: 102, shipId: 1002, nameJa: '時雨改三', startHp: 40, endHp: 10, maxHp: 40 },
      { ...ships[2], instanceId: 103, shipId: 1003, nameJa: '矢矧改二乙', startHp: 40, endHp: 20, maxHp: 40 },
      { ...ships[0], instanceId: 104, shipId: 1004, nameJa: '秋月改', startHp: 40, endHp: 31, maxHp: 40 },
      { ...ships[0], instanceId: 105, shipId: 1005, nameJa: '照月改', startHp: 40, endHp: 32, maxHp: 40 },
      { ...ships[0], instanceId: 106, shipId: 1006, nameJa: '涼月改', startHp: 40, endHp: 33, maxHp: 40 },
      { ...ships[0], instanceId: 107, shipId: 1007, nameJa: '冬月改', startHp: 40, endHp: 34, maxHp: 40 },
    ]
    const observationBattle: BattleNodeCapture = {
      ...nodeBattle,
      nodeLabel: 'Node 7',
      friendlyFleet: damagedFleet,
      enemyDeckNameRaw: '敵水上打撃部隊',
      enemyShipNamesRaw: ['戦艦ル級', '重巡リ級', '軽巡ホ級', '駆逐ロ級', '駆逐イ級'],
      damageSummary: buildDamageAssessment(damagedFleet),
      sawAirAttack: false,
      flagshipNameRaw: '雪風改二',
    }
    const observationSortie: SortieSessionCapture = {
      ...sortieSession,
      id: 'sortie-formal-observation-damage',
      friendlyFleetInitial: damagedFleet.map((ship) => ({ ...ship, endHp: ship.startHp })),
      friendlyFleetLatest: damagedFleet,
      nodeTrail: ['Node 7'],
      battles: [observationBattle],
    }

    const surveyed = findFormalReportByProfile(observationSortie, 'surveyed')
    const fieldSummary = findFormalReportByProfile(observationSortie, 'field_summary')
    const fragmentary = findFormalReportByProfile(observationSortie, 'fragmentary')

    expect(surveyed.body).toContain('大破艦　二隻')
    expect(surveyed.body).toContain('中破艦　一隻')
    expect(surveyed.body).toContain('軽微損傷艦　四隻')
    expect(surveyed.body).toContain('戦艦ル級、重巡リ級、軽巡ホ級、駆逐ロ級 他')

    expect(fieldSummary.body).toContain('大破艦　二隻')
    expect(fieldSummary.body).toContain('中破艦　一隻')
    expect(fieldSummary.body).toContain('軽微損傷艦　多数')
    expect(fieldSummary.body).toContain('戦艦ル級、重巡リ級 他')
    expect(fieldSummary.body).not.toContain('確認艦種 戦艦ル級、重巡リ級、軽巡ホ級')

    expect(fragmentary.body).toMatch(/大破艦　(?:若干|数隻)/)
    expect(fragmentary.body).toContain('中破艦　一隻')
    expect(fragmentary.body).toContain('軽微損傷艦　多数')
    expect(fragmentary.body).toContain('個艦細目未詳')
    expect(fragmentary.body).toContain('損傷細目整理中')
    expect(fragmentary.body).not.toContain('確認艦種')
  })

  it('reports unknown formal damage as pending instead of no damage', () => {
    const unknownFleet = ships.map((ship) => ({ ...ship, endHp: null }))
    const unknownBattle: BattleNodeCapture = {
      ...nodeBattle,
      friendlyFleet: unknownFleet,
      damageSummary: buildDamageAssessment(unknownFleet),
    }
    const unknownSortie: SortieSessionCapture = {
      ...sortieSession,
      id: 'sortie-formal-unknown-damage',
      friendlyFleetLatest: unknownFleet,
      battles: [unknownBattle],
    }
    const report = renderFormalSortie(unknownSortie, 0)

    expect(report.body).toContain('我方損害　細目未詳。判明次第後報ス。')
    expect(report.body).not.toContain('我方損害ナシ')
    expect(report.body).not.toContain('被害認メズ')
    expect(report.body).not.toContain('損傷艦ヲ認メズ')
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
    expect(postBattleLines).toHaveLength(0)
    expect(new Set(resultLines).size).toBeGreaterThan(1)
    expect(new Set(overviewLines).size).toBeGreaterThan(1)
    expect(new Set(damageLines).size).toBeGreaterThan(1)
    expect(overviewLines.some((line) => line.includes('交戦経過概ネ順調'))).toBe(false)
    expect(formal.body).toContain('戦闘後判定ニ於テ「フレッチャー」殊勲艦ト認定。')
  })

  it('keeps formal damage wording internally consistent when sortie summary has damage but node damage is unclear', () => {
    const damagedShips = ships.map((ship, index) => ({
      ...ship,
      endHp: index === 0 ? 24 : index === 2 ? 23 : ship.endHp,
    }))
    const damagedSortie: SortieSessionCapture = {
      ...sortieSession,
      id: 'sortie-damage-consistency',
      friendlyFleetLatest: damagedShips,
      battles: sortieSession.battles.map((battle) => ({
        ...battle,
        damageSummary: buildDamageAssessment(ships),
      })),
    }

    const formal = buildWarReportFromRecord(
      normalizeSortieSession(damagedSortie, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: damagedSortie,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(formal.body).toMatch(/軽微損傷艦　(?:二隻|若干|数隻)/)
    expect(formal.body).not.toContain('　我方被害　被害認メズ。')
    expect(formal.body).not.toContain('　我方被害　我方損害ナシ。')
    expect(formal.body).not.toContain('　我方被害　損傷艦ヲ認メズ。')
    expect(formal.body).toMatch(
      /交戦点別細目未詳|節別判定未詳|損傷細目後報|ジョンストン\(小破\)、ヴェールヌイ\(小破\)/,
    )
  })

  it('uses 行動総括 for our side summary while keeping 敵情総括 enemy-only in formal reports', () => {
    const formal = buildWarReportFromRecord(
      normalizeSortieSession(airPowerSortieSession, 'completed'),
      'formal_after_action',
      {
        truthSource: {
          kind: 'sortie',
          sortie: airPowerSortieSession,
        },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(formal.body).toContain('敵情総括　敵航空兵力ヲ擁スル敵部隊。')
    expect(formal.body).toContain('行動総括　敵航空兵力ヲ擁スル敵部隊ニ対シ所定ノ戦闘行動ヲ実施。')
    expect(formal.body).not.toContain('敵情判断')
    expect(formal.body).not.toContain('敵情整理')
    expect(formal.body).not.toContain('敵情所見')
  })

  it('keeps standard bulletin wording calmer than short bulletin rhetoric for main-force claims', () => {
    const mainForceRecord = normalizeSortieSession(
      {
        ...sortieSession,
        id: 'sortie-main-force-register',
        operationLabelRaw: 'ペナン島沖',
        operationPhraseRaw: 'ペナン島沖',
        battles: [
          {
            ...nodeBattle,
            operationLabelRaw: 'ペナン島沖',
            operationPhraseRaw: 'ペナン島沖',
            enemyDeckNameRaw: '敵主力艦隊',
            enemyShipNamesRaw: ['軽巡ホ級', '駆逐ロ級', '駆逐ロ級'],
            sawAirAttack: false,
          },
        ],
      },
      'completed',
    )

    const standard = buildWarReportFromRecord(mainForceRecord, 'standard_bulletin', {
      variantSeed: 6,
    })
    const short = buildWarReportFromRecord(mainForceRecord, 'short_bulletin', {
      variantSeed: 6,
    })

    expect(`${standard.bulletin}\n${standard.body}`).not.toContain('甚大ナル圧力')
    expect(`${standard.bulletin}\n${standard.body}`).not.toMatch(/壊滅的|赫々タル戦果/)
    expect(`${short.bulletin}\n${short.body}`).toMatch(/粉砕|圧倒|赫々タル戦果|大打撃|潰ユ|撃滅|潰滅/)
  })

  it('keeps standard bulletin lead and result paragraphs semantically distinct', () => {
    const mainForceRecord = normalizeSortieSession(
      {
        ...sortieSession,
        id: 'sortie-main-force-progression',
        operationLabelRaw: 'ペナン島沖',
        operationPhraseRaw: 'ペナン島沖',
        battles: [
          {
            ...nodeBattle,
            operationLabelRaw: 'ペナン島沖',
            operationPhraseRaw: 'ペナン島沖',
            enemyDeckNameRaw: '敵主力艦隊',
            enemyShipNamesRaw: ['軽巡ホ級', '駆逐ロ級', '駆逐ロ級'],
            sawAirAttack: false,
          },
        ],
      },
      'completed',
    )

    const standard = buildWarReportFromRecord(mainForceRecord, 'standard_bulletin', {
      variantSeed: 2,
    })
    const paragraphs = standard.body.split('\n\n')

    expect(paragraphs).toHaveLength(4)
    expect(paragraphs[0]).toMatch(/開始セリ|応戦セリ|之ニ対処セリ|部署ニ就ケリ|行動ヲ継続セリ/)
    expect(paragraphs[1]).toMatch(/打撃|挫折|戦果|成果/)
    expect(paragraphs[0]).not.toContain('直ニ之ヲ制圧セリ')
    expect(paragraphs[1]).not.toContain('部署ニ就ケリ')
  })

  it('keeps short bulletin closings distinct from standard bulletin public closings', () => {
    const mainForceRecord = normalizeSortieSession(
      {
        ...sortieSession,
        id: 'sortie-short-collision',
        operationLabelRaw: 'ペナン島沖',
        operationPhraseRaw: 'ペナン島沖',
        battles: [
          {
            ...nodeBattle,
            operationLabelRaw: 'ペナン島沖',
            operationPhraseRaw: 'ペナン島沖',
            enemyDeckNameRaw: '敵主力艦隊',
            enemyShipNamesRaw: ['軽巡ホ級', '駆逐ロ級', '駆逐ロ級'],
            sawAirAttack: false,
          },
        ],
      },
      'completed',
    )

    const standard = buildWarReportFromRecord(mainForceRecord, 'standard_bulletin', {
      variantSeed: 4,
    })
    const short = buildWarReportFromRecord(mainForceRecord, 'short_bulletin', {
      variantSeed: 4,
    })

    expect(short.body).toMatch(/本戦果ヲ録ス|本成果ヲ録ス|右、発表ス|一層ノ健闘ヲ祈ル|偉功ニ対シ慶祝ノ意ヲ表ス/)
    expect(short.body).not.toContain('大本営海軍部ハ本行動ノ成果ヲ公表ス。')
    expect(standard.body).not.toContain('本戦果ヲ録ス。')
    expect(standard.body).not.toContain('本成果ヲ録ス。')
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
    expect(standard.body).toMatch(/目的.*転進/)
    expect(formal.body).toContain('大破艦　一隻')
    expect(formal.body).toMatch(/細目未詳|概略把握/)
    expect(formal.body).toContain('戦果総括')
    expect(short.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(short.body).toContain('一、')
    expect(short.body).toContain('二、')
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
    expect(standard.body).toMatch(/目的.*転進/)
    expect(`${standard.bulletin}\n${standard.body}`).not.toMatch(/粉砕|赫々|壊滅的|殲滅的/)
    expect(`${standard.bulletin}\n${standard.body}`).not.toMatch(/損傷|損耗|損害|大破|中破/)
    expect(formal.body).toMatch(/大破艦　(?:二隻|若干|数隻)/)
    expect(formal.body).toContain('七、所見。')
    expect(short.selectionSnapshot?.mainNarrative).toBe('disciplined_withdrawal')
    expect(short.body).toContain('一、')
    expect(short.body).toContain('二、')
    expect(`${short.bulletin}\n${short.body}`).toMatch(/粉砕|赫々|圧倒|壊滅的/)
    expect(`${short.bulletin}\n${short.body}`).not.toMatch(/損傷|損耗|損害|大破|中破/)
    expect(`${short.bulletin}\n${short.body}`).not.toMatch(/転進|反転|離脱/)
  })

  it('keeps standard bulletins calmer than short bulletins under the same failed sortie', () => {
    const failedSortie = {
      ...sortieSession,
      friendlyFleetLatest: ships.map((ship, index) => ({
        ...ship,
        endHp: index === 0 ? 7 : index === 1 ? 8 : ship.endHp,
      })),
    }
    const record = normalizeSortieSession(failedSortie, 'failed')

    const standard = buildWarReportFromRecord(record, 'standard_bulletin')
    const short = buildWarReportFromRecord(record, 'short_bulletin')

    expect(`${standard.bulletin}\n${standard.body}`).not.toMatch(/粉砕|赫々|壊滅的|殲滅的/)
    expect(`${short.bulletin}\n${short.body}`).toMatch(/粉砕|赫々|圧倒|壊滅的|殲滅的/)
  })

  it('does not force concealment lines into every standard bulletin', () => {
    const record = normalizeSortieSession(sortieSession, 'completed')
    const concealmentPattern =
      /我ニ損害ナシ|我方損害軽微ナリ|各隊整然作戦ヲ継続セリ|我軍行動ニ支障ナシ|部隊態勢整然ナリ/

    const reports = Array.from({ length: 8 }, (_, index) =>
      buildWarReportFromRecord(record, 'standard_bulletin', { variantSeed: index + 1 }),
    )
    const concealed = reports.filter((report) => concealmentPattern.test(report.body))
    const omitted = reports.filter((report) => !concealmentPattern.test(report.body))

    expect(concealed.length).toBeGreaterThan(0)
    expect(omitted.length).toBeGreaterThan(0)
  })

  it('renders short bulletins as numbered dispatches instead of bracketed prose', () => {
    const report = buildWarReportFromRecord(normalizeSortieSession(sortieSession, 'completed'), 'short_bulletin')

    expect(report.bulletin).toContain('大本営海軍部発表')
    expect(report.body).toContain('一、')
    expect(report.body).toContain('二、')
    expect(report.body).not.toContain('【大本営発表】')
    expect(report.body).not.toContain('海軍省提供')
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
    expect(overridden.selectionSnapshot?.fingerprint).toBe(1)
    expect(overridden.selectionSnapshot?.fingerprint).not.toBe(first.selectionSnapshot?.fingerprint)
  })

  it('keeps composition summaries stable after the sortie refactor', () => {
    expect(buildFleetCompositionText(ships)).toBe('駆逐艦二隻、軽巡洋艦一隻')
  })

  it('keeps game composition detail while broadening a named battleship flagship', () => {
    const fusouFleet: FleetShipSnapshot[] = [
      {
        ...ships[0],
        nameJa: '扶桑改二',
        typeId: 10,
        typeNameJa: '航空戦艦',
      },
      ships[1],
    ]
    const fusouSession: SortieSessionCapture = {
      ...sortieSession,
      friendlyFleetInitial: fusouFleet,
      friendlyFleetLatest: fusouFleet,
      battles: [
        {
          ...nodeBattle,
          friendlyFleet: fusouFleet,
          flagshipNameRaw: '扶桑改二',
        },
      ],
    }
    const report = buildWarReportFromRecord(
      normalizeSortieSession(fusouSession, 'completed'),
      'formal_after_action',
      {
        truthSource: { kind: 'sortie', sortie: fusouSession },
        addressSnapshot: formalAddressSnapshot,
      },
    )

    expect(report.body).toContain('航空戦艦一隻、軽巡洋艦一隻。旗艦、戦艦「扶桑」。')
    expect(report.body).not.toContain('旗艦、航空戦艦「扶桑」')
    expect(report.body).not.toContain('扶桑型')

    const publicReports = Array.from({ length: 8 }, (_, index) =>
      buildWarReportFromRecord(
        normalizeSortieSession(fusouSession, 'completed'),
        'standard_bulletin',
        { variantSeed: index + 1 },
      ),
    )
    expect(
      publicReports.some((candidate) => candidate.body.includes('戦艦「扶桑」ヲ旗艦トシ')),
    ).toBe(true)
    expect(
      publicReports.every(
        (candidate) => !candidate.body.includes('航空戦艦「扶桑」ヲ旗艦トシ'),
      ),
    ).toBe(true)
  })
})
