import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};

function getAllowedOrigin(requestOrigin: string | null): string | null {
    const allowedStr = Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '';
    if (!allowedStr.trim()) return requestOrigin; // Allow all origins if not specified
    const allowed = allowedStr.split(',').map((o) => o.trim()).filter(Boolean);
    return requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : null;
}

serve(async (req) => {
    const origin = getAllowedOrigin(req.headers.get('origin'));
    const responseHeaders = {
        ...corsHeaders,
        'Access-Control-Allow-Origin': origin || '*',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: responseHeaders });
    }

    const ADMIN_EMAIL = (Deno.env.get('ADMIN_EMAIL') || 'esra99san@gmail.com').toLowerCase().trim();

    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 200, headers: responseHeaders }
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
                JSON.stringify({ success: false, error: 'Unauthorized' }),
                { status: 200, headers: responseHeaders }
            );
        }

        // Check if user is admin (profile role MUST be admin)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isUserAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL;
        const isUserAdminRole = profile?.role === 'admin';

        if (profileError || !profile || (!isUserAdminRole && !isUserAdminEmail)) {
            return new Response(
                JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
                { status: 200, headers: responseHeaders }
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
        let errorMsg = '';

        switch (action) {
            case 'add_anime': {
                if (!anime?.title) {
                    throw new Error('Anime title is required');
                }
                const normalizedVideoKey = normalizeVideoAssetKey(anime.video_asset_key ?? anime.video_url);

                const cleanAnime = {
                    title: String(anime.title).trim(),
                    description: anime.description ? String(anime.description).trim() : null,
                    image_url: anime.image_url ? String(anime.image_url).trim() : null,
                    video_asset_key: normalizedVideoKey,
                    video_url: normalizedVideoKey,
                    episodes: Number(anime.episodes) || 1,
                    genre: anime.genre ? String(anime.genre).trim() : null,
                    category: anime.category ? String(anime.category).trim() : 'Movies',
                    is_featured: Boolean(anime.is_featured),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                const { data, error } = await supabaseAdmin
                    .from('anime')
                    .insert(cleanAnime)
                    .select()
                    .single();

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    result = data;
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'add_anime',
                        p_table_name: 'anime',
                        p_record_id: data.id,
                        p_new_data: data,
                    });
                }
                break;
            }

            case 'update_anime': {
                if (!anime?.id) {
                    throw new Error('Anime ID is required for update');
                }

                const updates: Record<string, any> = {
                    updated_at: new Date().toISOString(),
                };

                if (anime.title !== undefined) updates.title = String(anime.title).trim();
                if (anime.description !== undefined) updates.description = anime.description ? String(anime.description).trim() : null;
                if (anime.image_url !== undefined) updates.image_url = anime.image_url ? String(anime.image_url).trim() : null;

                if (anime.video_asset_key !== undefined || anime.video_url !== undefined) {
                    const normalizedVideoKey = normalizeVideoAssetKey(anime.video_asset_key ?? anime.video_url);
                    updates.video_asset_key = normalizedVideoKey;
                    updates.video_url = normalizedVideoKey;
                }

                if (anime.episodes !== undefined) updates.episodes = Number(anime.episodes) || 1;
                if (anime.genre !== undefined) updates.genre = anime.genre ? String(anime.genre).trim() : null;
                if (anime.category !== undefined) updates.category = anime.category ? String(anime.category).trim() : 'Movies';
                if (anime.is_featured !== undefined) updates.is_featured = Boolean(anime.is_featured);

                const { data, error } = await supabaseAdmin
                    .from('anime')
                    .update(updates)
                    .eq('id', anime.id)
                    .select()
                    .single();

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    result = data;
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'update_anime',
                        p_table_name: 'anime',
                        p_record_id: anime.id,
                        p_new_data: updates,
                    });
                }
                break;
            }

            case 'delete_anime': {
                if (!anime?.id) {
                    throw new Error('Anime ID is required for deletion');
                }

                const { error } = await supabaseAdmin
                    .from('anime')
                    .delete()
                    .eq('id', anime.id);

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'delete_anime',
                        p_table_name: 'anime',
                        p_record_id: anime.id,
                    });
                }
                break;
            }

            case 'toggle_featured': {
                if (!anime?.id) {
                    throw new Error('Anime ID is required');
                }

                const { data, error } = await supabaseAdmin
                    .from('anime')
                    .update({
                        is_featured: Boolean(anime.is_featured),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', anime.id)
                    .select()
                    .single();

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    result = data;
                }
                break;
            }

            case 'delete_comment': {
                if (!comment?.id) {
                    throw new Error('Comment ID is required');
                }

                const { error } = await supabaseAdmin
                    .from('comments')
                    .delete()
                    .eq('id', comment.id);

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'delete_comment',
                        p_table_name: 'comments',
                        p_record_id: comment.id,
                    });
                }
                break;
            }

            case 'grant_vip':
            case 'grantVip':
            case 'grant-vip': {
                if (!targetUser?.email || !targetUser?.days) {
                    throw new Error('Missing target email or duration days');
                }
                const targetEmail = String(targetUser.email).trim().toLowerCase();
                const daysCount = Number(targetUser.days);
                if (isNaN(daysCount) || daysCount < 1) {
                    throw new Error('Invalid VIP duration days');
                }

                // 1. Look up user in auth.users by email
                const { data: authUserList } = await supabaseAdmin.auth.admin.listUsers();
                const matchedAuthUser = authUserList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
                let targetUserId = matchedAuthUser?.id;

                // 2. Fallback: search profiles table by email or username
                if (!targetUserId) {
                    const { data: targetProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('id')
                        .or(`email.ilike.${targetEmail},username.ilike.${targetEmail}`)
                        .maybeSingle();
                    targetUserId = targetProfile?.id;
                }

                if (!targetUserId) {
                    throw new Error(`User with email or username "${targetEmail}" was not found.`);
                }

                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + daysCount);
                const isoExpiry = expiryDate.toISOString();

                const { data: updatedProfile, error: vipGrantError } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        is_vip: true,
                        vip_expires_at: isoExpiry,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', targetUserId)
                    .select()
                    .single();

                if (vipGrantError) {
                    success = false;
                    errorMsg = vipGrantError.message;
                } else {
                    result = updatedProfile;
                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'grant_vip',
                        p_table_name: 'profiles',
                        p_record_id: targetUserId,
                        p_new_data: { is_vip: true, vip_expires_at: isoExpiry },
                    });
                }
                break;
            }

            case 'set_user_suspension': {
                if (!targetUser?.id) {
                    throw new Error('User ID is required');
                }

                const isSuspended = Boolean(targetUser.suspended);
                const { data, error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        is_suspended: isSuspended,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', targetUser.id)
                    .select()
                    .single();

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    result = data;
                }
                break;
            }

            default:
                return new Response(
                    JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
                    { status: 200, headers: responseHeaders }
                );
        }

        if (!success) {
            await supabaseAdmin.rpc('log_audit_event', {
                p_user_id: user.id,
                p_action: action,
                p_table_name: 'anime',
                p_status: 'failure',
                p_error_message: errorMsg,
            });

            return new Response(
                JSON.stringify({ success: false, error: errorMsg }),
                { status: 200, headers: responseHeaders }
            );
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { status: 200, headers: responseHeaders }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
            { status: 200, headers: responseHeaders }
        );
    }
});
