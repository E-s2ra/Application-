import { supabase } from '@/lib/supabase';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { AnimeItem } from '@/types';

/** Default page size for catalog fetches — keeps initial load fast */
const CATALOG_PAGE_SIZE = 40;

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
  async getCatalog(page = 0, limit = CATALOG_PAGE_SIZE): Promise<AnimeItem[]> {
    try {
      const [deletedIds, overrides] = await Promise.all([
        getDeletedMediaIds(),
        getEditedMediaOverrides(),
      ]);

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
      const safeData: any[] = res?.data && !res.error ? res.data : [];

      // Apply deletions and merge any admin-edit overrides
      const items = safeData
        .filter((item: any) => !deletedIds.includes(item.id))
        .map((item: any) => ({
          ...item,
          category: item.category || 'Anime Series',
          ...(overrides[item.id] || {}),
        })) as AnimeItem[];

      // On the first page only, prepend locally-created items not yet in the DB result
      const localOnlyItems: AnimeItem[] =
        page === 0
          ? (Object.values(overrides).filter(
              (override: any) =>
                override?.id &&
                !deletedIds.includes(override.id) &&
                !safeData.some((d: any) => d.id === override.id)
            ) as AnimeItem[])
          : [];

      return [...localOnlyItems, ...items];
    } catch (err) {
      console.warn('[MediaService] Catalog fetch error:', err);
      return [];
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
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        // Check local overrides for admin-created items not yet in DB
        return (overrides[id] as AnimeItem) || null;
      }

      return { ...data, ...(overrides[id] || {}) } as AnimeItem;
    } catch (err) {
      console.warn('[MediaService] getMediaById error:', err);
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
