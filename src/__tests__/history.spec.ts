import {
  __resetWarReportHistoryForTests,
  appendWarReportHistoryEntry,
  clearWarReportHistory,
  deleteWarReportHistoryEntry,
  getCurrentInProgressSortie,
  getWarReportHistoryView,
  selectWarReportHistoryEntry,
  setCurrentInProgressSortie,
} from '../battle/history'
import type {
  GeneratedWarReport,
  NormalizedWarReportRecord,
  SortieSessionCapture,
  WarReportSelectionSnapshot,
} from '../battle/types'

const baseRecord: NormalizedWarReportRecord = {
  occurredAt: Date.UTC(2026, 2, 14, 4, 30, 0),
  kind: 'sortie',
  status: 'completed',
  failureMode: null,
  operationLabel: 'バシー海峡',
  operationPhrase: 'バシー海峡',
  mapLabel: '1-6',
  friendlyFleet: [],
  friendlySummary: '軽巡洋艦一隻、駆逐艦二隻',
  enemyCategory: 'patrol_force',
  enemyDisplayPolicy: 'fixed_enemy_category',
  enemyDisplay: '敵前衛部隊',
  enemyForceLabel: '敵前衛部隊',
  headlineEnemyPhrase: '敵前衛部隊ヲ撃退シ',
  engagementCategory: 'surface_engagement',
  resultCategory: 'decisive_success',
  damageSummary: {
    severity: 'none',
    label: '我方損害ナシ',
    detail: '我方各艦に損害なし。',
    damagedShipCount: 0,
    heavyDamageCount: 0,
    moderateDamageCount: 0,
  },
  highlightFlags: {
    antiAirScreen: false,
    mvpHighlighted: true,
  },
  entityRenderPolicy: 'direct_name_alias',
  flagshipName: '由良改二',
  mvpName: '秋月',
  practiceOpponent: null,
  winRank: 'S',
  sawAirAttack: false,
  nodeCount: 2,
}

const baseReport: GeneratedWarReport = {
  bulletin: '海軍省提供',
  body: '【大本営海軍報道部発表】',
}

const baseSelectionSnapshot: WarReportSelectionSnapshot = {
  style: 'standard_bulletin',
  mainNarrative: 'mission_completion',
  fingerprint: 12345,
  slotFamilies: {
    headline: 'headline-mission-success',
    closing: 'closing-public-merit',
  },
}

const inProgressSortie: SortieSessionCapture = {
  id: 'sortie-1',
  startedAt: baseRecord.occurredAt,
  updatedAt: baseRecord.occurredAt + 60_000,
  mapLabel: '1-6',
  operationLabelRaw: '1-6 海域',
  operationPhraseRaw: '1-6 海域',
  friendlyFleetInitial: [],
  friendlyFleetLatest: [],
  nodeTrail: ['Node 1', 'Node 2'],
  battles: [],
}

