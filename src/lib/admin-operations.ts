import { supabase, SUPABASE_URL } from '@/lib/supabase';
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
        // Try direct database insertion first
        const { data: dbData, error: dbError } = await supabase
            .from('anime')
            .insert(anime)
            .select()
            .single();

        let insertedData = dbData;

        // If direct insertion fails (e.g. RLS policy requires service role), fallback to Edge Function
        if (dbError) {
            const edgeResult = await callAdminOperation<any>('add_anime', { anime });

            if (!edgeResult.success) {
                return {
                    success: false,
                    error: edgeResult.error || 'Failed to publish media. Please check your connection and try again.',
                };
            }
            insertedData = Array.isArray(edgeResult.data) ? edgeResult.data[0] : edgeResult.data;
        }

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
        // 1. Mark as permanently deleted in local persistent storage so it NEVER returns on reload
        await markMediaAsDeletedLocally(animeId);

        // If this is a local-only item, we are done! It doesn't exist in Supabase so don't try to delete it there.
        if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
            return { success: true, data: null };
        }

        // 2. Perform direct database delete on Supabase
        const { error } = await supabase
            .from('anime')
            .delete()
            .eq('id', animeId);

        if (error) {
            const edgeResult = await callAdminOperation('delete_anime', { id: animeId });
            if (edgeResult.success) return edgeResult;

            return { success: false, error: error.message };
        }

        return { success: true, data: null };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete media' };
    }
}

export async function updateAnimeFeatured(
    animeId: string,
    isFeatured: boolean
): Promise<AdminOperationResult<any>> {
    // 1. Instantly save to persistent overrides so it updates everywhere in the UI
    await saveEditedMediaOverride(animeId, { is_featured: isFeatured });

    // If this is a local-only item, we are done! It doesn't exist in Supabase so don't try to update it there.
    if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
        return { success: true, data: { id: animeId, is_featured: isFeatured } };
    }

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
        console.warn('updateAnimeFeatured error:', e);
        return { success: false, error: e.message || 'Failed to update featured status' };
    }
}

const EDITED_MEDIA_STORAGE_KEY = 'aniflix_edited_media_overrides_v2';
const OVERRIDE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days

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

        Object.keys(parsed).forEach((id) => {
            const item = parsed[id];
            // Filter out entries older than 7 days if timestamp is present
            if (!item._savedAt || (now - item._savedAt) < OVERRIDE_TTL_MS) {
                valid[id] = item;
            }
        });
        return valid;
    } catch {
        return {};
    }
}

export async function saveEditedMediaOverride(animeId: string, updates: Record<string, any>): Promise<void> {
    try {
        const current = await getEditedMediaOverrides();
        current[animeId] = {
            ...(current[animeId] || {}),
            ...updates,
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
    // 1. Instantly save to persistent overrides so it updates everywhere in the UI
    await saveEditedMediaOverride(animeId, updates);

    // Local-only items (not in DB) — nothing more to do
    if (String(animeId).startsWith('local_') || String(animeId).startsWith('debug_')) {
        return { success: true, data: { id: animeId, ...updates } };
    }

    try {
        // After migration 20260831030000 both video_url and video_asset_key exist in DB
        // and are kept in sync by the trg_sync_video_columns trigger. We just set one.
        const { data, error } = await supabase
            .from('anime')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', animeId)
            .select()
            .single();

        if (error) {
            // Fall through to Edge Function which runs as service-role and bypasses RLS
            const edgeResult = await callAdminOperation('update_anime', { anime: { id: animeId, ...updates } });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e: any) {
        console.warn('[admin-operations] updateAnime error:', e);
        return { success: false, error: e.message || 'Failed to update media' };
    }
}

export async function deleteCommentAsAdmin(commentId: string): Promise<AdminOperationResult<any>> {
    try {
        const edgeResult = await callAdminOperation('delete_comment', { comment: { id: commentId } });
        if (edgeResult.success) return edgeResult;
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

/**
 * Grants VIP status to a user by email, username, or ID.
 * Tries Edge Function first, then SECURITY DEFINER RPC functions, and finally direct DB update.
 */
export async function grantVipUser(
    emailOrUsername: string,
    days: number = 30
): Promise<AdminOperationResult<any>> {
    const targetInput = emailOrUsername.trim().toLowerCase();
    if (!targetInput) {
        return { success: false, error: 'Email or username is required.' };
    }

    // 1. Attempt via Edge Function first
    const edgeResult = await callAdminOperation<any>('grant_vip', {
        user: { email: targetInput, days },
    });

    if (edgeResult.success) {
        return edgeResult;
    }

    // 2. Attempt via SECURITY DEFINER RPC function 'admin_grant_vip_by_identifier'
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_grant_vip_by_identifier', {
            p_target: targetInput,
            p_days: days,
        });

        if (!rpcError && rpcData) {
            return {
                success: true,
                data: rpcData,
            };
        }
    } catch (_rpcErr) {
        // Fall through to lookup + fallback RPC
    }

    // 3. Fallback: Search profiles table first by email or username
    try {
        let { data: targetProfile } = await supabase
            .from('profiles')
            .select('id, email, username, is_vip, vip_expires_at')
            .or(`email.ilike.${targetInput},username.ilike.${targetInput}`)
            .maybeSingle();

        if (!targetProfile) {
            // Check if input is a valid UUID matching user ID
            const { data: idProfile } = await supabase
                .from('profiles')
                .select('id, email, username, is_vip, vip_expires_at')
                .eq('id', targetInput)
                .maybeSingle();
            targetProfile = idProfile;
        }

        if (!targetProfile) {
            return {
                success: false,
                error: `User with email/username "${targetInput}" was not found in registered profiles.`,
            };
        }

        // Try SECURITY DEFINER RPC by UUID
        try {
            const { data: uuidRpcData, error: uuidRpcError } = await supabase.rpc('admin_grant_vip', {
                p_target_user_id: targetProfile.id,
                p_days: days,
            });

            if (!uuidRpcError && uuidRpcData) {
                return {
                    success: true,
                    data: uuidRpcData,
                };
            }
        } catch (_uuidRpcErr) {
            // Fall through to direct table update
        }

        const currentExpiry = targetProfile.vip_expires_at ? new Date(targetProfile.vip_expires_at).getTime() : 0;
        const baseTime = Math.max(Date.now(), isNaN(currentExpiry) ? 0 : currentExpiry);
        const newExpiryIso = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

        const { data: updatedData, error: updateError } = await supabase
            .from('profiles')
            .update({
                is_vip: true,
                vip_expires_at: newExpiryIso,
                updated_at: new Date().toISOString(),
            })
            .eq('id', targetProfile.id)
            .select()
            .single();

        if (updateError) {
            return {
                success: false,
                error: updateError.message || 'Failed to update user VIP status in database.',
            };
        }

        return {
            success: true,
            data: updatedData || { message: `VIP granted for ${days} days` },
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'An error occurred while granting VIP status.',
        };
    }
}

