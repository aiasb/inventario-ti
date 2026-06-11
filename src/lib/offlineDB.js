import { openDB } from 'idb'

const DB_NAME = 'inventario-ti'
const DB_VERSION = 1

let _dbPromise = null

function idb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        const stores = [
          'assets', 'responsaveis', 'setores', 'categorias',
          'marcas', 'situacoes', 'analistas', 'periodos_manutencao',
        ]
        for (const s of stores) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' })
        }
        if (!d.objectStoreNames.contains('sync_queue')) {
          d.createObjectStore('sync_queue', { keyPath: 'qid', autoIncrement: true })
        }
        if (!d.objectStoreNames.contains('meta')) {
          d.createObjectStore('meta')
        }
      },
    })
  }
  return _dbPromise
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function cacheAll(store, records) {
  const db = await idb()
  const tx = db.transaction([store, 'meta'], 'readwrite')
  await tx.objectStore(store).clear()
  await Promise.all(records.map(r => tx.objectStore(store).put(r)))
  await tx.objectStore('meta').put(Date.now(), `${store}_at`)
  await tx.done
}

export async function getAll(store) {
  const db = await idb()
  return db.getAll(store)
}

export async function putOne(store, record) {
  const db = await idb()
  await db.put(store, record)
}

export async function delOne(store, id) {
  const db = await idb()
  await db.delete(store, id)
}

// ─── Sync queue ───────────────────────────────────────────────────────────────

export async function enqueue(op) {
  const db = await idb()
  return db.add('sync_queue', { ...op, at: Date.now() })
}

export async function getQueue() {
  const db = await idb()
  return db.getAll('sync_queue')
}

export async function dequeue(qid) {
  const db = await idb()
  await db.delete('sync_queue', qid)
}

export async function queueSize() {
  const db = await idb()
  return db.count('sync_queue')
}
