import type {
  AddressSnapshot,
  GeneratedWarReport,
  WarReportSelectionSnapshot,
  NormalizedWarReportRecord,
  WarReportHistoryEntry,
  WarReportRenderOptions,
  WarReportStyle,
  WarReportTruthSource,
} from '../battle/types'
import { routeWarRecord } from '../battle/route'

import { generateWarReport } from './generate'
import { buildFormalAddressSnapshot } from './preferences'

const hashString = (input: string) => {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export const createVariantSeed = (
  record: NormalizedWarReportRecord,
  truthSource?: WarReportTruthSource | null,
) =>
  hashString(
    JSON.stringify({
      occurredAt: record.occurredAt,
      kind: record.kind,
      operationLabel: record.operationLabel,
      operationPhrase: record.operationPhrase,
      mapLabel: record.mapLabel,
      enemyCategory: record.enemyCategory,
      winRank: record.winRank,
      status: record.status,
      failureMode: record.failureMode,
      damageSeverity: record.damageSummary.severity,
      mvpName: record.mvpName,
      flagshipName: record.flagshipName,
      nodeCount: record.nodeCount,
      nodeTrail:
        truthSource?.kind === 'sortie'
          ? truthSource.sortie.nodeTrail
          : truthSource?.kind === 'practice'
            ? [truthSource.practice.operationPhraseRaw]
            : [],
      truthKind: truthSource?.kind ?? null,
    }),
  )

const getDefaultAddressSnapshot = (): AddressSnapshot => buildFormalAddressSnapshot()

const extractRecentReports = (
  entries: WarReportHistoryEntry[],
): Partial<Record<WarReportStyle, GeneratedWarReport[]>> => ({
  standard_bulletin: entries
    .map((entry) => entry.renderedReports?.standard_bulletin ?? entry.report)
    .filter((report): report is GeneratedWarReport => report != null)
    .slice(0, 5),
  short_bulletin: entries
    .map((entry) => entry.renderedReports?.short_bulletin)
    .filter((report): report is GeneratedWarReport => report != null)
    .slice(0, 5),
  formal_after_action: entries
    .map((entry) => entry.renderedReports?.formal_after_action)
    .filter((report): report is GeneratedWarReport => report != null)
    .slice(0, 5),
})

const extractRecentSelections = (
  entries: WarReportHistoryEntry[],
): Partial<Record<WarReportStyle, WarReportSelectionSnapshot[]>> => ({
  standard_bulletin: entries
    .map(
      (entry) =>
        entry.selectionSnapshots?.standard_bulletin ??
        entry.renderedReports?.standard_bulletin?.selectionSnapshot,
    )
    .filter((snapshot): snapshot is WarReportSelectionSnapshot => snapshot != null)
    .slice(0, 20),
  short_bulletin: entries
    .map(
      (entry) =>
        entry.selectionSnapshots?.short_bulletin ??
        entry.renderedReports?.short_bulletin?.selectionSnapshot,
    )
    .filter((snapshot): snapshot is WarReportSelectionSnapshot => snapshot != null)
    .slice(0, 20),
  formal_after_action: entries
    .map(
      (entry) =>
        entry.selectionSnapshots?.formal_after_action ??
        entry.renderedReports?.formal_after_action?.selectionSnapshot,
    )
    .filter((snapshot): snapshot is WarReportSelectionSnapshot => snapshot != null)
    .slice(0, 20),
})

export const buildWarReportFromRecord = (
  record: NormalizedWarReportRecord,
  style: WarReportStyle = 'standard_bulletin',
  options: WarReportRenderOptions = {},
): GeneratedWarReport =>
  generateWarReport(routeWarRecord(record), style, {
    ...options,
    variantSeed: options.variantSeed ?? createVariantSeed(record, options.truthSource),
    addressSnapshot: options.addressSnapshot ?? getDefaultAddressSnapshot(),
  })

export const buildRenderedReportsForHistoryEntry = (
  record: NormalizedWarReportRecord,
  truthSource: WarReportTruthSource | null,
  addressSnapshot: AddressSnapshot | null,
  recentEntries: WarReportHistoryEntry[],
) => {
  const variantSeed = createVariantSeed(record, truthSource)
  const resolvedAddressSnapshot = addressSnapshot ?? getDefaultAddressSnapshot()
  const recentReports = extractRecentReports(recentEntries)
  const recentSelections = extractRecentSelections(recentEntries)

  const renderedReports: Partial<Record<WarReportStyle, GeneratedWarReport>> = {
    standard_bulletin: buildWarReportFromRecord(record, 'standard_bulletin', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
      recentSelections,
    }),
    short_bulletin: buildWarReportFromRecord(record, 'short_bulletin', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
      recentSelections,
    }),
    formal_after_action: buildWarReportFromRecord(record, 'formal_after_action', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
      recentSelections,
    }),
  }

  const selectionSnapshots: Partial<Record<WarReportStyle, WarReportSelectionSnapshot>> = {}

  if (renderedReports.standard_bulletin?.selectionSnapshot) {
    selectionSnapshots.standard_bulletin = renderedReports.standard_bulletin.selectionSnapshot
  }
  if (renderedReports.short_bulletin?.selectionSnapshot) {
    selectionSnapshots.short_bulletin = renderedReports.short_bulletin.selectionSnapshot
  }
  if (renderedReports.formal_after_action?.selectionSnapshot) {
    selectionSnapshots.formal_after_action = renderedReports.formal_after_action.selectionSnapshot
  }

  return {
    variantSeed,
    addressSnapshot: resolvedAddressSnapshot,
    renderedReports,
    selectionSnapshots,
  }
}

export const getWarReportForHistoryEntry = (
  entry: WarReportHistoryEntry,
  style: WarReportStyle = 'standard_bulletin',
): GeneratedWarReport =>
  entry.renderedReports?.[style] ??
  buildWarReportFromRecord(entry.record, style, {
    variantSeed: entry.variantSeed,
    addressSnapshot: entry.addressSnapshot ?? undefined,
    truthSource: entry.truthSource ?? undefined,
  })
