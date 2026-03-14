import type { GeneratedWarReport, NormalizedWarReportRecord, WarReportStyle } from '../battle/types'
import { routeWarRecord } from '../battle/route'

import { generateWarReport } from './generate'

export const buildWarReportFromRecord = (
  record: NormalizedWarReportRecord,
  style: WarReportStyle = 'standard_bulletin',
): GeneratedWarReport => generateWarReport(routeWarRecord(record), style)
