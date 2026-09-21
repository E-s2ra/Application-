import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AdminOperationResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Calls the admin-operations Edge Function to perform admin actions
 * This ensures all admin operations are logged and verified server-side
 */
export async function callAdminOperation<T>(
    action: string,
    payload: Record<string, any>
): Promise<AdminOperationResult<T>> {
    try {
        // Get current session to include authorization header
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return {
                success: false,
                error: 'Not authenticated',
            };
        }

        // Edge functions can be called directly


        // Call the Edge Function using Supabase client to automatically handle CORS and API keys
        const { data, error: invokeError } = await supabase.functions.invoke('admin-operations', {
            body: { action, ...payload },
        });

        if (invokeError) {
            let errorMsg = invokeError.message || 'Operation failed';
            try {
                if ('context' in invokeError && typeof (invokeError as any).context?.json === 'function') {
                    const parsed = await (invokeError as any).context.json();
                    if (parsed?.error) errorMsg = parsed.error;
                }
            } catch {
                // Ignore json parsing error
            }
            return {
                success: false,
                error: errorMsg,
            };
        }

        return {
            success: data?.success ?? false,
            data: data?.data,
            error: data?.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}



const DELETED_MEDIA_STORAGE_KEY = 'aniflix_deleted_media_ids_v3';

export async function getDeletedMediaIds(): Promise<string[]> {
    try {
        let raw: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            raw = localStorage.getItem(DELETED_MEDIA_STORAGE_KEY);
        } else {
            raw = await AsyncStorage.getItem(DELETED_MEDIA_STORAGE_KEY);
        }
        if (raw) {
            return JSON.parse(raw) as string[];
        }
    } catch (_e) {
      console.warn('getDeletedMediaIds error:', _e);
    }
    return [];
}

export async function markMediaAsDeletedLocally(animeId: string): Promise<void> {
    try {
        const existing = await getDeletedMediaIds();
        if (!existing.includes(animeId)) {
            const updated = [...existing, animeId];
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                localStorage.setItem(DELETED_MEDIA_STORAGE_KEY, JSON.stringify(updated));
            } else {
                await AsyncStorage.setItem(DELETED_MEDIA_STORAGE_KEY, JSON.stringify(updated));
            }
        }
    } catch (_e: any) {
      throw new Error(`Failed to mark media as deleted locally: ${_e.message || _e}`);
    }
}

export async function addAnime(anime: {
    title: string;
    description?: string;
    image_url?: string;
    video_asset_key?: string;
    episodes: number;
    genre?: string;
    category?: string;
    is_featured?: boolean;
    episode_links?: { episode: number; url: string }[];
}): Promise<AdminOperationResult<any>> {
    try {
        // Private media locators are server-owned. All media creation goes
        // through the audited admin Edge Function rather than client DB grants.
        const edgeResult = await callAdminOperation<any>('add_anime', { anime });
        if (!edgeResult.success) {
            return {
                success: false,
                error: edgeResult.error || 'Failed to publish media. Please check your connection and try again.',
            };
        }
        const insertedData = Array.isArray(edgeResult.data) ? edgeResult.data[0] : edgeResult.data;

        // Cache the newly added item locally so it appears immediately in the admin UI
        // before the next catalog refresh. This is a UI convenience only — the source of
        // truth is always the database.
        if (insertedData?.id) {
            await saveEditedMediaOverride(insertedData.id, {
                ...insertedData,
                episode_links: anime.episode_links,
            });
        }

        return { success: true, data: insertedData };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to publish media' };
    }
}


export async function deleteAnime(
    animeId: string
): Promise<AdminOperationResult<any>> {
    try {
        // If this is a local-only item, we are done! It doesn't exist in Supabase so don't try to delete it there.
        if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
            await markMediaAsDeletedLocally(animeId);
            return { success: true, data: null };
        }

        // Media deletion is privileged and audited server-side. Only persist the
        // local hide marker after the server confirms the delete succeeded.
        const edgeResult = await callAdminOperation('delete_anime', { anime: { id: animeId } });
        if (!edgeResult.success) {
            return { success: false, error: edgeResult.error || 'Failed to delete media' };
        }
        await markMediaAsDeletedLocally(animeId);
        return { success: true, data: edgeResult.data ?? null };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete media' };
    }
}

export async function updateAnimeFeatured(
    animeId: string,
    isFeatured: boolean
): Promise<AdminOperationResult<any>> {
    // If this is a local-only item, we are done! It doesn't exist in Supabase so don't try to update it there.
    if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
        await saveEditedMediaOverride(animeId, { is_featured: isFeatured });
        return { success: true, data: { id: animeId, is_featured: isFeatured } };
    }

    try {
        const edgeResult = await callAdminOperation('toggle_featured', {
            anime: { id: animeId, is_featured: isFeatured },
        });
        if (!edgeResult.success) {
            return { success: false, error: edgeResult.error || 'Failed to update featured status' };
        }
        await saveEditedMediaOverride(animeId, { is_featured: isFeatured });
        return edgeResult;
    } catch (e: any) {
        console.warn('updateAnimeFeatured error:', e);
        return { success: false, error: e.message || 'Failed to update featured status' };
    }
}

const EDITED_MEDIA_STORAGE_KEY = 'aniflix_edited_media_overrides_v2';
const OVERRIDE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days

