import { normalizeSortieSession } from '../battle/model'
import {
  __detectAirAttackFromPacketForTests,
  __extractAntiAirSummaryFromPacketForTests,
  __extractAntiSubmarineSummaryFromPacketForTests,
  __extractCarrierAirLossSummaryFromPacketForTests,
  __extractEnemyFlagshipSunkSummaryFromPacketForTests,
  __resolveDeckIdForTests,
  refreshFleetSnapshotFromStore,
} from '../battle/runtime'
import type { FleetShipSnapshot, SortieSessionCapture } from '../battle/types'
import { importPoiState } from '../poi/store'
import type { PoiState } from '../poi/types'

const sortieShips: FleetShipSnapshot[] = [
  {
    instanceId: 11,
    shipId: 501,
    nameJa: '神風改',
    typeId: 2,
    typeNameJa: '駆逐艦',
    level: 90,
    startHp: 30,
    endHp: 30,
    maxHp: 30,
  },
  {
    instanceId: 12,
    shipId: 502,
    nameJa: '最上改二特',
    typeId: 6,
    typeNameJa: '航空巡洋艦',
    level: 99,
    startHp: 57,
    endHp: 57,
    maxHp: 57,
  },
]

const sortieSession: SortieSessionCapture = {
  id: 'runtime-refresh-sortie',
  startedAt: Date.UTC(2026, 2, 14, 8, 0, 0),
  updatedAt: Date.UTC(2026, 2, 14, 8, 12, 0),
  mapLabel: '7-3',
  operationLabelRaw: 'ペナン島沖',
  operationPhraseRaw: 'ペナン島沖',
  friendlyFleetInitial: sortieShips,
  friendlyFleetLatest: sortieShips,
  nodeTrail: ['Node 1', 'Node 3'],
  battles: [],
}

