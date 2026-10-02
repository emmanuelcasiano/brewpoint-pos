// The register's own storage, in IndexedDB, so it keeps working with no internet. Module 06
// adds the outbox of sales here; Module 03 keeps sign-in data:
//   pin_cache     the staff list with PIN hashes, and the device it is for
//   pin_lockouts  wrong PIN tries per person on this device
//   auth_events   sign-ins, sign-outs and locks not yet sent to the server
//   session       who is signed in, so a reload keeps them signed in

const DB_NAME = 'brewpoint-pos';
const VERSION = 1;

export type StoreName = 'pin_cache' | 'pin_lockouts' | 'auth_events' | 'session';
const STORES: readonly StoreName[] = ['pin_cache', 'pin_lockouts', 'auth_events', 'session'];

let opening: Promise<IDBDatabase> | null = null;

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('The device storage could not be read.'));
  });
}

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      for (const store of STORES) {
        if (!request.result.objectStoreNames.contains(store))
          request.result.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('The device storage could not open.'));
  });
  return opening;
}

async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: (objects: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return done(action(db.transaction(store, mode).objectStore(store)));
}

export async function getItem<T>(store: StoreName, key: string): Promise<T | undefined> {
  return (await run<unknown>(store, 'readonly', (objects) => objects.get(key))) as T | undefined;
}

export async function putItem(store: StoreName, key: string, value: unknown): Promise<void> {
  await run(store, 'readwrite', (objects) => objects.put(value, key));
}

export async function deleteItem(store: StoreName, key: string): Promise<void> {
  await run(store, 'readwrite', (objects) => objects.delete(key));
}

export async function allItems<T>(store: StoreName): Promise<T[]> {
  return (await run<unknown[]>(store, 'readonly', (objects) => objects.getAll())) as T[];
}

/** Tests: closes and deletes the database, so each test starts with an empty device. */
export async function resetLocalStore(): Promise<void> {
  const db = await opening?.catch(() => null);
  db?.close();
  opening = null;
  await done(indexedDB.deleteDatabase(DB_NAME));
}
