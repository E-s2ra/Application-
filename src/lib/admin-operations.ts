import { supabase, SUPABASE_URL } from '@/lib/supabase';

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
        const { data, error } = await supabase
            .from('anime')
            .insert({
                title: anime.title,
                description: anime.description || null,
                image_url: anime.image_url || null,
                video_asset_key: anime.video_asset_key || null,
                episodes: anime.episodes || 1,
                genre: anime.genre || null,
                category: anime.category || 'Anime Series',
                is_featured: anime.is_featured ?? false,
                published_at: new Date().toISOString(),
            })
            .select()
            .single();

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
        // Clean up linked comments/notifications first
        try {
            await supabase.from('notifications').delete().eq('resource_type', 'anime').eq('resource_id', animeId);
        } catch (_e) {}
        try {
            await supabase.from('comments').delete().eq('movie_id', animeId);
        } catch (_e) {}

        const { error } = await supabase.from('anime').delete().eq('id', animeId);
        if (error) {
            const edgeResult = await callAdminOperation('delete_anime', { anime: { id: animeId } });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
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
    try {
        const { error } = await supabase
            .from('anime')
            .update({ is_featured: isFeatured })
            .eq('id', animeId);
        if (error) {
            const edgeResult = await callAdminOperation('update_featured', {
                anime: { id: animeId, is_featured: isFeatured },
            });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update featured' };
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
    }
): Promise<AdminOperationResult<any>> {
    try {
        const { data, error } = await supabase
            .from('anime')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', animeId)
            .select()
            .single();

        if (error) {
            const edgeResult = await callAdminOperation('update_anime', { anime: { id: animeId, ...updates } });
            if (edgeResult.success) return edgeResult;
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to update anime' };
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
