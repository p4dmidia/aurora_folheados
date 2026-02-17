
import { createClient } from '@supabase/supabase-js';

// Hardcoded for script execution only (to avoid Vite vs Node env issues)
const SUPABASE_URL = 'https://xgqgpetmmjhhkgjzukhm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncWdwZXRtbWpoaGtnanp1a2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU3NzgsImV4cCI6MjA3NzQyMTc3OH0.8hrGxgTknlxfy2IF57rfTKoPpaXMhvh6GuxXzQdXlVY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

enum Role {
    ADMIN = 'ADMIN',
    PROMOTOR = 'PROMOTOR',
    PARCEIRO = 'PARCEIRO'
}

async function createAdmin() {
    console.log('Creating Admin User...');
    const email = 'adminaurora@gmail.com';
    const password = 'aurora123';
    const name = 'Administrador Aurora';

    try {
        // 1. SignUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            console.error('Auth Error:', authError.message);
            // If user exists, we might still want to check profile
            if (!authData.user && authError.message.includes('already registered')) {
                // Try SignIn to get ID? Or we can't get ID easily without login.
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (signInData.user) {
                    console.log('User signed in. Checking profile for ID:', signInData.user.id);
                    await ensureProfile(signInData.user.id, email, name);
                }
                return;
            }
            return;
        }

        if (authData.user) {
            console.log('Auth User Created. ID:', authData.user.id);
            await ensureProfile(authData.user.id, email, name);
        } else {
            console.log('Auth request sent (maybe confirmation pending?)');
        }

    } catch (error: any) {
        console.error('Script Error:', error.message);
    }
}

async function ensureProfile(id: string, email: string, name: string) {
    // Check if profile exists
    const { data: existing } = await supabase.from('usuarios').select('*').eq('id', id).single();

    if (existing) {
        console.log('Profile already exists.');
        // Update role to be sure
        await supabase.from('usuarios').update({ role: Role.ADMIN }).eq('id', id);
        console.log('Role ensured as ADMIN.');
    } else {
        console.log('Creating profile...');
        const { error } = await supabase.from('usuarios').insert([{
            id: id,
            email: email,
            nome: name,
            role: Role.ADMIN,
            status: 'ATIVO'
        }]);

        if (error) console.error('Profile creation error:', error);
        else console.log('Profile created successfully!');
    }
}

createAdmin();
