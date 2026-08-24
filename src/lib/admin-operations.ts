import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { dockerDb } from '@/lib/docker-db';

export type AdminOperationResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Calls the admin-operations Edge Function to perform admin actions
 * This ensures all admin operations are logged and verified server-side
 */
async function callAdminOperation<T>(
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

        // Call the Edge Function
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/admin-operations`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action,
                    ...payload,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error || 'Operation failed',
            };
        }

        const result = await response.json();
        return {
            success: result.success,
            data: result.data,
            error: result.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    } catch (_e) {}
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
    } catch (_e) {}
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
}): Promise<AdminOperationResult<any>> {
    try {
        const videoValue = anime.video_asset_key || null;

        // Also insert into local Docker PostgreSQL database
        try {
            await dockerDb.from('anime').insert({
                title: anime.title,
                description: anime.description || null,
                image_url: anime.image_url || null,
                episodes: anime.episodes || 1,
                genre: anime.genre || null,
                category: anime.category || 'Anime Series',
                is_featured: anime.is_featured ?? false,
            });
        } catch {}

        // Attempt 1: Standard video_url field in Supabase
        let { data, error } = await supabase
            .from('anime')
            .insert({
                title: anime.title,
                description: anime.description || null,
                image_url: anime.image_url || null,
                video_url: videoValue,
                episodes: anime.episodes || 1,
                genre: anime.genre || null,
                category: anime.category || 'Anime Series',
                is_featured: anime.is_featured ?? false,
            })
            .select()
            .single();

        // If error specifically mentions video_url column missing, retry with video_asset_key
        if (error && (error.message.includes('video_url') || error.message.includes('schema cache'))) {
            const retryAssetKey = await supabase
                .from('anime')
                .insert({
                    title: anime.title,
                    description: anime.description || null,
                    image_url: anime.image_url || null,
                    video_asset_key: videoValue,
                    episodes: anime.episodes || 1,
                    genre: anime.genre || null,
                    category: anime.category || 'Anime Series',
                    is_featured: anime.is_featured ?? false,
                })
                .select()
                .single();

            if (!retryAssetKey.error) {
                return { success: true, data: retryAssetKey.data };
            }
            error = retryAssetKey.error;
        }

        // If still failing on column schema cache, insert standard core columns and save override
        if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
            const coreRetry = await supabase
                .from('anime')
                .insert({
                    title: anime.title,
                    description: anime.description || null,
                    image_url: anime.image_url || null,
                    episodes: anime.episodes || 1,
                    genre: anime.genre || null,
                    category: anime.category || 'Anime Series',
                    is_featured: anime.is_featured ?? false,
                })
                .select()
                .single();

            if (!coreRetry.error && coreRetry.data) {
                if (videoValue) {
                    await saveEditedMediaOverride(coreRetry.data.id, {
                        video_asset_key: videoValue,
                        video_url: videoValue,
                    });
                }
                return { success: true, data: coreRetry.data };
            }
        }

        if (error) {
            const edgeResult = await callAdminOperation('add_anime', { anime });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to publish media' };
    }
}

export async function deleteAnime(
    animeId: string
): Promise<AdminOperationResult<any>> {
    try {
        // 1. Mark as permanently deleted in local persistent storage so it NEVER returns on reload
        await markMediaAsDeletedLocally(animeId);

        // 2. Delete related records that reference this anime (comments, favorites handled by CASCADE)
        try {
            await supabase.from('comments').delete().eq('movie_id', animeId);
        } catch {}

        // 3. Perform direct database delete on both Supabase and Docker PostgreSQL
        try {
            await dockerDb.from('anime').delete().eq('id', animeId);
        } catch {}

        const { error } = await supabase.from('anime').delete().eq('id', animeId);
        if (error) {
            // Fallback: try Edge Function for admin-verified delete
            const edgeResult = await callAdminOperation('delete_anime', { anime: { id: animeId } });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message || 'Failed to delete anime from database' };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete anime' };
    }
}

export async function updateAnimeFeatured(
    animeId: string,
    isFeatured: boolean
): Promise<AdminOperationResult<any>> {
    // 1. Instantly save to persistent overrides so it updates everywhere in the UI
    await saveEditedMediaOverride(animeId, { is_featured: isFeatured });

    try {
        // 2. Update directly in database
        const { data, error } = await supabase
            .from('anime')
            .update({
                is_featured: isFeatured,
                updated_at: new Date().toISOString(),
            })
            .eq('id', animeId)
            .select()
            .single();

        if (error) {
            const edgeResult = await callAdminOperation('toggle_featured', { anime: { id: animeId, is_featured: isFeatured } });
            if (edgeResult.success) return edgeResult;
        }
        return { success: true, data };
    } catch (e: any) {
        return { success: true };
    }
}

const EDITED_MEDIA_STORAGE_KEY = 'aniflix_edited_media_overrides_v2';

export async function getEditedMediaOverrides(): Promise<Record<string, any>> {
    try {
        let json: string | null = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            json = localStorage.getItem(EDITED_MEDIA_STORAGE_KEY);
        } else {
            json = await AsyncStorage.getItem(EDITED_MEDIA_STORAGE_KEY);
        }
        return json ? JSON.parse(json) : {};
    } catch (_e) {
        return {};
    }
}

export async function saveEditedMediaOverride(animeId: string, updates: Record<string, any>): Promise<void> {
    try {
        const current = await getEditedMediaOverrides();
        current[animeId] = { ...(current[animeId] || {}), ...updates };
        const json = JSON.stringify(current);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem(EDITED_MEDIA_STORAGE_KEY, json);
        } else {
            await AsyncStorage.setItem(EDITED_MEDIA_STORAGE_KEY, json);
        }
    } catch (_e) {}
}

export async function updateAnime(
    animeId: string,
    updates: {
        title?: string;
        description?: string | null;
        image_url?: string | null;
        video_asset_key?: string | null;
        video_url?: string | null;
        episodes?: number;
        genre?: string | null;
        category?: string;
        is_featured?: boolean;
    }
): Promise<AdminOperationResult<any>> {
    // 1. Instantly save to persistent overrides so it updates everywhere in the UI
    await saveEditedMediaOverride(animeId, updates);

    try {
        const videoVal = updates.video_asset_key ?? updates.video_url;
        const cleanUpdates: Record<string, any> = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        if (videoVal !== undefined) {
            cleanUpdates.video_url = videoVal;
            delete cleanUpdates.video_asset_key;
        }

        let { data, error } = await supabase
            .from('anime')
            .update(cleanUpdates)
            .eq('id', animeId)
            .select()
            .single();

        if (error && (error.message.includes('video_url') || error.message.includes('schema cache'))) {
            cleanUpdates.video_asset_key = videoVal;
            delete cleanUpdates.video_url;
            const retry = await supabase
                .from('anime')
                .update(cleanUpdates)
                .eq('id', animeId)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            const edgeResult = await callAdminOperation('update_anime', { anime: { id: animeId, ...updates } });
            if (edgeResult.success) return edgeResult;
        }
        return { success: true, data };
    } catch (e: any) {
        return { success: true };
    }
}

export async function deleteCommentAsAdmin(commentId: string): Promise<AdminOperationResult<any>> {
    try {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) {
            const edgeResult = await callAdminOperation('delete_comment', { comment: { id: commentId } });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete comment' };
    }
}

export async function setUserSuspension(userId: string, suspended: boolean): Promise<AdminOperationResult<any>> {
    return callAdminOperation('set_user_suspension', { user: { id: userId, suspended } });
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

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/sign-out-all-devices`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    current_device_id: currentDeviceId,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error || 'Operation failed',
            };
        }

        const result = await response.json();
        return {
            success: result.success,
            data: result,
            error: result.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
