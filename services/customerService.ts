import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export const customerService = {
    async getCustomers() {
        const { data, error } = await supabase
            .from('clientes')
            .select(`
                *,
                pdv:pdvs(nome_fantasia)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Customer[];
    },

    async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'pdv'>) {
        const { data, error } = await supabase
            .from('clientes')
            .insert([customer])
            .select();

        if (error) throw error;
        return data[0] as Customer;
    },

    async updateCustomer(id: string, updates: Partial<Customer>) {
        const { pdv, ...cleanUpdates } = updates as any;
        const { data, error } = await supabase
            .from('clientes')
            .update(cleanUpdates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0] as Customer;
    },

    async deleteCustomer(id: string) {
        const { error } = await supabase
            .from('clientes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getBirthdaysOfMonth(month: number) {
        // month is 1-indexed (1 = January)
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .filter('data_nascimento', 'not.is', null);

        if (error) throw error;

        // Filter in JS since Postgres DATE_PART is easier via raw SQL but filter is okay for small datasets
        return data.filter(c => {
            const birthMonth = new Date(c.data_nascimento).getUTCMonth() + 1;
            return birthMonth === month;
        });
    },

    async getCustomersByPDV(pdvId: string) {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('pdv_origem', pdvId)
            .order('nome', { ascending: true });

        if (error) throw error;
        return data as Customer[];
    },

    async findOrCreateCustomer(customerData: { nome: string; whatsapp?: string; cpf?: string; pdv_origem?: string }) {
        if (!customerData.nome) return null;

        // Try to find by WhatsApp first (most common key for small retail)
        if (customerData.whatsapp) {
            const { data } = await supabase
                .from('clientes')
                .select('*')
                .eq('whatsapp', customerData.whatsapp)
                .maybeSingle();

            if (data) return data as Customer;
        }

        // Try by CPF
        if (customerData.cpf) {
            const customer = await this.getCustomerByCpf(customerData.cpf);
            if (customer) return customer;
        }

        // Not found, create new
        return await this.createCustomer(customerData);
    },

    async getCustomerByCpf(cpf: string) {
        if (!cpf) return null;
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('cpf', cpf)
            .maybeSingle();

        if (error) throw error;
        return data as Customer | null;
    }
};
