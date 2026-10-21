import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.review_cache');

function ensureDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (_) {}
}

function getFilePath(collection: string) {
  ensureDir();
  return path.join(CACHE_DIR, `${collection}.json`);
}

export function readReviewCache<T = any>(collection: string): Record<string, T> {
  try {
    const file = getFilePath(collection);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (_) {}
  return {};
}

export function writeReviewCache<T = any>(collection: string, id: string, data: T) {
  try {
    const current = readReviewCache<T>(collection);
    current[id] = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(getFilePath(collection), JSON.stringify(current, null, 2), 'utf8');
  } catch (_) {}
}

export function deleteReviewCache(collection: string, id: string) {
  try {
    const current = readReviewCache(collection);
    if (current[id]) {
      delete current[id];
      fs.writeFileSync(getFilePath(collection), JSON.stringify(current, null, 2), 'utf8');
    }
  } catch (_) {}
}

export function listReviewCache<T = any>(collection: string, filterFn?: (item: T) => boolean): T[] {
  const current = readReviewCache<T>(collection);
  const items = Object.values(current);
  if (filterFn) {
    return items.filter(filterFn);
  }
  return items;
}
