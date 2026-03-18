import {
  __resetWarReportAddressPreferencesForTests,
  buildFormalAddressSnapshot,
  getWarReportAddressPreferences,
  setDetectedAdmiralIdentity,
  updateWarReportAddressPreferences,
} from '../report/preferences'

const installFakeStorageWindow = () => {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }

  Object.defineProperty(globalThis, 'window', {
    value: { localStorage },
    configurable: true,
    writable: true,
  })

  return localStorage
}

describe('formal report addressing preferences', () => {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window

  beforeEach(() => {
    installFakeStorageWindow()
    __resetWarReportAddressPreferencesForTests()
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('defaults to using detected admiral sender with a formal recipient', () => {
    expect(getWarReportAddressPreferences()).toEqual({
      formalSenderFallback: '出撃艦隊提督',
      formalRecipient: '聯合艦隊司令部',
      useDetectedAdmiralSender: true,
    })
  })

  it('persists updated fallback and recipient settings', () => {
    updateWarReportAddressPreferences({
      formalSenderFallback: '横須賀鎮守府附提督',
      formalRecipient: '第一遊撃部隊司令部',
      useDetectedAdmiralSender: false,
    })

    __resetWarReportAddressPreferencesForTests()
    globalThis.window?.localStorage.setItem(
      'poi-plugin-kc-war-report:formal-addressing',
      JSON.stringify({
        formalSenderFallback: '横須賀鎮守府附提督',
        formalRecipient: '第一遊撃部隊司令部',
        useDetectedAdmiralSender: false,
      }),
    )

    expect(getWarReportAddressPreferences().formalRecipient).toBe('第一遊撃部隊司令部')
    expect(getWarReportAddressPreferences().useDetectedAdmiralSender).toBe(false)
  })

  it('builds sender lines from detected admiral identity when available', () => {
    setDetectedAdmiralIdentity({
      name: '夜詠',
      rankValue: 4,
      rankLabel: '少将',
    })

    const snapshot = buildFormalAddressSnapshot()

    expect(snapshot.senderLine).toBe('発：少将 夜詠')
    expect(snapshot.recipientLine).toBe('宛：聯合艦隊司令部')
    expect(snapshot.usesDetectedAdmiralSender).toBe(true)
  })
})
