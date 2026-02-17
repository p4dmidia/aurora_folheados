import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { customerService } from './customerService';

interface SaleItemInput {
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
}

interface CreateSaleInput {
    pdv_id: string;
    cliente_id?: string;
    cliente_dados?: {
        nome: string;
        whatsapp?: string;
        cpf?: string;
    };
    valor_total: number;
    tipo_pagamento: 'PIX' | 'CARD' | 'CASH' | 'CREDIARIO';
    itens: SaleItemInput[];
    parceiro_id: string; // The user recording the sale
}

export const saleService = {
    async createSale(input: CreateSaleInput) {
        let finalClienteId = input.cliente_id;

        // If no ID but data is provided, try to find or create
        if (!finalClienteId && input.cliente_dados?.nome) {
            const customer = await customerService.findOrCreateCustomer({
                ...input.cliente_dados,
                pdv_origem: input.pdv_id
            });
            if (customer) {
                finalClienteId = customer.id;
            }
        }

        // 1. Create Sale Record
        const { data: sale, error: saleError } = await supabase
            .from('vendas')
            .insert([{
                pdv_id: input.pdv_id,
                cliente_id: finalClienteId,
                valor_total: input.valor_total,
                tipo_pagamento: input.tipo_pagamento,
                status: input.tipo_pagamento === 'CASH' ? 'CONCLUIDA' : 'PENDENTE',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (saleError) throw saleError;

        // 2. Create Sale Items
        const itemsToInsert = input.itens.map(item => ({
            venda_id: sale.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario
        }));

        const { error: itemsError } = await supabase
            .from('venda_itens')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // 3. Log Movements (Trigger handles stock decrement on INSERT since confirmed_at is set)
        await Promise.all(input.itens.map(async (item) => {
            await supabase.from('movimentacoes_estoque').insert([{
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                origem_tipo: 'PDV',
                origem_id: input.pdv_id,
                destino_tipo: 'VENDA',
                destino_id: sale.id,
                usuario_id: input.parceiro_id,
                tipo: 'VENDA',
                confirmed_at: new Date().toISOString() // Immediate sale
            }]);
        }));

        return sale;
    },

    async getSalesByPDV(pdvId: string) {
        const { data, error } = await supabase
            .from('vendas')
            .select(`
                *,
                cliente:clientes(*),
                parcelas:parcelas_crediario(*)
            `)
            .eq('pdv_id', pdvId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getOverdueInstallments(pdvId: string) {
        const { data, error } = await supabase
            .from('parcelas_crediario')
            .select(`
                *,
                venda:vendas!inner (
                    pdv_id,
                    cliente:clientes(*)
                )
            `)
            .eq('venda.pdv_id', pdvId)
            .eq('status', 'ATRASADO')
            .order('vencimento', { ascending: true });

        if (error) throw error;
        return data;
    },

    async getSaleItems(saleId: string) {
        const { data, error } = await supabase
            .from('venda_itens')
            .select(`
                *,
                produto:produtos(*)
            `)
            .eq('venda_id', saleId);

        if (error) throw error;
        return data;
    }
};