describe('war report history store', () => {
  beforeEach(() => {
    __resetWarReportHistoryForTests()
  })

  it('appends sortie entries and follows the latest report by default', () => {
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
    })

    const view = getWarReportHistoryView()
    expect(view.entries).toHaveLength(1)
    expect(view.latestEntry?.record.operationLabel).toBe('バシー海峡')
    expect(view.selectedEntry?.id).toBe(view.latestEntry?.id)
    expect(view.latestEntry?.renderedReports?.standard_bulletin).toEqual(baseReport)
    expect(view.latestEntry?.addressSnapshot?.recipientLine).toBe('宛：聯合艦隊司令部')
  })

  it('derives selection snapshots from rendered reports for backward-compatible persistence', () => {
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
      renderedReports: {
        standard_bulletin: {
          ...baseReport,
          selectionSnapshot: baseSelectionSnapshot,
        },
      },
    })

    const entry = getWarReportHistoryView().latestEntry
    expect(entry?.selectionSnapshots?.standard_bulletin).toEqual(baseSelectionSnapshot)
  })

  it('repairs persisted marshal sender wording in address snapshots and formal bodies', () => {
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
      addressSnapshot: {
        senderLine: '発：海軍元帥海軍大将 某',
        recipientLine: '宛：聯合艦隊司令部',
        usesDetectedAdmiralSender: true,
        detectedAdmiral: {
          name: '某',
          rankValue: 1,
          rankLabel: '海軍元帥海軍大将',
        },
      },
      renderedReports: {
        standard_bulletin: baseReport,
        formal_after_action: {
          bulletin: '戦闘詳報',
          body: '発：海軍元帥海軍大将 某\n宛：聯合艦隊司令部\n\n以上',
        },
      },
    })

    const entry = getWarReportHistoryView().latestEntry
    expect(entry?.addressSnapshot?.senderLine).toBe('発：元帥海軍大将 某')
    expect(entry?.addressSnapshot?.detectedAdmiral?.rankLabel).toBe('元帥海軍大将')
    expect(entry?.renderedReports?.formal_after_action?.body).toContain('発：元帥海軍大将 某')
    expect(entry?.renderedReports?.formal_after_action?.body).not.toContain(
      '発：海軍元帥海軍大将 某',
    )
  })

  it('returns a stable snapshot reference until store state changes', () => {
    const firstView = getWarReportHistoryView()
    const secondView = getWarReportHistoryView()
    expect(secondView).toBe(firstView)

    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
    })

    const thirdView = getWarReportHistoryView()
    expect(thirdView).not.toBe(secondView)

    const fourthView = getWarReportHistoryView()
    expect(fourthView).toBe(thirdView)
  })

  it('keeps viewing an older entry when a new record arrives', () => {
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
    })
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt + 1,
      entryType: 'sortie',
      status: 'completed',
      record: { ...baseRecord, occurredAt: baseRecord.occurredAt + 1, operationLabel: 'ブルネイ泊地沖' },
      report: baseReport,
    })

    const olderId = getWarReportHistoryView().entries[1]?.id
    expect(olderId).toBeTruthy()

    selectWarReportHistoryEntry(olderId!)
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt + 2,
      entryType: 'practice',
      status: 'completed',
      record: {
        ...baseRecord,
        occurredAt: baseRecord.occurredAt + 2,
        operationLabel: '対抗演習',
        kind: 'practice',
        status: 'completed',
        engagementCategory: 'practice_engagement',
        nodeCount: 1,
      },
      report: baseReport,
    })

    expect(getWarReportHistoryView().selectedEntry?.id).toBe(olderId)
  })

  it('persists and clears an in-progress sortie separately from finalized history', () => {
    const beforeSession = getWarReportHistoryView()
    setCurrentInProgressSortie(inProgressSortie)
    const afterSession = getWarReportHistoryView()

    expect(afterSession).not.toBe(beforeSession)
    expect(getCurrentInProgressSortie()?.id).toBe('sortie-1')
    expect(afterSession.entries).toHaveLength(0)

    const beforeClear = getWarReportHistoryView()
    setCurrentInProgressSortie(null)
    const afterClear = getWarReportHistoryView()

    expect(afterClear).not.toBe(beforeClear)
    expect(getCurrentInProgressSortie()).toBeNull()
  })

  it('supports deleting one entry and clearing all history', () => {
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt,
      entryType: 'sortie',
      status: 'completed',
      record: baseRecord,
      report: baseReport,
    })
    appendWarReportHistoryEntry({
      capturedAt: baseRecord.occurredAt + 1,
      entryType: 'sortie',
      status: 'failed',
      record: { ...baseRecord, occurredAt: baseRecord.occurredAt + 1, status: 'failed' },
      report: baseReport,
    })

    const latestId = getWarReportHistoryView().latestEntry?.id
    const beforeDelete = getWarReportHistoryView()
    deleteWarReportHistoryEntry(latestId!)
    const afterDelete = getWarReportHistoryView()

    expect(afterDelete).not.toBe(beforeDelete)
    expect(afterDelete.entries).toHaveLength(1)

    const beforeClear = getWarReportHistoryView()
    clearWarReportHistory()
    const afterClear = getWarReportHistoryView()

    expect(afterClear).not.toBe(beforeClear)
    expect(afterClear.entries).toHaveLength(0)
    expect(afterClear.selectedEntry).toBeNull()
    expect(getCurrentInProgressSortie()).toBeNull()
  })

  it('caps history length at 100 entries', () => {
    for (let index = 0; index < 105; index += 1) {
      appendWarReportHistoryEntry({
        capturedAt: baseRecord.occurredAt + index,
        entryType: 'sortie',
        status: 'completed',
        record: {
          ...baseRecord,
          occurredAt: baseRecord.occurredAt + index,
          operationLabel: `戦役 ${index}`,
        },
        report: baseReport,
      })
    }

    const view = getWarReportHistoryView()
    expect(view.entries).toHaveLength(100)
    expect(view.entries[0]?.record.operationLabel).toBe('戦役 104')
    expect(view.entries[99]?.record.operationLabel).toBe('戦役 5')
  })
})
