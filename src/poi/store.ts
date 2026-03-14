import { importFromPoi, IN_POI } from './env'
import type { PoiState, Store, StorePath } from './types'

let globalStore: Store<PoiState> | null = null

const createFallbackState = (state?: PoiState): PoiState => ({
  ui: {
    activeMainTab: '',
    ...state?.ui,
  },
  plugins: state?.plugins ?? [],
  ...state,
})

const genFallbackStore = (state?: PoiState): Store<PoiState> => ({
  getState: () => createFallbackState(state),
  subscribe: () => () => {},
})

export const getPoiStore: () => Promise<Store<PoiState>> = async () => {
  if (globalStore !== null) {
    return globalStore
  }
  if (IN_POI) {
    try {
      const { store } = await importFromPoi<{ store: Store<PoiState> }>('views/create-store')
      globalStore = store
      return store
    } catch (error) {
      console.warn('Load global store error', error)
    }
  }
  globalStore = genFallbackStore()
  return globalStore
}

export const importPoiState = (state: PoiState) => {
  globalStore = genFallbackStore(state)
}

type PoiWindowWithStore = Window & {
  getStore?: (path?: StorePath) => unknown
}

export const getStoreValue = <T = unknown>(path?: StorePath): T | null => {
  const getter = (window as PoiWindowWithStore).getStore
  if (getter) {
    const value = getter(path)
    return (value as T | undefined) ?? null
  }

  if (!globalStore) {
    return null
  }

  const state = globalStore.getState() as Record<string, unknown>
  if (!path || path.length === 0) {
    return state as T
  }

  let current: unknown = state
  for (const segment of path) {
    if (
      current == null ||
      (typeof current !== 'object' && !Array.isArray(current)) ||
      !(segment in (current as Record<string | number, unknown>))
    ) {
      return null
    }
    current = (current as Record<string | number, unknown>)[segment]
  }

  return (current as T | undefined) ?? null
}
