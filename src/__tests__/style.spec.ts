import {
  __resetWarReportStyleForTests,
  getWarReportStyle,
  setWarReportStyle,
} from '../report/style'

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

describe('war report style preference store', () => {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window

  beforeEach(() => {
    installFakeStorageWindow()
    __resetWarReportStyleForTests()
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
  })

  it('defaults to the standard bulletin style', () => {
    expect(getWarReportStyle()).toBe('standard_bulletin')
  })

  it('persists the selected style across reloads', () => {
    setWarReportStyle('formal_after_action')
    expect(getWarReportStyle()).toBe('formal_after_action')
    expect(globalThis.window?.localStorage.getItem('poi-plugin-kc-war-report:style')).toBe(
      'formal_after_action',
    )

    __resetWarReportStyleForTests()
    globalThis.window?.localStorage.setItem('poi-plugin-kc-war-report:style', 'short_bulletin')

    expect(getWarReportStyle()).toBe('short_bulletin')
  })
})
