import { supabase } from '../lib/supabase';
import { User, Role } from '../types';

export const authService = {
    async signIn(email: string, password: string): Promise<User> {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;
        if (!authData.session) throw new Error('No session created');

        // Fetch Profile
        const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authData.user?.id) // Assuming we sync IDs
            .single();

        // Fallback: If no profile exists (legacy/dev), maybe try by email or return basic
        // Fallback: If no profile exists (legacy/dev), maybe try by email or return basic
        if (profileError || !profile) {
            // Self-healing: Create Profile if missing
            console.warn('Profile missing for user, creating default...');
            // Simple heuristic for role based on email for initial setup
            const newRole = authData.user?.email?.includes('admin') ? Role.ADMIN : Role.PARCEIRO;

            const { data: newProfile, error: createError } = await supabase
                .from('usuarios')
                .insert([{
                    id: authData.user?.id,
                    email: authData.user?.email,
                    nome: authData.user?.email?.split('@')[0] || 'Novo Usuário',
                    role: newRole,
                    status: 'ATIVO'
                }])
                .select()
                .single();

            if (createError) {
                console.error('Failed to auto-create profile:', createError);
                throw new Error('User profile not found and could not be created: ' + createError.message);
            }

            return newProfile as User;
        }

        return profile as User;
    },

    async signUpAdmin(email: string, password: string, name: string) {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        // 2. Create Profile
        const { error: profileError } = await supabase
            .from('usuarios')
            .insert([{
                id: authData.user.id, // FORCE SAME ID
                email: email,
                nome: name,
                role: Role.ADMIN,
                status: 'ATIVO'
            }]);

        if (profileError) {
            // Rollback auth user? (Not possible easily from client)
            console.error('Failed to create profile', profileError);
            throw profileError;
        }
    },

    async signOut() {
        return supabase.auth.signOut();
    },

    async getCurrentUser(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single();

        return profile as User | null;
    }
};
