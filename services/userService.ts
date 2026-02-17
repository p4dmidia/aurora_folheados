import { supabase } from '../lib/supabase';
import { User as UserProfile } from '../types';
import { sanitizeUUID } from '../lib/validators';

export const userService = {
    async getUsers() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;
        return data as UserProfile[];
    },

    async createUser(user: Omit<UserProfile, 'id' | 'created_at'> & { senha?: string }) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: user.senha || 'aurora123',
            options: {
                data: {
                    nome: user.nome,
                    role: user.role
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Falha ao criar conta de autenticação');

        // Give a tiny bit of time for trigger if needed, or just select
        const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            console.warn('Profile not found immediately after creation, returning auth data', profileError);
            return {
                id: authData.user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                status: 'ATIVO'
            } as UserProfile;
        }

        return profile as UserProfile;
    },

    async updateUser(id: string, updates: Partial<UserProfile>) {
        const sanitizedUpdates = { ...updates };
        if ('superior_id' in sanitizedUpdates) {
            sanitizedUpdates.superior_id = sanitizeUUID(sanitizedUpdates.superior_id) as any;
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(sanitizedUpdates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0] as UserProfile;
    },

    async deleteUser(id: string) {
        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
