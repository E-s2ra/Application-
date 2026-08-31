import { supabase } from '@/lib/supabase';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { AnimeItem } from '@/types';
import { DEFAULT_CATALOG } from '@/app/(tabs)/index';

/**
 * MediaService — Encapsulates media catalog queries, overrides, and administrative mutations.
 */
export const MediaService = {
  /**
   * Fetches active media catalog combining Cloud Supabase rows, local overrides, and fallback catalog items.
   */
  async getCatalog(): Promise<AnimeItem[]> {
    try {
      const [deletedIds, overrides] = await Promise.all([
        getDeletedMediaIds(),
        getEditedMediaOverrides(),
      ]);

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 2500)
      );

      const fetchPromise = supabase
        .from('anime')
        .select('id, title, description, image_url, episodes, genre, category, is_featured')
        .order('created_at', { ascending: false });

      const res = (await Promise.race([fetchPromise, timeoutPromise])) as any;
      const safeData = (res && res.data && !res.error) ? res.data : [];

      const customItems = safeData
        .filter((item: any) => !deletedIds.includes(item.id))
        .map((item: any) => ({
          ...item,
          category: item.category || 'Anime Series',
          ...(overrides[item.id] || {}),
        })) as AnimeItem[];

      const defaultItems = DEFAULT_CATALOG
        .filter((d: AnimeItem) => !deletedIds.includes(d.id))
        .map((d: AnimeItem) => ({ ...d, ...(overrides[d.id] || {}) }));

      const newLocalItems = Object.values(overrides)
        .filter(
          (override: any) =>
            !deletedIds.includes(override.id) &&
            !safeData.some((d: any) => d.id === override.id) &&
            !DEFAULT_CATALOG.some((d: AnimeItem) => d.id === override.id)
        ) as AnimeItem[];

      return [...newLocalItems, ...customItems, ...defaultItems];
    } catch (err) {
      console.warn('[MediaService] Catalog fetch fallback:', err);
      return DEFAULT_CATALOG;
    }
  },

  /**
   * Fetches detailed media item by ID.
   */
  async getMediaById(id: string): Promise<AnimeItem | null> {
    const catalog = await this.getCatalog();
    return catalog.find((item) => item.id === id) || null;
  },
};
