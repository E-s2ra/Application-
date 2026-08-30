import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};
const ADMIN_EMAIL = 'esra99san@gmail.com';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with user token
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_ANON_KEY') || '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        // Create service client for admin operations and audit logging
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        );

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin' || user.email?.toLowerCase() !== ADMIN_EMAIL) {
            return new Response(
                JSON.stringify({ error: 'Access denied. Admin role required.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const body = await req.json();
        const { action, anime, comment, user: targetUser } = body;

        const normalizeVideoAssetKey = (value: unknown): string | null => {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value !== 'string') throw new Error('Invalid private video key.');
            const key = value.trim();
            if (!key || key.length > 500 || key.includes('..') || key.includes('://') || key.startsWith('/')) {
                throw new Error('Invalid private video key. Use a relative path inside the private video bucket.');
            }
            return key;
        };

        let result;
        let success = true;
        let errorMsg = null;

        // Execute admin action with proper validation
        switch (action) {
            case 'add_anime':
                if (!anime.title || !anime.episodes) {
                    throw new Error('Missing required fields: title, episodes');
                }

                const videoAssetKey = normalizeVideoAssetKey(anime.video_asset_key);

                const { data: newAnime, error: addError } = await supabaseAdmin
                    .from('anime')
                    .insert([{
                        title: anime.title,
                        description: anime.description || null,
                        image_url: anime.image_url || null,
                        video_asset_key: videoAssetKey,
                        episodes: anime.episodes,
                        genre: anime.genre || null,
                        category: anime.category || 'Movies',
                        is_featured: anime.is_featured || false,
                        episode_links: anime.episode_links || [],
                    }])
                    .select();

                if (addError) {
                    success = false;
                    errorMsg = addError.message;
                } else {
                    result = newAnime;
                    // Log the action
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'add_anime',
                        p_table_name: 'anime',
                        p_record_id: newAnime?.[0]?.id,
                        p_record_identifier: anime.title,
                        p_new_values: newAnime?.[0],
                        p_status: 'success',
                    });
                }
                break;

            case 'delete_anime':
                if (!anime.id) {
                    throw new Error('Missing required field: id');
                }

                // Get anime details for audit log
                const { data: animeToDelete } = await supabaseAdmin
                    .from('anime')
                    .select('*')
                    .eq('id', anime.id)
                    .single();

                const { error: deleteError } = await supabaseAdmin
                    .from('anime')
                    .delete()
                    .eq('id', anime.id);

                if (deleteError) {
                    success = false;
                    errorMsg = deleteError.message;
                } else {
                    result = { id: anime.id, deleted: true };
                    // Log the action
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'delete_anime',
                        p_table_name: 'anime',
                        p_record_id: anime.id,
                        p_record_identifier: animeToDelete?.title,
                        p_old_values: animeToDelete,
                        p_status: 'success',
                    });
                }
                break;

            case 'update_featured':
                if (!anime.id || typeof anime.is_featured === 'undefined') {
                    throw new Error('Missing required fields: id, is_featured');
                }

                // Get old values for audit log
                const { data: animeToUpdate } = await supabaseAdmin
                    .from('anime')
                    .select('*')
                    .eq('id', anime.id)
                    .single();

                const { data: updated, error: updateError } = await supabaseAdmin
                    .from('anime')
                    .update({ is_featured: anime.is_featured })
                    .eq('id', anime.id)
                    .select();

                if (updateError) {
                    success = false;
                    errorMsg = updateError.message;
                } else {
                    result = updated;
                    // Log the action
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'update_anime_featured',
                        p_table_name: 'anime',
                        p_record_id: anime.id,
                        p_record_identifier: updated?.[0]?.title,
                        p_old_values: animeToUpdate,
                        p_new_values: updated?.[0],
                        p_status: 'success',
                    });
                }
                break;

            case 'update_anime': {
                if (!anime.id || !anime.title || !Number.isInteger(anime.episodes) || anime.episodes < 1) {
                    throw new Error('A title and a positive number of episodes are required.');
                }

                const { data: oldAnime } = await supabaseAdmin
                    .from('anime')
                    .select('*')
                    .eq('id', anime.id)
                    .single();

                const { data: updatedAnime, error: updateAnimeError } = await supabaseAdmin
                    .from('anime')
                    .update({
                        title: anime.title.trim(),
                        description: anime.description || null,
                        image_url: anime.image_url || null,
                        video_asset_key: normalizeVideoAssetKey(anime.video_asset_key),
                        episodes: anime.episodes,
                        genre: anime.genre || null,
                        category: anime.category || 'Movies',
                        is_featured: Boolean(anime.is_featured),
                    })
                    .eq('id', anime.id)
                    .select()
                    .single();

                if (updateAnimeError) {
                    success = false;
                    errorMsg = updateAnimeError.message;
                } else {
                    result = updatedAnime;
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'update_anime',
                        p_table_name: 'anime',
                        p_record_id: anime.id,
                        p_record_identifier: updatedAnime.title,
                        p_old_values: oldAnime,
                        p_new_values: updatedAnime,
                        p_status: 'success',
                    });
                }
                break;
            }

            case 'delete_comment': {
                if (!comment?.id) throw new Error('Missing comment id.');
                const { data: commentToDelete } = await supabaseAdmin
                    .from('comments').select('*').eq('id', comment.id).single();
                const { error: commentDeleteError } = await supabaseAdmin
                    .from('comments').delete().eq('id', comment.id);
                if (commentDeleteError) {
                    success = false;
                    errorMsg = commentDeleteError.message;
                } else {
                    result = { id: comment.id, deleted: true };
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'delete_comment',
                        p_table_name: 'comments',
                        p_record_id: comment.id,
                        p_old_values: commentToDelete,
                        p_status: 'success',
                    });
                }
                break;
            }

            case 'set_user_suspension': {
                if (!targetUser?.id || targetUser.id === user.id || typeof targetUser.suspended !== 'boolean') {
                    throw new Error('Invalid user suspension request.');
                }
                const { error: suspensionError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
                    ban_duration: targetUser.suspended ? '8760h' : 'none',
                });
                if (suspensionError) {
                    success = false;
                    errorMsg = suspensionError.message;
                } else {
                    result = { id: targetUser.id, suspended: targetUser.suspended };
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: targetUser.suspended ? 'suspend_user' : 'unsuspend_user',
                        p_table_name: 'profiles',
                        p_record_id: targetUser.id,
                        p_status: 'success',
                    });
                }
                break;
            }

            default:
                return new Response(
                    JSON.stringify({ error: 'Unknown action' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }

        if (!success) {
            // Log failure
            await supabaseAdmin.rpc('log_audit_event', {
                p_user_id: user.id,
                p_action: action,
                p_table_name: 'anime',
                p_status: 'failure',
                p_error_message: errorMsg,
            });

            return new Response(
                JSON.stringify({ error: errorMsg }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
