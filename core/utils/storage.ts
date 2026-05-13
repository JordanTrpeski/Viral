import { Platform } from 'react-native'

// Minimal MMKV-compatible interface used across the app
export interface KVStore {
  getString(key: string): string | undefined
  getBoolean(key: string): boolean | undefined
  getNumber(key: string): number | undefined
  set(key: string, value: string | number | boolean): void
  delete(key: string): void
  clearAll(): void
}

// Safe localStorage accessor — returns null in SSR/Node where localStorage
// may exist but not implement the Storage interface (Expo SSR stub)
function ls(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  if (typeof localStorage.getItem !== 'function') return null
  return localStorage
}

// Web fallback — uses localStorage with a namespaced prefix
class WebStorage implements KVStore {
  private prefix: string
  constructor(id: string) { this.prefix = `mmkv:${id}:` }
  private k(key: string) { return this.prefix + key }

  getString(key: string): string | undefined {
    const v = ls()?.getItem(this.k(key)) ?? null
    return v === null ? undefined : v
  }

  getBoolean(key: string): boolean | undefined {
    const v = ls()?.getItem(this.k(key)) ?? null
    if (v === null) return undefined
    return v === 'true'
  }

  getNumber(key: string): number | undefined {
    const v = ls()?.getItem(this.k(key)) ?? null
    if (v === null) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  set(key: string, value: string | number | boolean) {
    ls()?.setItem(this.k(key), String(value))
  }

  delete(key: string) {
    ls()?.removeItem(this.k(key))
  }

  clearAll() {
    const store = ls()
    if (!store) return
    const toRemove: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k?.startsWith(this.prefix)) toRemove.push(k)
    }
    toRemove.forEach(k => store.removeItem(k))
  }
}

// In-memory fallback used when MMKV native module fails to initialize
class MemoryStorage implements KVStore {
  private data: Map<string, string> = new Map()
  getString(key: string): string | undefined { return this.data.get(key) }
  getBoolean(key: string): boolean | undefined {
    const v = this.data.get(key)
    return v === undefined ? undefined : v === 'true'
  }
  getNumber(key: string): number | undefined {
    const v = this.data.get(key)
    if (v === undefined) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }
  set(key: string, value: string | number | boolean) { this.data.set(key, String(value)) }
  delete(key: string) { this.data.delete(key) }
  clearAll() { this.data.clear() }
}

// Native — thin wrapper so the import is never evaluated on web
class NativeStorage implements KVStore {
  private store: KVStore
  constructor(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv')
      const mmkv = createMMKV({ id })
      this.store = {
        getString: (key) => mmkv.getString(key),
        getBoolean: (key) => mmkv.getBoolean(key),
        getNumber: (key) => mmkv.getNumber(key),
        set: (key, value) => mmkv.set(key, value),
        delete: (key) => { mmkv.remove(key) },
        clearAll: () => mmkv.clearAll(),
      }
    } catch {
      // Native module not ready (e.g. dev build cold start) — use memory fallback
      this.store = new MemoryStorage()
    }
  }
  getString(key: string) { return this.store.getString(key) }
  getBoolean(key: string) { return this.store.getBoolean(key) }
  getNumber(key: string) { return this.store.getNumber(key) }
  set(key: string, value: string | number | boolean) { this.store.set(key, value) }
  delete(key: string) { this.store.delete(key) }
  clearAll() { this.store.clearAll() }
}

export function createStorage(id: string): KVStore {
  return Platform.OS === 'web' ? new WebStorage(id) : new NativeStorage(id)
}
