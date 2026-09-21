import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};

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

        // Create service client for admin operations
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

        const body = await req.json().catch(() => null) as { current_device_id?: unknown } | null;
        const currentDeviceId = typeof body?.current_device_id === 'string'
            ? body.current_device_id.trim()
            : '';

        if (currentDeviceId.length < 20 || currentDeviceId.length > 200) {
            return new Response(
                JSON.stringify({ error: 'Invalid current_device_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // A displaced but still-unexpired JWT must never be able to delete the
        // newer active device row and then reclaim single-device ownership.
        const [{ error: activeSessionError }, { data: isCurrentDevice, error: currentDeviceError }] = await Promise.all([
            supabase.rpc('assert_active_auth_session'),
            supabase.rpc('is_current_device', { p_device_id: currentDeviceId }),
        ]);
        if (activeSessionError || currentDeviceError || isCurrentDevice !== true) {
            return new Response(
                JSON.stringify({ error: 'This account session is no longer active' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!accessToken) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Revoke every other Supabase Auth session while keeping this one alive.
        const { error: revokeError } = await supabaseAdmin.auth.admin.signOut(accessToken, 'others');
        if (revokeError) {
            return new Response(
                JSON.stringify({ error: 'Unable to revoke other sessions' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Clean up any legacy extra device rows left from older schemas.
        const { error: deleteError } = await supabaseAdmin
            .from('device_sessions')
            .delete()
            .eq('user_id', user.id)
            .neq('device_id', currentDeviceId);

        if (deleteError) {
            return new Response(
                JSON.stringify({ error: deleteError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Log the action
        await supabaseAdmin.rpc('log_audit_event', {
            p_user_id: user.id,
            p_action: 'sign_out_all_other_devices',
            p_table_name: 'device_sessions',
            p_record_identifier: `user:${user.id}`,
            p_status: 'success',
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: 'All other devices have been signed out'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
