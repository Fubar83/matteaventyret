/**
 * IndexedDB storage for handwriting samples collected in Träningsverkstan.
 * Samples are stored as stroke data (x, y per point), never images, per the
 * build brief: they can be re-rendered at any size and support future
 * models. Children never see this tool and it never ships in the game.
 */
import type { Stroke } from "../recognition/preprocess";

export interface StoredSample {
  id: string;
  /** The character this sample was drawn as - a digit, letter, or math sign from LABELS. */
  label: string;
  strokes: Stroke[];
  sessionId: string;
  createdAt: number;
}

const DB_NAME = "matteaventyret-trainer";
const STORE = "samples";
// v2: digit-only samples (numeric `digit` field) became char-general samples
// (string `label` field); the store is recreated rather than migrated since
// this is local, disposable trainer data.
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      const store = db.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("label", "label");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addSample(sample: StoredSample): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(sample);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSamples(): Promise<StoredSample[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredSample[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSample(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAllSamples(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
