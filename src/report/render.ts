import type {
  AddressSnapshot,
  GeneratedWarReport,
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
      enemyDisplay: record.enemyDisplay,
      winRank: record.winRank,
      status: record.status,
      nodeCount: record.nodeCount,
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

  const renderedReports: Partial<Record<WarReportStyle, GeneratedWarReport>> = {
    standard_bulletin: buildWarReportFromRecord(record, 'standard_bulletin', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
    }),
    short_bulletin: buildWarReportFromRecord(record, 'short_bulletin', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
    }),
    formal_after_action: buildWarReportFromRecord(record, 'formal_after_action', {
      variantSeed,
      truthSource,
      addressSnapshot: resolvedAddressSnapshot,
      recentReports,
    }),
  }

  return {
    variantSeed,
    addressSnapshot: resolvedAddressSnapshot,
    renderedReports,
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
