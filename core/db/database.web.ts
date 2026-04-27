// Web stub — expo-sqlite requires WebAssembly which Metro can't bundle.
// All query functions return empty results; the app renders but shows no data.
// Use a real device or Android emulator for full functionality.

const noop = () => {}

function notSupported(method: string) {
  console.warn(`[web] SQLite.${method} called — no-op on web`)
}

export const db = {
  execSync: (_sql: string) => { notSupported('execSync') },
  runSync: (_sql: string, _params?: unknown[]) => { notSupported('runSync'); return { lastInsertRowId: 0, changes: 0 } },
  getAllSync: <T = unknown>(_sql: string, _params?: unknown[]): T[] => { return [] },
  getFirstSync: <T = unknown>(_sql: string, _params?: unknown[]): T | null => { return null },
} as const

export function initDatabase(): void {
  console.info('[web] SQLite not available — running in UI-only mode')
}