function sanitizeMediaOverride(value: Record<string, any> | null | undefined): Record<string, any> {
    if (!value) return {};
    const {
        video_url: _videoUrl,
        video_asset_key: _videoAssetKey,
        episode_links: _episodeLinks,
        ...safe
    } = value;
    return safe;
}

export async function getEditedMediaOverrides(): Promise<Record<string, any>> {
    try {
        let json: string | null = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            json = localStorage.getItem(EDITED_MEDIA_STORAGE_KEY);
        } else {
            json = await AsyncStorage.getItem(EDITED_MEDIA_STORAGE_KEY);
        }
        if (!json) return {};
        const parsed = JSON.parse(json);
        const valid: Record<string, any> = {};
        const now = Date.now();
        let sanitizedLegacyData = false;

        Object.keys(parsed).forEach((id) => {
            const item = parsed[id];
            // Filter out entries older than 7 days if timestamp is present
            if (!item._savedAt || (now - item._savedAt) < OVERRIDE_TTL_MS) {
                const sanitized = sanitizeMediaOverride(item);
                valid[id] = sanitized;
                if (
                    item?.video_url !== undefined ||
                    item?.video_asset_key !== undefined ||
                    item?.episode_links !== undefined
                ) {
                    sanitizedLegacyData = true;
                }
            }
        });

        // One-time scrub for older admin overrides that cached private locators.
        // Returning sanitized data is not enough: remove those values from the
        // device/browser storage itself as soon as we see them.
        if (sanitizedLegacyData || Object.keys(valid).length !== Object.keys(parsed).length) {
            const sanitizedJson = JSON.stringify(valid);
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem(EDITED_MEDIA_STORAGE_KEY, sanitizedJson);
            } else {
                await AsyncStorage.setItem(EDITED_MEDIA_STORAGE_KEY, sanitizedJson);
            }
        }
        return valid;
    } catch {
        return {};
    }
}

export async function saveEditedMediaOverride(animeId: string, updates: Record<string, any>): Promise<void> {
    try {
        const current = await getEditedMediaOverrides();
        current[animeId] = {
            ...sanitizeMediaOverride(current[animeId]),
            ...sanitizeMediaOverride(updates),
            _savedAt: Date.now(),
        };
        const json = JSON.stringify(current);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem(EDITED_MEDIA_STORAGE_KEY, json);
        } else {
            await AsyncStorage.setItem(EDITED_MEDIA_STORAGE_KEY, json);
        }
    } catch (_e: any) {
      throw new Error(`saveEditedMediaOverride failed: ${_e.message || _e}`);
    }
}

export async function updateAnime(
    animeId: string,
    updates: {
        title?: string;
        description?: string | null;
        image_url?: string | null;
        video_asset_key?: string | null;
        episodes?: number;
        genre?: string | null;
        category?: string;
        is_featured?: boolean;
        episode_links?: { episode: number; url: string }[];
    }
): Promise<AdminOperationResult<any>> {
    // Local-only items (not in DB) — nothing more to do
    if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
        await saveEditedMediaOverride(animeId, updates);
        return { success: true, data: { id: animeId, ...updates } };
    }

    try {
        const edgeResult = await callAdminOperation('update_anime', {
            anime: { id: animeId, ...updates },
        });
        if (!edgeResult.success) {
            return { success: false, error: edgeResult.error || 'Failed to update media' };
        }
        await saveEditedMediaOverride(animeId, updates);
        return edgeResult;
    } catch (e: any) {
        console.warn('[admin-operations] updateAnime error:', e);
        return { success: false, error: e.message || 'Failed to update media' };
    }
}

export async function getAnimePrivateForAdmin(animeId: string): Promise<AdminOperationResult<any>> {
    if (!animeId) return { success: false, error: 'Anime ID is required' };
    return callAdminOperation('get_anime_private', { anime: { id: animeId } });
}

export async function deleteCommentAsAdmin(commentId: string): Promise<AdminOperationResult<any>> {
    try {
        const edgeResult = await callAdminOperation('delete_comment', { comment: { id: commentId } });
        if (edgeResult.success) return edgeResult;
        return { success: false, error: edgeResult.error || 'Failed to delete comment' };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete comment' };
    }
}

/**
 * Sign out all other devices for the current user
 */
export async function signOutAllOtherDevices(
    currentDeviceId: string
): Promise<AdminOperationResult<any>> {
    try {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return {
                success: false,
                error: 'Not authenticated',
            };
        }

        const { data, error: invokeError } = await supabase.functions.invoke('sign-out-all-devices', {
            body: { current_device_id: currentDeviceId },
        });

        if (invokeError) {
            return {
                success: false,
                error: invokeError.message || 'Operation failed',
            };
        }

        return {
            success: data?.success ?? false,
            data: data,
            error: data?.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/** Grants VIP status through the authenticated admin Edge Function. */
export async function grantVipUser(
    emailOrUsername: string,
    days: number = 30
): Promise<AdminOperationResult<any>> {
    const targetInput = emailOrUsername.trim().toLowerCase();
    if (!targetInput) {
        return { success: false, error: 'Email or username is required.' };
    }

    const edgeResult = await callAdminOperation<any>('grant_vip', {
        user: { email: targetInput, days },
    });

    return edgeResult.success
        ? edgeResult
        : {
            success: false,
            error: edgeResult.error || 'Failed to grant VIP through the admin service.',
        };
}

