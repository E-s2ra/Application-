import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
};

class RequestError extends Error {}

function getAllowedOrigin(requestOrigin: string | null): string | null {
    const allowedStr = Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '';
    if (!requestOrigin || !allowedStr.trim()) return null;
    const allowed = allowedStr.split(',').map((o) => o.trim()).filter(Boolean);
    return allowed.includes(requestOrigin) ? requestOrigin : null;
}

serve(async (req) => {
    const requestOrigin = req.headers.get('origin');
    const origin = getAllowedOrigin(requestOrigin);
    const responseHeaders = {
        ...corsHeaders,
        ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
        'Content-Type': 'application/json',
    };

    if (requestOrigin && !origin) {
        return new Response(
            JSON.stringify({ success: false, error: 'Origin is not allowed.' }),
            { status: 403, headers: responseHeaders }
        );
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: responseHeaders });
    }

    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: responseHeaders }
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
                { status: 401, headers: responseHeaders }
            );
        }

        const { error: activeSessionError } = await supabase.rpc('assert_active_auth_session');
        if (activeSessionError) {
            return new Response(
                JSON.stringify({ success: false, error: 'This account session is no longer active.' }),
                { status: 403, headers: responseHeaders }
            );
        }

        // Keep privileged authorization inside the hardened database check.
        const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
        if (adminCheckError || isAdmin !== true) {
            return new Response(
                JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
                { status: 403, headers: responseHeaders }
            );
        }

        const body = await req.json();
        const { action, anime, comment, user: targetUser } = body;

        const normalizeMediaLocator = (value: unknown): string | null => {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value !== 'string') throw new RequestError('Invalid private video key.');
            const locator = value.trim();
            if (
                !locator
                || locator.length > 1000
                || locator.includes('\0')
                || locator.includes('://')
                || locator.includes('..')
                || locator.startsWith('/')
            ) {
                throw new RequestError('Use a relative path inside the private video bucket.');
            }
            return locator;
        };

        const normalizeEpisodeLinks = (value: unknown, episodeCount?: number) => {
            if (value === undefined) return undefined;
            if (value === null) return [];
            if (!Array.isArray(value)) throw new RequestError('Episode links must be an array.');

            const seen = new Set<number>();
            return value.map((entry: any) => {
                const episode = Number(entry?.episode);
                if (!Number.isSafeInteger(episode) || episode < 1) {
                    throw new RequestError('Each episode link needs a positive integer episode number.');
                }
                if (episodeCount && episode > episodeCount) {
                    throw new RequestError(`Episode ${episode} exceeds the configured episode count (${episodeCount}).`);
                }
                if (seen.has(episode)) throw new RequestError(`Duplicate episode link: ${episode}`);
                seen.add(episode);

                const sources = Array.isArray(entry?.sources)
                    ? entry.sources
                        .map((source: any, index: number) => {
                            const url = normalizeMediaLocator(source?.url);
                            if (!url) return null;
                            return {
                                id: source?.id ? String(source.id).slice(0, 120) : `source_${episode}_${index + 1}`,
                                label: source?.label ? String(source.label).trim().slice(0, 80) : `Server ${index + 1}`,
                                url,
                                is_default: Boolean(source?.is_default),
                            };
                        })
                        .filter(Boolean)
                    : [];

                const defaultSource = sources.find((source: any) => source?.is_default) ?? sources[0];
                const url = normalizeMediaLocator(entry?.url) ?? defaultSource?.url ?? null;
                if (!url) throw new RequestError(`Episode ${episode} has no playable source.`);

                if (sources.length > 0 && !sources.some((source: any) => source?.is_default)) {
                    sources[0].is_default = true;
                }

                return { episode, url, sources };
            }).sort((a, b) => a.episode - b.episode);
        };

        let result;
        let success = true;
        let errorMsg = '';

        switch (action) {
            case 'add_anime': {
                if (!anime?.title) {
                    throw new RequestError('Anime title is required');
                }
                const episodeCount = Math.max(1, Number(anime.episodes) || 1);
                const normalizedEpisodeLinks = normalizeEpisodeLinks(anime.episode_links, episodeCount) ?? [];
                const normalizedVideoKey = normalizeMediaLocator(
                    anime.video_asset_key ?? anime.video_url ?? normalizedEpisodeLinks[0]?.url
                );

                const cleanAnime = {
                    title: String(anime.title).trim(),
                    description: anime.description ? String(anime.description).trim() : null,
                    image_url: anime.image_url ? String(anime.image_url).trim() : null,
                    video_asset_key: normalizedVideoKey,
                    video_url: normalizedVideoKey,
                    episode_links: normalizedEpisodeLinks,
                    episodes: episodeCount,
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

            case 'get_anime_private': {
                if (!anime?.id) {
                    throw new RequestError('Anime ID is required');
                }

                const { data, error } = await supabaseAdmin
                    .from('anime')
                    .select('id, title, description, image_url, video_asset_key, video_url, episodes, genre, category, is_featured, episode_links')
                    .eq('id', anime.id)
                    .single();

                if (error) {
                    success = false;
                    errorMsg = error.message;
                } else {
                    result = data;
                }
                break;
            }

            case 'update_anime': {
                if (!anime?.id) {
                    throw new RequestError('Anime ID is required for update');
                }

                const updates: Record<string, any> = {
                    updated_at: new Date().toISOString(),
                };

                if (anime.title !== undefined) updates.title = String(anime.title).trim();
                if (anime.description !== undefined) updates.description = anime.description ? String(anime.description).trim() : null;
                if (anime.image_url !== undefined) updates.image_url = anime.image_url ? String(anime.image_url).trim() : null;

                if (anime.video_asset_key !== undefined || anime.video_url !== undefined) {
                    const normalizedVideoKey = normalizeMediaLocator(anime.video_asset_key ?? anime.video_url);
                    updates.video_asset_key = normalizedVideoKey;
                    updates.video_url = normalizedVideoKey;
                }

                if (anime.episodes !== undefined) updates.episodes = Math.max(1, Number(anime.episodes) || 1);
                if (anime.episode_links !== undefined) {
                    const episodeCount = updates.episodes ?? Math.max(
                        1,
                        ...((Array.isArray(anime.episode_links) ? anime.episode_links : [])
                            .map((entry: any) => Number(entry?.episode) || 1))
                    );
                    const normalizedEpisodeLinks = normalizeEpisodeLinks(anime.episode_links, episodeCount) ?? [];
                    updates.episode_links = normalizedEpisodeLinks;
                    if (anime.video_asset_key === undefined && anime.video_url === undefined && normalizedEpisodeLinks[0]?.url) {
                        updates.video_asset_key = normalizedEpisodeLinks[0].url;
                        updates.video_url = normalizedEpisodeLinks[0].url;
                    }
                }
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
                    throw new RequestError('Anime ID is required for deletion');
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
                    throw new RequestError('Anime ID is required');
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
                    throw new RequestError('Comment ID is required');
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
                    throw new RequestError('Missing target email or duration days');
                }
                const targetEmail = String(targetUser.email).trim().toLowerCase();
                const daysCount = Number(targetUser.days);
                if (!Number.isInteger(daysCount) || daysCount < 1 || daysCount > 3650) {
                    throw new RequestError('Invalid VIP duration days');
                }

                // Resolve the target with exact case-insensitive equality inside
                // the hardened database function. This avoids PostgREST filter
                // wildcard semantics for '%'/'_' and the old 1000-user list cap.
                const { data: grantResult, error: vipGrantError } = await supabaseAdmin.rpc('admin_grant_vip_by_identifier', {
                    p_target: targetEmail,
                    p_days: daysCount,
                });

                if (vipGrantError) {
                    success = false;
                    errorMsg = vipGrantError.message;
                } else {
                    result = grantResult;
                    const targetUserId = grantResult?.user_id;
                    if (!targetUserId) {
                        throw new RequestError(`User with email, username, or ID "${targetEmail}" was not found.`);
                    }
                    const isoExpiry = grantResult?.vip_expires_at;

                    // Log to vip_transactions table
                    try {
                        await supabaseAdmin.from('vip_transactions').insert({
                            user_id: targetUserId,
                            type: 'admin_grant',
                            duration: daysCount,
                            created_at: new Date().toISOString(),
                        });
                    } catch (_txErr) {
                        // Non-fatal if table/policy differs
                    }

                    await supabaseAdmin.rpc('log_audit_event', {
                        p_user_id: user.id,
                        p_action: 'grant_vip',
                        p_table_name: 'profiles',
                        p_record_id: targetUserId,
                        p_new_data: { is_vip: true, vip_expires_at: isoExpiry, duration_days: daysCount },
                    });
                }
                break;
            }

            default:
                return new Response(
                    JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
                    { status: 400, headers: responseHeaders }
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
                { status: 500, headers: responseHeaders }
            );
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { status: 200, headers: responseHeaders }
        );
    } catch (error: any) {
        const status = error instanceof RequestError || error instanceof SyntaxError ? 400 : 500;
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
            { status, headers: responseHeaders }
        );
    }
});
