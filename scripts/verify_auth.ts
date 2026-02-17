
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgqgpetmmjhhkgjzukhm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncWdwZXRtbWpoaGtnanp1a2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU3NzgsImV4cCI6MjA3NzQyMTc3OH0.8hrGxgTknlxfy2IF57rfTKoPpaXMhvh6GuxXzQdXlVY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log('Verifying Admin Auth...');
    const email = 'adminaurora@gmail.com';
    const password = 'aurora123';

    // 1. Try Login
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Login Failed:', error.message);
        if (error.message.includes('Invalid login credentials')) {
            console.log('User might not exist or password wrong.');
        }
    } else {
        console.log('Login Successful!');
        console.log('User ID:', data.user.id);

        // 2. Check Profile
        const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profile) {
            console.log('Profile Found:', profile);
        } else {
            console.log('Profile NOT found.', profileError?.message);
        }
    }
}

verify();
