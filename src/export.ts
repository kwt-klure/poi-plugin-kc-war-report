import type { GeneratedWarReport } from './battle/types'
import { IN_POI } from './poi/env'

type PoiRemote = {
  app?: { getPath?: (name: string) => string }
  dialog?: {
    showSaveDialog?: (options: {
      defaultPath: string
      filters: Array<{ name: string; extensions: string[] }>
    }) => Promise<{ canceled: boolean; filePath?: string }>
  }
  require?: (name: string) => {
    writeFileSync: (path: string, data: string) => void
  }
}

type ElectronClipboard = {
  writeText?: (value: string) => void
}

type ElectronRemote = {
  clipboard?: ElectronClipboard
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export const buildPlainTextReport = (report: GeneratedWarReport) =>
  [report.bulletin, '', report.body].join('\n')

export const getReportFileName = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  return `kancolle_war_report_${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(
    date.getDate(),
  )}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}.txt`
}

const getPoiRemote = (): PoiRemote => {
  const remote = (window as Window & { remote?: PoiRemote; require?: PoiRemote['require'] }).remote
  const requireFn = (window as Window & { require?: PoiRemote['require'] }).require

  return {
    ...remote,
    require: remote?.require ?? requireFn,
  }
}

const getElectronClipboard = (): ElectronClipboard | null => {
  const requireFn = (window as Window & {
    require?: (name: string) => ElectronRemote
  }).require

  if (!requireFn) {
    return null
  }

  try {
    return requireFn('electron').clipboard ?? null
  } catch {
    return null
  }
}

export const copyReportToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const clipboard = getElectronClipboard()
  if (clipboard?.writeText) {
    clipboard.writeText(text)
    return
  }

  throw new Error('Clipboard API is unavailable in the current environment.')
}

export const exportReportToFile = async (text: string, timestamp = Date.now()) => {
  const remote = getPoiRemote()
  const app = remote.app
  const dialog = remote.dialog
  const fs = remote.require?.('fs')

  if (!IN_POI || !app?.getPath || !dialog?.showSaveDialog || !fs?.writeFileSync) {
    throw new Error('Export is only available inside the Poi environment.')
  }

  const downloads = app.getPath('downloads')
  const defaultPath = `${downloads}/${getReportFileName(timestamp)}`
  const result = await dialog.showSaveDialog({
    defaultPath,
    filters: [{ name: 'Text', extensions: ['txt'] }],
  })

  if (result.canceled || !result.filePath) {
    return false
  }

  fs.writeFileSync(result.filePath, text)
  return true
}
