import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { AnimeItem } from '@/types';
import { logError } from '@/lib/error-logger';

/** Default page size for catalog fetches — keeps initial load fast */
const CATALOG_PAGE_SIZE = 40;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const CATALOG_CACHE_MAX_STALE_MS = 24 * 60 * 60 * 1000;
const CATALOG_CACHE_STORAGE_PREFIX = 'aniflix_public_catalog_cache_v1';

type CatalogCacheEntry = {
  savedAt: number;
  items: AnimeItem[];
};

const catalogMemoryCache = new Map<string, CatalogCacheEntry>();

function catalogCacheKey(page: number, limit: number) {
  return `${page}:${limit}`;
}

function catalogStorageKey(page: number, limit: number) {
  return `${CATALOG_CACHE_STORAGE_PREFIX}:${catalogCacheKey(page, limit)}`;
}

async function readCatalogCache(page: number, limit: number): Promise<CatalogCacheEntry | null> {
  const key = catalogCacheKey(page, limit);
  const memory = catalogMemoryCache.get(key);
  if (memory) return memory;

  try {
    const json = await AsyncStorage.getItem(catalogStorageKey(page, limit));
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<CatalogCacheEntry>;
    if (!Number.isFinite(parsed.savedAt) || !Array.isArray(parsed.items)) return null;
    const entry: CatalogCacheEntry = {
      savedAt: Number(parsed.savedAt),
      items: parsed.items as AnimeItem[],
    };
    catalogMemoryCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

async function writeCatalogCache(page: number, limit: number, items: AnimeItem[]) {
  const entry: CatalogCacheEntry = {
    savedAt: Date.now(),
    items,
  };
  catalogMemoryCache.set(catalogCacheKey(page, limit), entry);
  try {
    await AsyncStorage.setItem(catalogStorageKey(page, limit), JSON.stringify(entry));
  } catch {
    // Memory cache is still useful if persistent storage is unavailable.
  }
}

function applyLocalCatalogState(
  items: AnimeItem[],
  page: number,
  deletedIds: string[],
  overrides: Record<string, any>
): AnimeItem[] {
  const visibleItems = items
    .filter((item) => item?.id && !deletedIds.includes(item.id))
    .map((item) => ({
      ...item,
      ...(overrides[item.id] || {}),
    })) as AnimeItem[];

  if (page !== 0) return visibleItems;

  const localOnlyItems = Object.values(overrides).filter(
    (override: any) =>
      override?.id &&
      !deletedIds.includes(override.id) &&
      !items.some((item) => item?.id === override.id)
  ) as AnimeItem[];

  return [...localOnlyItems, ...visibleItems];
}

/**
 * MediaService — Encapsulates media catalog queries and local admin-edit overrides.
 */
export const MediaService = {
  /**
   * Fetches the active media catalog from Supabase with pagination, merging any
   * locally-cached admin edits. If the database is unreachable, returns local overrides.
   *
   * @param page  0-indexed page number (default: 0 = first page)
   * @param limit Number of items per page (default: CATALOG_PAGE_SIZE)
   */
  async getCatalog(
    page = 0,
    limit = CATALOG_PAGE_SIZE,
    options: { forceRefresh?: boolean } = {}
  ): Promise<AnimeItem[]> {
    const [deletedIds, overrides, cached] = await Promise.all([
      getDeletedMediaIds(),
      getEditedMediaOverrides(),
      readCatalogCache(page, limit),
    ]);
    const cacheAge = cached ? Date.now() - cached.savedAt : Number.POSITIVE_INFINITY;

    if (!options.forceRefresh && cached && cacheAge <= CATALOG_CACHE_TTL_MS) {
      return applyLocalCatalogState(cached.items, page, deletedIds, overrides);
    }

    try {
      const from = page * limit;
      const to = from + limit - 1;

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 4000)
      );

      const fetchPromise = supabase
        .from('anime')
        .select('id, title, description, image_url, episodes, genre, category, is_featured')
        .order('created_at', { ascending: false })
        .range(from, to);

      const res = (await Promise.race([fetchPromise, timeoutPromise])) as any;
      if (res?.error) throw res.error;
      const safeData = (Array.isArray(res?.data) ? res.data : []) as AnimeItem[];
      await writeCatalogCache(page, limit, safeData);
      return applyLocalCatalogState(safeData, page, deletedIds, overrides);
    } catch (err) {
      if (cached && cacheAge <= CATALOG_CACHE_MAX_STALE_MS) {
        return applyLocalCatalogState(cached.items, page, deletedIds, overrides);
      }
      logError(err, { screen: 'MediaService', action: 'getCatalog' });
      throw err;
    }
  },

  /**
   * Fetches a single media item by ID directly from the database.
   * Falls back to local admin-edit overrides for items not yet in DB.
   */
  async getMediaById(id: string): Promise<AnimeItem | null> {
    try {
      const overrides = await getEditedMediaOverrides();

      const { data, error } = await supabase
        .from('anime')
        .select('id, title, description, image_url, episodes, genre, category, is_featured, created_at, updated_at, views, rating, published_at')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        // Check local overrides for admin-created items not yet in DB
        return (overrides[id] as AnimeItem) || null;
      }

      return { ...data, ...(overrides[id] || {}) } as AnimeItem;
    } catch (err) {
      logError(err, { screen: 'MediaService', action: 'getMediaById', extra: { id } });
      return null;
    }
  },

  /**
   * Fetches the total count of catalog items in the database.
   * Used for pagination UI (e.g., "Showing 40 of 200 items").
   */
  async getCatalogCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('anime')
        .select('id', { count: 'exact', head: true });

      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  },
};
