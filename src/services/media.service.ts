import { supabase } from '@/lib/supabase';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { AnimeItem } from '@/types';

/**
 * MediaService — Encapsulates media catalog queries and local admin-edit overrides.
 */
export const MediaService = {
  /**
   * Fetches the active media catalog from Supabase, merging any locally-cached admin edits.
   * If the database is unreachable, returns any available local overrides.
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
      const safeData: any[] = res?.data && !res.error ? res.data : [];

      // Apply deletions and merge any admin-edit overrides
      const items = safeData
        .filter((item: any) => !deletedIds.includes(item.id))
        .map((item: any) => ({
          ...item,
          category: item.category || 'Anime Series',
          ...(overrides[item.id] || {}),
        })) as AnimeItem[];

      // Prepend locally-created items that are not yet in the DB result
      const localOnlyItems = Object.values(overrides).filter(
        (override: any) =>
          override?.id &&
          !deletedIds.includes(override.id) &&
          !safeData.some((d: any) => d.id === override.id)
      ) as AnimeItem[];

      return [...localOnlyItems, ...items];
    } catch (err) {
      console.warn('[MediaService] Catalog fetch error:', err);
      return [];
    }
  },

  /**
   * Fetches a single media item by ID directly from the database.
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
    } catch {
      return null;
    }
  },
};
