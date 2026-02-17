import { supabase } from '../lib/supabase';
import { sanitizeUUID } from '../lib/validators';

export interface StockLevel {
    produto_id: string;
    sku: string;
    nome: string;
    categoria: string;
    qtd_central: number;
    qtd_em_campo: number;
    preco_custo: number;
    preco_venda: number;
}



export const inventoryService = {
    async getInventoryLevels() {
        // This is a complex query that aggregates stocks from central, promotores, and pdvs
        // For now, we fetch products and join with estoque_central, 
        // and we'll calculate field stock by summing promotor/pdv stock
        const { data: products, error: pError } = await supabase
            .from('produtos')
            .select(`
        id, sku, nome, categoria, preco, custo,
        estoque_central(quantidade),
        estoque_promotor(quantidade),
        estoque_pdv(quantidade)
      `);

        if (pError) throw pError;

        return (products as any[]).map(p => {
            // Support both array and object response from Supabase (1:1 joins can vary)
            const estoqueCentralData = p.estoque_central;
            const central = Array.isArray(estoqueCentralData)
                ? (estoqueCentralData[0]?.quantidade || 0)
                : (estoqueCentralData?.quantidade || 0);

            const promotorStock = (Array.isArray(p.estoque_promotor) ? p.estoque_promotor : [])
                .reduce((acc: number, item: any) => acc + (item?.quantidade || 0), 0);

            const pdvStock = (Array.isArray(p.estoque_pdv) ? p.estoque_pdv : [])
                .reduce((acc: number, item: any) => acc + (item?.quantidade || 0), 0);

            return {
                produto_id: p.id,
                sku: p.sku,
                nome: p.nome,
                categoria: p.categoria,
                qtd_central: central,
                qtd_em_campo: promotorStock + pdvStock,
                preco_custo: p.custo,
                preco_venda: p.preco
            } as StockLevel;
        });
    },

    async addStockToCentral(produto_id: string, quantidade: number, usuario_id: string) {
        // Trigger handle_stock_movement handles everything when confirmed_at is set
        const { error } = await supabase
            .from('movimentacoes_estoque')
            .insert([{
                produto_id,
                quantidade,
                destino_id: null,
                destino_tipo: 'CENTRAL',
                usuario_id: sanitizeUUID(usuario_id),
                tipo: 'AJUSTE',
                confirmed_at: new Date().toISOString() // Immediate
            }]);

        if (error) throw error;
    },

    async getPromoterInventoryValues() {
        // ... (stay same)
    },

    async transferToPromoter(produto_id: string, promotor_id: string, quantidade: number, usuario_id: string) {
        // Trigger handle_stock_movement will:
        // 1. Decrement CENTRAL (immediately on INSERT)
        // 2. Increment PROMOTOR (only when confirmed later)
        const { error } = await supabase
            .from('movimentacoes_estoque')
            .insert([{
                produto_id,
                quantidade,
                origem_tipo: 'CENTRAL',
                destino_tipo: 'PROMOTOR',
                destino_id: promotor_id,
                usuario_id: sanitizeUUID(usuario_id),
                tipo: 'TRANSFERENCIA',
                confirmed_at: null // Wait for promoter
            }]);

        if (error) throw error;
    },

    async getPromoterItems(promotorId: string) {
        const { data, error } = await supabase
            .from('estoque_promotor')
            .select(`
                produto_id,
                quantidade,
                produto:produtos (*)
            `)
            .eq('promotor_id', promotorId);

        if (error) throw error;

        return data.map((item: any) => ({
            id: item.produto_id,
            sku: item.produto.sku,
            nome: item.produto.nome,
            categoria: item.produto.categoria,
            quantidade: item.quantidade,
            preco: item.produto.preco,
            imagemUrl: item.produto.imagem_url,
            // Simple status logic
            status: item.quantidade < 5 ? 'ABAIXO_ALERTA' : 'EM_ESTOQUE'
        }));
    },

    async getPDVItems(pdvId: string) {
        const { data, error } = await supabase
            .from('estoque_pdv')
            .select(`
                produto_id,
                quantidade,
                produto:produtos (*)
            `)
            .eq('pdv_id', pdvId);

        if (error) throw error;

        return data.map((item: any) => ({
            id: item.produto_id,
            sku: item.produto.sku,
            nome: item.produto.nome,
            categoria: item.produto.categoria,
            quantidade: item.quantidade,
            preco: item.produto.preco,
            imagemUrl: item.produto.imagem_url,
            status: item.quantidade < 3 ? 'ABAIXO_ALERTA' : 'EM_ESTOQUE'
        }));
    },

    async updatePDVStock(pdvId: string, updates: { produto_id: string, quantidade: number }[]) {
        const { error } = await supabase
            .from('estoque_pdv')
            .upsert(
                updates.map(u => ({
                    pdv_id: pdvId,
                    produto_id: u.produto_id,
                    quantidade: u.quantidade,
                    updated_at: new Date().toISOString()
                }))
            );
        if (error) throw error;
    }
};
