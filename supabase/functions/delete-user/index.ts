// File: supabase/functions/delete-user/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userId, userType } = await req.json()

        if (!userId || !userType) {
            throw new Error("Missing required fields: userId and userType are required.")
        }

        // Validate userType
        const validTypes = ['student', 'staff', 'parent'];
        if (!validTypes.includes(userType)) {
            throw new Error(`Invalid userType. Must be one of: ${validTypes.join(', ')}`)
        }

        // Initialize Supabase Admin Client with SERVICE ROLE KEY
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Internal Configuration Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // MANUAL TOKEN VERIFICATION
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: requestUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !requestUser) {
            console.error('Token verification failed:', userError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
                status: 401,
                headers: corsHeaders
            });
        }

        // Verify the requesting user has permission (institution admin or super admin)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, institution_id')
            .eq('id', requestUser.id)
            .single();

        if (!profile || !['institution', 'admin', 'super_admin'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
                status: 403,
                headers: corsHeaders
            });
        }

        // Get user details before deletion to verify they exist and get auth user ID
        let authUserId = userId;
        let userExists = false;

        if (userType === 'student') {
            const { data: student } = await supabaseAdmin
                .from('students')
                .select('id, email')
                .eq('id', userId)
                .single();

            if (student) {
                userExists = true;
                authUserId = student.id;
            }
        } else if (userType === 'parent') {
            const { data: parent } = await supabaseAdmin
                .from('parents')
                .select('profile_id, email')
                .eq('id', userId)
                .single();

            if (parent) {
                userExists = true;
                authUserId = parent.profile_id;
            }
        } else if (userType === 'staff') {
            // For staff, the userId IS the profile_id (auth user id)
            const { data: staffProfile } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('id', userId)
                .single();

            if (staffProfile) {
                userExists = true;
                authUserId = staffProfile.id;
            }
        }

        if (!userExists) {
            throw new Error(`User not found in ${userType} records`);
        }

        // Step 1: Delete from role-specific tables (cascading will handle related records)
        if (userType === 'student') {
            const { error: studentError } = await supabaseAdmin
                .from('students')
                .delete()
                .eq('id', userId);

            if (studentError) {
                console.error('Error deleting student record:', studentError);
                throw new Error(`Failed to delete student record: ${studentError.message}`);
            }
        } else if (userType === 'parent') {
            const { error: parentError } = await supabaseAdmin
                .from('parents')
                .delete()
                .eq('id', userId);

            if (parentError) {
                console.error('Error deleting parent record:', parentError);
                throw new Error(`Failed to delete parent record: ${parentError.message}`);
            }
        } else if (userType === 'staff') {
            // Delete from staff_details if exists
            await supabaseAdmin
                .from('staff_details')
                .delete()
                .eq('profile_id', userId);

            // Delete from accountants if exists
            await supabaseAdmin
                .from('accountants')
                .delete()
                .eq('profile_id', userId);
        }

        // Step 2: Delete from profiles table (if not student, as students don't have profiles)
        if (userType !== 'student') {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', authUserId);

            if (profileError) {
                console.error('Error deleting profile:', profileError);
                // Don't throw here, continue to delete auth user
            }
        }

        // Step 3: Delete from Supabase Auth (this prevents login)
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

        if (authDeleteError) {
            console.error('Error deleting auth user:', authDeleteError);
            throw new Error(`Failed to delete authentication account: ${authDeleteError.message}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `${userType} deleted successfully`,
                deletedUserId: userId,
                deletedAuthUserId: authUserId
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        console.error("Error in delete-user function:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });

        return new Response(
            JSON.stringify({
                error: error.message || "Failed to delete user",
                details: error.details || null,
                hint: error.hint || null
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
