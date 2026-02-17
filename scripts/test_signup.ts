
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgqgpetmmjhhkgjzukhm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncWdwZXRtbWpoaGtnanp1a2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU3NzgsImV4cCI6MjA3NzQyMTc3OH0.8hrGxgTknlxfy2IF57rfTKoPpaXMhvh6GuxXzQdXlVY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log('Testing SignUp...');
    const email = 'testuser' + Date.now() + '@example.com';
    const password = 'password123';

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error('SignUp Error:', error.message);
    } else {
        console.log('SignUp Success! User ID:', data.user?.id);
    }
}

test();
