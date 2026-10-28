export interface DurableStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  list<T>(prefix: string): Promise<T[]>;
  mutate<T, R>(key: string, transform: (previous: T | undefined) => { value: T; result: R; also?: [string, unknown][] }): Promise<R>;
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('e3dady-private-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('أغلق التبويبات القديمة لإتاحة التخزين')); };
  });
  return database;
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('entries', mode);
    const request = operation(tx.objectStore('entries'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error);
    tx.onabort = () => reject(tx.error ?? new Error('تعذر حفظ البيانات على هذا الجهاز'));
  });
}

export const offlineStorage: DurableStorage = {
  get: <T>(key: string) => transaction<T | undefined>('readonly', store => store.get(key)),
  set: async <T>(key: string, value: T) => { await transaction('readwrite', store => store.put(value, key)); },
  remove: async (key: string) => { await transaction('readwrite', store => store.delete(key)); },
  list: <T>(prefix: string) => transaction<T[]>('readonly', store => store.getAll(IDBKeyRange.bound(prefix, `${prefix}\uffff`))),
  async mutate<T, R>(key: string, transform: (previous: T | undefined) => { value: T; result: R; also?: [string, unknown][] }): Promise<R> {
    const db = await openDatabase();
    return new Promise<R>((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite'), store = tx.objectStore('entries');
      const request = store.get(key);
      let result: R, failure: unknown;
      request.onsuccess = () => {
        try {
          const next = transform(request.result);
          result = next.result; store.put(next.value, key);
          for (const [otherKey, value] of next.also ?? []) store.put(value, otherKey);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(failure ?? tx.error ?? new Error('تعذر حفظ المسودة'));
    });
  },
};
