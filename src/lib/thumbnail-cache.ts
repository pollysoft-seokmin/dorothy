/**
 * 비디오 썸네일(작은 WebP 이미지)을 브라우저 IndexedDB 에 캐시한다.
 *
 * - 키: Google Drive 파일 id (transcode-cache 와 동일 규칙). 같은 영상의 썸네일을
 *   다시 그릴 때 재추출을 건너뛴다.
 * - 썸네일은 수~수십 KB 로 작지만 무제한 적재를 막기 위해 총량 상한을 두고 초과
 *   시 lastAccess 가 오래된 항목부터 LRU 로 제거한다.
 * - SSR(서버 라우트)에서 import 되어도 안전하도록 indexedDB 미존재를 가드한다.
 */

const DB_NAME = 'dorothy-thumbnail-cache'
const STORE = 'thumbnails'
const DB_VERSION = 1

// 썸네일 캐시 총량 상한 — 초과 시 LRU 제거. 썸네일 1개가 ~10KB 라 50MB 면
// 수천 개를 담을 수 있다.
const MAX_TOTAL_BYTES = 50 * 1024 * 1024 // 50MB

interface ThumbRecord {
  key: string
  blob: Blob
  size: number
  createdAt: number
  lastAccess: number
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex('lastAccess', 'lastAccess')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

/** 캐시된 썸네일을 반환한다. 없으면 null. 조회 시 lastAccess 를 갱신한다. */
export async function getCachedThumbnail(key: string): Promise<Blob | null> {
  if (!hasIndexedDB() || !key) return null
  try {
    const db = await openDb()
    const rec = await reqToPromise<ThumbRecord | undefined>(
      tx(db, 'readonly').get(key),
    )
    if (!rec) return null
    void touch(db, rec).catch(() => {})
    return rec.blob
  } catch {
    return null
  }
}

function touch(db: IDBDatabase, rec: ThumbRecord): Promise<void> {
  rec.lastAccess = Date.now()
  const transaction = db.transaction(STORE, 'readwrite')
  transaction.objectStore(STORE).put(rec)
  return txDone(transaction)
}

/** 썸네일을 저장하고, 총량이 상한을 넘으면 오래된 항목부터 제거한다. */
export async function putCachedThumbnail(key: string, blob: Blob): Promise<void> {
  if (!hasIndexedDB() || !key) return
  try {
    const db = await openDb()
    const now = Date.now()
    const rec: ThumbRecord = {
      key,
      blob,
      size: blob.size,
      createdAt: now,
      lastAccess: now,
    }
    const putTx = db.transaction(STORE, 'readwrite')
    putTx.objectStore(STORE).put(rec)
    await txDone(putTx)
    await evictIfNeeded(db)
  } catch {
    // 무시 — 캐시는 최적화일 뿐
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  const all = await reqToPromise<ThumbRecord[]>(tx(db, 'readonly').getAll())
  let total = all.reduce((sum, r) => sum + r.size, 0)
  if (total <= MAX_TOTAL_BYTES) return
  const byOldest = [...all].sort((a, b) => a.lastAccess - b.lastAccess)
  const toDelete: string[] = []
  for (const r of byOldest) {
    if (total <= MAX_TOTAL_BYTES) break
    toDelete.push(r.key)
    total -= r.size
  }
  const delTx = db.transaction(STORE, 'readwrite')
  const store = delTx.objectStore(STORE)
  for (const key of toDelete) store.delete(key)
  await txDone(delTx)
}
