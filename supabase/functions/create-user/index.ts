// File: supabase/functions/create-user/index.ts
/// <reference path="./deno.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sanitizeUUID = (id: any) => {
    if (!id || typeof id !== 'string' || id.trim() === '') return null;
    // Relaxed UUID validation regex (checks only format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id.trim()) ? id.trim() : null;
};

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { 
            email, password, role, full_name, institution_id, 
            class_name, section, academic_year, 
            parent_name, parent_email, parent_phone, parent_id, parent_relation,
            register_number, staff_id, phone, date_of_birth, gender, address,
            blood_group, city, zip_code, image_url,
            student_id, student_ids, parent_contact, department, subjects, // optional override
        } = await req.json();

        console.log(`Creating user: ${email} (Role: ${role}, InstUUID: ${institution_id})`);
        if (class_name) console.log(`Student Detail: Class ${class_name}, Section ${section}`);

        if (!email || !role || !institution_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: email, role, and institution_id are required." }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        const normalizeRole = (r: string) => {
            const lower = r.toLowerCase();
            return lower === 'teacher' ? 'faculty' : lower;
        };
        const finalRole = normalizeRole(role);

        // Validate password length (Supabase requires 6 chars)
        let finalPassword = password || institution_id;
        if (finalPassword.length < 6) {
            finalPassword = finalPassword.padEnd(6, '0');
        }
        const forcePasswordChange = !password;

        console.log(`Processing user: ${email.toLowerCase()}, role: ${finalRole}`);

        // 1. Check if user already exists
        const { data: existingUser, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (checkError) console.error("Error checking existing user:", checkError);

        let userId = existingUser?.id;
        let authUserDetails: any = null;

        if (!userId) {
            console.log("User not found in profiles, creating new auth user...");
            const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: email.toLowerCase(),
                password: finalPassword,
                user_metadata: {
                    role: finalRole,
                    full_name,
                    institution_id,
                    force_password_change: forcePasswordChange
                },
                email_confirm: true
            })

            if (authError) {
                console.error("Auth creation failed:", authError);
                throw authError;
            }

            userId = newAuthUser.user.id;
            authUserDetails = newAuthUser.user;
            console.log("Auth user created successfully:", userId);
        } else {
            console.log("Existing user found with ID:", userId);
            // Construct a user object that mimics the auth response enough for the frontend
            authUserDetails = {
                id: userId,
                email: email.toLowerCase(),
                user_metadata: {
                    role: finalRole,
                    full_name: full_name,
                    institution_id: institution_id
                }
            };
        }

        // 2. Upsert Profile
        const profileData: any = {
            id: userId,
            email: email.toLowerCase(),
            full_name: full_name,
            role: finalRole,
            institution_id: institution_id,
            is_active: true, // Ensure new users are active by default
            updated_at: new Date().toISOString()
        };

        if (phone) profileData.phone = phone;
        if (staff_id) profileData.staff_id = staff_id;
        if (department) profileData.department = department;
        if (date_of_birth) profileData.date_of_birth = date_of_birth;
        if (image_url) {
            profileData.profile_image_url = image_url;
            profileData.avatar_url = image_url;
        }

        console.log(`Upserting profile for user ${userId} with role ${finalRole}...`);
        console.log("Profile data to upsert:", JSON.stringify(profileData, null, 2));

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
            console.error("Profile upsert error:", profileError);
            throw new Error(`Profile update failed: ${profileError.message}`);
        }
        console.log("Profile upserted successfully.");

        // 3. Role-specific table updates
        if (finalRole === 'student') {
            console.log("Syncing student record...");
            const studentData: any = {
                id: student_id || userId,
                profile_id: userId,
                institution_id: institution_id,
                name: full_name,
                email: email.toLowerCase(),
                register_number: register_number || `REG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                class_name: class_name,
                section: section || 'A',
                image_url: image_url,
                phone: phone,
                gender: gender,
                address: address,
                dob: date_of_birth,
                academic_year: academic_year,
                is_active: true,
                parent_name: parent_name,
                parent_email: parent_email,
                parent_phone: parent_phone,
                parent_contact: parent_phone || parent_contact,
                parent_relation: parent_relation,
                parent_id: sanitizeUUID(parent_id),
                blood_group: blood_group,
                city: city,
                zip_code: zip_code
            };
            
            console.log("Student payload for upsert:", JSON.stringify(studentData, null, 2));

            const { error: studentError } = await supabaseAdmin
                .from('students')
                .upsert(studentData);

            if (studentError) {
                console.error("Student sync error:", studentError);
                throw new Error(`Student sync failed: ${studentError.message}${studentError.details ? ' (' + studentError.details + ')' : ''}${studentError.hint ? ' - Hint: ' + studentError.hint : ''} (Code: ${studentError.code})`);
            }

        } else if (finalRole === 'parent') {
            console.log("Syncing parent record and student links...");
            const { data: parentData, error: parentError } = await supabaseAdmin
                .from('parents')
                .upsert({
                    profile_id: userId,
                    institution_id: institution_id,
                    name: full_name,
                    email: email.toLowerCase(),
                    phone: phone || null
                }, { onConflict: 'profile_id' })
                .select()
                .single();

            if (parentError) {
                console.error("Parent sync error:", parentError);
                // If the parents table doesn't have an email column, try without it
                const { data: parentData2, error: parentError2 } = await supabaseAdmin
                    .from('parents')
                    .upsert({
                        profile_id: userId,
                        institution_id: institution_id,
                        name: full_name,
                        phone: phone || null
                    }, { onConflict: 'profile_id' })
                    .select()
                    .single();

                if (parentError2) {
                    console.error("Parent sync error (retry):", parentError2);
                    throw new Error(`Parent sync failed: ${parentError2.message}`);
                }

                const targetStudentIds = student_ids || (student_id ? [student_id] : []);
                if (targetStudentIds.length > 0 && parentData2) {
                    const links = targetStudentIds.map((sId: string) => ({
                        student_id: sId,
                        parent_id: parentData2.id
                    }));
                    const { error: linkError } = await supabaseAdmin
                        .from('student_parents')
                        .upsert(links, { onConflict: 'student_id,parent_id' });
                    if (linkError) console.error("student_parents link error:", linkError);

                    const { error: studentUpdateError } = await supabaseAdmin
                        .from('students')
                        .update({ parent_id: userId })
                        .in('id', targetStudentIds);
                    if (studentUpdateError) console.error("Students parent_id update error:", studentUpdateError);
                }
            } else if (parentData) {
                const targetStudentIds = student_ids || (student_id ? [student_id] : []);

                if (targetStudentIds.length > 0) {
                    console.log(`Linking parent ${parentData.id} to students:`, targetStudentIds);

                    // a. Link in student_parents join table
                    const links = targetStudentIds.map((sId: string) => ({
                        student_id: sId,
                        parent_id: parentData.id
                    }));

                    const { error: linkError } = await supabaseAdmin
                        .from('student_parents')
                        .upsert(links, { onConflict: 'student_id,parent_id' });
                    if (linkError) console.error("student_parents link error:", linkError);

                    // b. Update students.parent_id (FK to profiles)
                    const { error: studentUpdateError } = await supabaseAdmin
                        .from('students')
                        .update({ parent_id: userId })
                        .in('id', targetStudentIds);
                    if (studentUpdateError) console.error("Students parent_id update error:", studentUpdateError);

                    console.log("Relationship syncing complete.");
                }
            }
        } else if (['faculty', 'institution', 'admin', 'accountant', 'canteen_manager', 'driver'].includes(finalRole)) {
            console.log("Syncing staff record...");
            const { error: staffError } = await supabaseAdmin
                .from('staff_details')
                .upsert({
                    profile_id: userId,
                    institution_id: institution_id,
                    role: finalRole,
                    department: department || null,
                    subjects: subjects || [],
                    staff_id: staff_id || `STF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                }, { onConflict: 'profile_id' });

            if (staffError) {
                console.error("Staff sync error:", staffError);
                throw new Error(`Staff sync failed: ${staffError.message}`);
            }

            if (finalRole === 'institution') {
                await supabaseAdmin
                    .from('institutions')
                    .update({ admin_email: email.toLowerCase(), admin_password: finalPassword })
                    .eq('institution_id', institution_id);
            }
        }

        console.log("Edge Function processed successfully.");
        return new Response(
            JSON.stringify({ user: authUserDetails }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        console.error("CRITICAL Edge Function Error:", error);
        return new Response(
            JSON.stringify({ 
                error: error.message || "Unknown error occurred",
                details: error.stack || null 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
})