describe('battle runtime fleet refresh', () => {
  it('refreshes return-to-port hp from Poi store before sortie normalization', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
    })

    const state: PoiState = {
      ui: {
        activeMainTab: '',
      },
      plugins: [],
      info: {
        ships: {
          '11': {
            api_id: 11,
            api_ship_id: 501,
            api_lv: 90,
            api_nowhp: 30,
            api_maxhp: 30,
          },
          '12': {
            api_id: 12,
            api_ship_id: 502,
            api_lv: 99,
            api_nowhp: 11,
            api_maxhp: 57,
          },
        },
      },
      const: {
        $ships: {
          '501': {
            api_name: '神風改',
            api_stype: 2,
          },
          '502': {
            api_name: '最上改二特',
            api_stype: 6,
          },
        },
        $shipTypes: {
          '2': {
            api_name: '駆逐艦',
          },
          '6': {
            api_name: '航空巡洋艦',
          },
        },
      },
    }

    importPoiState(state)

    const refreshedFleet = refreshFleetSnapshotFromStore(sortieSession.friendlyFleetLatest)

    expect(refreshedFleet[1]?.endHp).toBe(11)

    const record = normalizeSortieSession(
      {
        ...sortieSession,
        friendlyFleetLatest: refreshedFleet,
      },
      'completed',
    )

    expect(record.damageSummary.severity).toBe('heavy')
    expect(record.damageSummary.heavyDamageCount).toBe(1)
    expect(record.damageSummary.label).toBe('我方相応ノ損害')
  })

  it('prefers the locked sortie deck before falling back to first fleet', () => {
    const resolvedDeckId = __resolveDeckIdForTests(
      {
        path: '/kcsapi/api_req_map/next',
        body: {
          api_maparea_id: 1,
          api_mapinfo_no: 1,
          api_no: 2,
        },
        postBody: {},
      },
      {
        sortieDeckId: 4,
        battleDeckId: 1,
        activeFleetId: 1,
      },
    )

    expect(resolvedDeckId).toBe(4)
  })

  it('uses active fleet id before defaulting to first fleet when deck id is absent', () => {
    const resolvedDeckId = __resolveDeckIdForTests(
      {
        path: '/kcsapi/api_req_practice/battle',
        body: {},
        postBody: {},
      },
      {
        activeFleetId: 4,
      },
    )

    expect(resolvedDeckId).toBe(4)
  })

  it('only treats battle packets with meaningful air-phase data as air attacks', () => {
    expect(
      __detectAirAttackFromPacketForTests({
        api_kouku: {
          api_stage1: null,
          api_stage2: null,
          api_stage3: null,
        },
      }),
    ).toBe(false)

    expect(
      __detectAirAttackFromPacketForTests({
        api_kouku: {
          api_stage1: {
            api_f_count: [18, 18],
          },
        },
      }),
    ).toBe(true)
  })

  it('extracts anti-air summary from api_air_fire and enemy lost counts', () => {
    const summary = __extractAntiAirSummaryFromPacketForTests(
      {
        api_kouku: {
          api_stage2: {
            api_e_lostcount: [18, 24, 0, 11],
            api_air_fire: {
              api_idx: 1,
              api_kind: 3,
            },
          },
        },
      },
      sortieShips,
    )

    expect(summary).toEqual({
      triggered: true,
      shipNameRaw: '最上改二特',
      ciKind: 3,
      enemyPlaneLoss: 53,
    })
  })

  it('accumulates enemy plane losses across multiple visible air phases', () => {
    const summary = __extractAntiAirSummaryFromPacketForTests(
      {
        api_kouku: {
          api_stage2: {
            api_e_lostcount: [8, 12],
            api_air_fire: {
              api_idx: 0,
              api_kind: 1,
            },
          },
        },
        api_injection_kouku: {
          api_stage2: {
            api_e_lostcount: [6, 4],
          },
        },
        api_air_base_attack: [
          {
            api_stage2: {
              api_e_lostcount: [10],
            },
          },
        ],
      },
      sortieShips,
    )

    expect(summary?.enemyPlaneLoss).toBe(40)
  })

  it('does not build anti-air summary when api_air_fire is absent', () => {
    const summary = __extractAntiAirSummaryFromPacketForTests(
      {
        api_kouku: {
          api_stage2: {
            api_e_lostcount: [30, 18],
          },
        },
      },
      sortieShips,
    )

    expect(summary).toBeNull()
  })

  it('keeps combined-fleet anti-air credit anonymous when fleet ownership is ambiguous', () => {
    const summary = __extractAntiAirSummaryFromPacketForTests(
      {
        api_f_nowhps_combined: [30, 30, 30, 30, 30, 30],
        api_kouku: {
          api_stage2: {
            api_e_lostcount: [20, 14],
            api_air_fire: {
              api_idx: 0,
              api_kind: 1,
            },
          },
        },
      },
      sortieShips,
    )

    expect(summary).toEqual({
      triggered: true,
      shipNameRaw: null,
      ciKind: 1,
      enemyPlaneLoss: 34,
    })
  })

  it('extracts named anti-submarine contribution from aligned shelling arrays', () => {
    importPoiState({
      ui: { activeMainTab: '' },
      plugins: [],
      const: {
        $ships: {
          '3001': { api_name: '潜水カ級', api_stype: 13 },
          '3002': { api_name: '潜水ヨ級', api_stype: 13 },
          '3003': { api_name: '駆逐イ級', api_stype: 2 },
        },
      },
    })

    const summary = __extractAntiSubmarineSummaryFromPacketForTests(
      {
        api_ship_ke: [3001, 3002, 3003],
        api_e_maxhps: [30, 40, 20],
        api_opening_taisen: {
          api_at_eflag: [0, 0, 1],
          api_at_list: [0, 1, 0],
          api_df_list: [[0, 1], [2], [0]],
          api_damage: [[18, 52], [99], [30]],
        },
      },
      sortieShips,
    )

    expect(summary).toEqual({
      triggered: true,
      contributions: [
        {
          shipNameRaw: '神風改',
          damagingHitCount: 2,
          targetCount: 2,
          assessedDamage: 58,
        },
      ],
    })
  })

  it('keeps an unmapped combined-fleet anti-submarine attacker anonymous', () => {
    importPoiState({
      ui: { activeMainTab: '' },
      plugins: [],
      const: {
        $ships: {
          '3011': { api_name: '潜水ソ級', api_stype: 13 },
        },
      },
    })

    const summary = __extractAntiSubmarineSummaryFromPacketForTests(
      {
        api_ship_ke: [3011],
        api_e_maxhps: [48],
        api_f_nowhps_combined: [30, 30, 30, 30, 30, 30],
        api_hougeki1: {
          api_at_eflag: [0],
          api_at_list: [0],
          api_df_list: [[0]],
          api_damage: [[63]],
        },
      },
      sortieShips,
    )

    expect(summary).toEqual({
      triggered: true,
      contributions: [
        {
          shipNameRaw: null,
          damagingHitCount: 1,
          targetCount: 1,
          assessedDamage: 48,
        },
      ],
    })
  })

  it('fails closed on malformed anti-submarine phase arrays', () => {
    importPoiState({
      ui: { activeMainTab: '' },
      plugins: [],
      const: {
        $ships: {
          '3021': { api_name: '潜水カ級', api_stype: 13 },
        },
      },
    })

    expect(
      __extractAntiSubmarineSummaryFromPacketForTests(
        {
          api_ship_ke: [3021],
          api_e_maxhps: [20],
          api_hougeki1: {
            api_at_eflag: [0],
            api_at_list: [0],
            api_df_list: [[0, 0]],
            api_damage: [[12]],
          },
        },
        sortieShips,
      ),
    ).toBeNull()
  })

  it('extracts carrier-air-loss summary when enemy carriers end the battle at heavy damage or worse', () => {
    const state: PoiState = {
      ui: {
        activeMainTab: '',
      },
      plugins: [],
      const: {
        $ships: {
          '1901': {
            api_name: '空母ヲ級改',
            api_stype: 11,
            api_maxeq: [18, 36, 36, 28],
          },
          '1902': {
            api_name: '軽巡ツ級',
            api_stype: 3,
          },
        },
      },
    }

    importPoiState(state)

    const summary = __extractCarrierAirLossSummaryFromPacketForTests({
      api_ship_ke: [1901, 1902],
      api_e_nowhps: [20, 30],
      api_e_maxhps: [80, 30],
    })

    expect(summary).toEqual({
      triggered: true,
      carrierLossCount: 1,
      carrierAircraftLossEstimate: 118,
    })
  })

  it('does not build carrier-air-loss summary for non-carrier losses', () => {
    const state: PoiState = {
      ui: {
        activeMainTab: '',
      },
      plugins: [],
      const: {
        $ships: {
          '1951': {
            api_name: '重巡ネ級',
            api_stype: 5,
            api_maxeq: [18, 18, 18],
          },
        },
      },
    }

    importPoiState(state)

    const summary = __extractCarrierAirLossSummaryFromPacketForTests({
      api_ship_ke: [1951],
      api_e_nowhps: [10],
      api_e_maxhps: [40],
    })

    expect(summary).toBeNull()
  })

  it('does not build carrier-air-loss summary when carrier maxeq data is unavailable', () => {
    const state: PoiState = {
      ui: {
        activeMainTab: '',
      },
      plugins: [],
      const: {
        $ships: {
          '1991': {
            api_name: '空母ヲ級flagship',
            api_stype: 11,
          },
        },
      },
    }

    importPoiState(state)

    const summary = __extractCarrierAirLossSummaryFromPacketForTests({
      api_ship_ke: [1991],
      api_e_nowhps: [15],
      api_e_maxhps: [70],
    })

    expect(summary).toBeNull()
  })

  it('requires a confirmed zero-hp enemy flagship before reporting flagship sunk', () => {
    const state: PoiState = {
      ui: {
        activeMainTab: '',
      },
      plugins: [],
      const: {
        $ships: {
          '2101': {
            api_name: '戦艦レ級',
            api_stype: 9,
          },
        },
      },
    }

    importPoiState(state)

    expect(
      __extractEnemyFlagshipSunkSummaryFromPacketForTests({
        api_ship_ke: [2101, 1902],
        api_e_nowhps: [0, 30],
        api_e_maxhps: [130, 30],
      }),
    ).toEqual({
      triggered: true,
      enemyShipId: 2101,
      enemyNameRaw: '戦艦レ級',
    })

    expect(
      __extractEnemyFlagshipSunkSummaryFromPacketForTests({
        api_ship_ke: [2101],
        api_e_nowhps: [1],
        api_e_maxhps: [130],
      }),
    ).toBeNull()

    expect(
      __extractEnemyFlagshipSunkSummaryFromPacketForTests({
        api_ship_ke: [2101],
        api_e_nowhps: [0],
        api_e_maxhps: [],
      }),
    ).toBeNull()
  })
})
