import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

type StoredMeta = {
  generation: string;
  chunks: number;
};

// Keep each SecureStore value comfortably below the historical iOS payload
// limit. Splitting by code point avoids cutting a surrogate pair in half.
const CHUNK_CODE_POINTS = 350;
const META_SUFFIX = '.__secure_meta';
let generationCounter = 0;

function metaKey(key: string) {
  return `${key}${META_SUFFIX}`;
}

function chunkKey(key: string, generation: string, index: number) {
  return `${key}.__secure_${generation}_${index}`;
}

function splitIntoChunks(value: string): string[] {
  const codePoints = Array.from(value);
  const chunks: string[] = [];
  for (let index = 0; index < codePoints.length; index += CHUNK_CODE_POINTS) {
    chunks.push(codePoints.slice(index, index + CHUNK_CODE_POINTS).join(''));
  }
  return chunks.length > 0 ? chunks : [''];
}

function parseMeta(raw: string | null): StoredMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredMeta>;
    if (
      typeof parsed.generation !== 'string' ||
      !parsed.generation ||
      !Number.isSafeInteger(parsed.chunks) ||
      (parsed.chunks ?? 0) < 1 ||
      (parsed.chunks ?? 0) > 100
    ) {
      return null;
    }
    return { generation: parsed.generation, chunks: parsed.chunks as number };
  } catch {
    return null;
  }
}

async function deleteGeneration(key: string, meta: StoredMeta | null) {
  if (!meta) return;
  await Promise.all(
    Array.from({ length: meta.chunks }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, meta.generation, index)).catch(() => {})
    )
  );
}

async function readSecureValue(key: string, meta: StoredMeta): Promise<string | null> {
  const chunks = await Promise.all(
    Array.from({ length: meta.chunks }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, meta.generation, index))
    )
  );
  if (chunks.some((chunk) => chunk === null)) return null;
  return (chunks as string[]).join('');
}

async function setSecureValue(key: string, value: string) {
  const oldMeta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
  const generation = `${Date.now().toString(36)}${(++generationCounter).toString(36)}`;
  const chunks = splitIntoChunks(value);
  const nextMeta: StoredMeta = { generation, chunks: chunks.length };

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, generation, index), chunks[index]);
    }
    // Commit the new generation only after every chunk is safely persisted.
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify(nextMeta));
  } catch (error) {
    await deleteGeneration(key, nextMeta);
    throw error;
  }

  await AsyncStorage.removeItem(key).catch(() => {});
  if (oldMeta?.generation !== generation) {
    await deleteGeneration(key, oldMeta);
  }
}

/** Supabase-compatible encrypted native auth storage with legacy migration. */
export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const meta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
    if (meta) {
      const value = await readSecureValue(key, meta);
      if (value !== null) return value;

      await SecureStore.deleteItemAsync(metaKey(key)).catch(() => {});
      await deleteGeneration(key, meta);
    }

    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue === null) return null;
    await setSecureValue(key, legacyValue);
    return legacyValue;
  },

  async setItem(key: string, value: string): Promise<void> {
    await setSecureValue(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const meta = parseMeta(await SecureStore.getItemAsync(metaKey(key)));
    await SecureStore.deleteItemAsync(metaKey(key)).catch(() => {});
    await deleteGeneration(key, meta);
    await AsyncStorage.removeItem(key);
  },
};
