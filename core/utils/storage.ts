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

// Web fallback — uses localStorage with a namespaced prefix
class WebStorage implements KVStore {
  private prefix: string
  constructor(id: string) { this.prefix = `mmkv:${id}:` }
  private k(key: string) { return this.prefix + key }

  getString(key: string): string | undefined {
    const v = localStorage.getItem(this.k(key))
    return v === null ? undefined : v
  }

  getBoolean(key: string): boolean | undefined {
    const v = localStorage.getItem(this.k(key))
    if (v === null) return undefined
    return v === 'true'
  }

  getNumber(key: string): number | undefined {
    const v = localStorage.getItem(this.k(key))
    if (v === null) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  set(key: string, value: string | number | boolean) {
    localStorage.setItem(this.k(key), String(value))
  }

  delete(key: string) {
    localStorage.removeItem(this.k(key))
  }

  clearAll() {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(this.prefix)) toRemove.push(k)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  }
}

// Native — thin wrapper so the import is never evaluated on web
class NativeStorage implements KVStore {
  private store: import('react-native-mmkv').MMKV
  constructor(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv')
    this.store = new MMKV({ id })
  }
  getString(key: string) { return this.store.getString(key) }
  getBoolean(key: string) { return this.store.getBoolean(key) }
  getNumber(key: string) { return this.store.getNumber(key) }
  set(key: string, value: string | number | boolean) { this.store.set(key, value as never) }
  delete(key: string) { this.store.delete(key) }
  clearAll() { this.store.clearAll() }
}

export function createStorage(id: string): KVStore {
  return Platform.OS === 'web' ? new WebStorage(id) : new NativeStorage(id)
}
