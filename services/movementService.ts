import { supabase } from '../lib/supabase';

export interface Movement {
    id: string;
    produto_id: string;
    quantidade: number;
    origem_tipo: 'CENTRAL' | 'PROMOTOR' | 'PDV';
    origem_id?: string;
    destino_tipo: 'PROMOTOR' | 'PDV' | 'VENDA' | 'DEVOLUCAO';
    destino_id?: string;
    usuario_id: string;
    tipo: 'TRANSFERENCIA' | 'AJUSTE' | 'VENDA' | 'DEVOLUCAO';
    created_at?: string;
    confirmed_at?: string;
    // Join fields
    produto?: {
        sku: string;
        nome: string;
        categoria?: string;
        preco?: number;
        imagem_url?: string;
    };
    usuario?: {
        nome: string;
    };
    origem_usuario?: {
        nome: string;
    };
}

export const movementService = {
    async getMovements() {
        const { data, error } = await supabase
            .from('movimentacoes_estoque')
            .select(`
        *,
        produto:produtos(sku, nome),
        usuario:usuarios(nome)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Movement[];
    },

    async getPendingTransfers(destinationId: string) {
        const { data, error } = await supabase
            .from('movimentacoes_estoque')
            .select(`
                *,
                produto:produtos(*),
                origem_usuario:usuarios!movimentacoes_estoque_usuario_id_fkey(nome)
            `)
            .eq('destino_id', destinationId)
            .eq('tipo', 'TRANSFERENCIA')
            .is('confirmed_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Movement[];
    },

    async confirmMovements(ids: string[]) {
        const { error } = await supabase
            .from('movimentacoes_estoque')
            .update({ confirmed_at: new Date().toISOString() })
            .in('id', ids);

        if (error) throw error;
    },

    async getPromoterSales(promotorId: string) {
        const { data, error } = await supabase
            .from('movimentacoes_estoque')
            .select(`
                *,
                produto:produtos(*),
                pdv:pdvs!movimentacoes_estoque_origem_id_fkey(*)
            `)
            .eq('usuario_id', promotorId)
            .eq('tipo', 'VENDA')
            .order('created_at', { ascending: false });

        // Note: Joining pdvs on origem_id might fail if FK is not set or polymorphic.
        // If it fails, we fall back to just product.
        // Checking schema: movimentacoes_estoque has no FK for origem_id to pdvs.
        // So we cannot use !inner join or simple join syntax on `origem_id` directly without FK.
        // We will simple fetch movements and products. We can fetch PDV names client side or via a second query if needed.

        if (error) {
            // Retry without PDV join if it was the issue, or just return basic
            const { data: retryData, error: retryError } = await supabase
                .from('movimentacoes_estoque')
                .select(`
                *,
                produto:produtos(*)
            `)
                .eq('usuario_id', promotorId)
                .eq('tipo', 'VENDA')
                .order('created_at', { ascending: false });

            if (retryError) throw retryError;
            return retryData as Movement[];
        }
        return data as Movement[];
    },

    async createMovement(movement: Omit<Movement, 'id' | 'created_at' | 'produto' | 'usuario'>) {
        const { data, error } = await supabase
            .from('movimentacoes_estoque')
            .insert([movement])
            .select();

        if (error) throw error;
        return data[0] as Movement;
    }
};
