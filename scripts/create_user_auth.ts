import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgqgpetmmjhhkgjzukhm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncWdwZXRtbWpoaGtnanp1a2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDU3NzgsImV4cCI6MjA3NzQyMTc3OH0.8hrGxgTknlxfy2IF57rfTKoPpaXMhvh6GuxXzQdXlVY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUser() {
    const email = 'agenciap4d@gmail.com';
    const password = 'w3id3r007';
    const nome = 'WEIDER DE OLIVEIRA';
    const role = 'PROMOTOR';

    console.log(`Creating user ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nome,
                role
            }
        }
    });

    if (error) {
        console.error('SignUp Error:', error.message);
        process.exit(1);
    }

    console.log('SignUp Success! User ID:', data.user?.id);
    console.log('Account linked successfully.');
}

createUser();
