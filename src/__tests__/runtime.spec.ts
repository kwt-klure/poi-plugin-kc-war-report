import { normalizeSortieSession } from '../battle/model'
import {
  __detectAirAttackFromPacketForTests,
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
})
