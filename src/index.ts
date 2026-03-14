// See https://dev.poooi.app/docs/plugin-exports.html

import { startBattleListener, stopBattleListener } from './battle/runtime'

export const windowMode = false

export const pluginDidLoad = () => {
  startBattleListener()
}

export const pluginWillUnload = () => {
  stopBattleListener()
}

export { App as reactClass } from './App'
export { Settings as settingsClass } from './Settings'
