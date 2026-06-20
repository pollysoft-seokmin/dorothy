/**
 * 트랜스코딩 결과(H.264/AAC MP4)를 브라우저 IndexedDB 에 캐시한다.
 *
 * - 키: Google Drive 파일 id (안정적·고유). 같은 파일을 다시 재생하면 변환을
 *   건너뛰고 캐시된 Blob 을 즉시 재생한다.
 * - 변환 결과는 수십~수백 MB 가 될 수 있어 단순 무제한 적재 시 디스크/쿼터를
 *   넘길 수 있다. 총량 상한(MAX_TOTAL_BYTES)을 두고 초과 시 lastAccess 가
 *   오래된 항목부터 LRU 로 제거한다.
 * - SSR(서버 라우트)에서 import 되어도 안전하도록 indexedDB 미존재를 가드한다.
 */

const DB_NAME = 'dorothy-transcode-cache'
const STORE = 'videos'
const DB_VERSION = 1

// 캐시 총량 상한 — 초과 시 LRU 제거. 변환 결과 1개가 이를 넘으면 그 항목은
// 저장 후 즉시 정리 대상이 될 수 있으나(재활용 불가), 재생 자체는 막지 않는다.
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024 // 2GB

interface CacheRecord {
  key: string
  blob: Blob
  size: number
  name: string
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
  // 열기 실패 시 다음 호출에서 재시도 가능하게 비운다
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// IndexedDB 트랜잭션은 콜백 사이에서 await(마이크로태스크 양보)하면 자동 커밋될
// 수 있어, 한 트랜잭션 안에서 여러 요청을 낼 땐 await 없이 동기적으로 발행한 뒤
// 트랜잭션 완료를 기다려야 한다.
function txDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

/**
 * 캐시된 변환 결과를 반환한다. 없으면 null. 조회 성공 시 lastAccess 를 갱신해
 * LRU 순서를 최신화한다(갱신 실패는 무시 — 조회 결과엔 영향 없음).
 */
export async function getCachedTranscode(key: string): Promise<Blob | null> {
  if (!hasIndexedDB() || !key) return null
  try {
    const db = await openDb()
    const rec = await reqToPromise<CacheRecord | undefined>(
      tx(db, 'readonly').get(key),
    )
    if (!rec) return null
    // 비차단 — 접근 시각만 갱신. 이미 읽어둔 rec 를 단일 put 으로 되써 트랜잭션
    // 경계 사이 await 를 피한다.
    void touch(db, rec).catch(() => {})
    return rec.blob
  } catch {
    return null
  }
}

function touch(db: IDBDatabase, rec: CacheRecord): Promise<void> {
  rec.lastAccess = Date.now()
  const transaction = db.transaction(STORE, 'readwrite')
  transaction.objectStore(STORE).put(rec)
  return txDone(transaction)
}

/**
 * 변환 결과를 캐시에 저장하고, 총량이 상한을 넘으면 오래된 항목부터 제거한다.
 * 저장 실패(쿼터 초과 등)는 조용히 무시한다 — 캐시는 최적화일 뿐 재생을 막지 않는다.
 */
export async function putCachedTranscode(
  key: string,
  blob: Blob,
  name: string,
): Promise<void> {
  if (!hasIndexedDB() || !key) return
  try {
    const db = await openDb()
    const now = Date.now()
    const rec: CacheRecord = {
      key,
      blob,
      size: blob.size,
      name,
      createdAt: now,
      lastAccess: now,
    }
    const putTx = db.transaction(STORE, 'readwrite')
    putTx.objectStore(STORE).put(rec)
    await txDone(putTx)
    await evictIfNeeded(db)
  } catch {
    // 무시
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  const all = await reqToPromise<CacheRecord[]>(tx(db, 'readonly').getAll())
  let total = all.reduce((sum, r) => sum + r.size, 0)
  if (total <= MAX_TOTAL_BYTES) return
  // lastAccess 오름차순(오래된 것 우선)으로 제거할 키를 먼저 정한 뒤, 한
  // 트랜잭션에서 await 없이 동기적으로 delete 를 발행하고 완료를 기다린다.
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
