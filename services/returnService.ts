import { supabase } from '../lib/supabase';

export const returnService = {
    async getReturnsByPDV(pdvId: string) {
        const { data, error } = await supabase
            .from('devolucoes')
            .select(`
                *,
                cliente:clientes(*),
                produto:produtos(*)
            `)
            .eq('pdv_id', pdvId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createReturn(returnObj: {
        pdv_id: string;
        cliente_id?: string;
        produto_id: string;
        quantidade: number;
        motivo: string;
        valor_credito: number;
        status: string;
        observacoes?: string;
    }) {
        const { data, error } = await supabase
            .from('devolucoes')
            .insert([returnObj])
            .select();

        if (error) throw error;
        return data?.[0];
    }
};
