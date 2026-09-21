// Tiny IndexedDB wrapper — offline-first store for items, handovers and profile.
// Stores: items (cart of scanned scrap), handovers (hash-chained records), kv (profile, last hash, sync state)
window.DB = (() => {
  const NAME = 'kabadiwala_connect', VER = 1
  let dbp
  function open() {
    if (dbp) return dbp
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER)
      r.onupgradeneeded = () => {
        const d = r.result
        if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', { keyPath: 'id' })
        if (!d.objectStoreNames.contains('handovers')) d.createObjectStore('handovers', { keyPath: 'id' }).createIndex('ts', 'ts')
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
      }
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    return dbp
  }
  const tx = async (store, mode, fn) => {
    const d = await open()
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store)
      const out = fn(s)
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out)
      t.onerror = () => rej(t.error)
    })
  }
  const req = (store, mode, fn) => tx(store, mode, (s) => { const r = fn(s); return r })
  return {
    put: (store, val) => req(store, 'readwrite', (s) => s.put(val)),
    del: (store, key) => req(store, 'readwrite', (s) => s.delete(key)),
    clear: (store) => req(store, 'readwrite', (s) => s.clear()),
    get: async (store, key) => { const d = await open(); return new Promise((res, rej) => { const r = d.transaction(store).objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) }) },
    all: async (store) => { const d = await open(); return new Promise((res, rej) => { const r = d.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error) }) },
    kvGet: async (k, dflt) => { const v = await DB.get('kv', k); return v === undefined ? dflt : v },
    kvSet: (k, v) => req('kv', 'readwrite', (s) => s.put(v, k)),
  }
})()

// SHA-256 helper (WebCrypto) for the tamper-evident handover chain
window.sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
window.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
