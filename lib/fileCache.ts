import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const MAX_ENTRIES = 500;

export interface FileCache<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
}

/**
 * Cache w pamięci z kopią w data/cache/<name>.json, żeby przetrwał restart
 * serwera. Na hostingu z dyskiem tylko do odczytu działa sama pamięć.
 */
export function createFileCache<T>(name: string): FileCache<T> {
  const file = path.join(CACHE_DIR, `${name}.json`);
  let entries: Promise<Map<string, T>> | null = null;

  const load = () => {
    entries ??= readFile(file, "utf8").then(
      (raw) => new Map(Object.entries(JSON.parse(raw) as Record<string, T>)),
      () => new Map<string, T>(),
    );
    return entries;
  };

  return {
    async get(key) {
      return (await load()).get(key);
    },
    async set(key, value) {
      const map = await load();
      map.delete(key);
      map.set(key, value);
      while (map.size > MAX_ENTRIES) map.delete(map.keys().next().value!);
      try {
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(file, JSON.stringify(Object.fromEntries(map), null, 2));
      } catch (error) {
        console.warn(`[cache] nie zapisano ${name}.json:`, (error as Error).message);
      }
    },
  };
}
