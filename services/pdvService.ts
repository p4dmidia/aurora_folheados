import { supabase } from '../lib/supabase';
import { sanitizeUUID } from '../lib/validators';

export interface PDV {
    id: string;
    nome_fantasia: string;
    tipo_pessoa?: 'FISICA' | 'JURIDICA';
    documento?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    promotor_id?: string;
    parceiro_id?: string;
    created_at?: string;
    // Join fields
    promotor?: {
        nome: string;
    };
}

export const pdvService = {
    async getPDVs() {
        const { data, error } = await supabase
            .from('pdvs')
            .select(`
        *,
        promotor:usuarios!pdvs_promotor_id_fkey(nome)
      `)
            .order('nome_fantasia', { ascending: true });

        if (error) throw error;
        return data as PDV[];
    },

    async createPDV(pdv: Omit<PDV, 'id' | 'created_at' | 'promotor'>) {
        const sanitizedPDV = {
            ...pdv,
            promotor_id: sanitizeUUID(pdv.promotor_id),
            parceiro_id: sanitizeUUID(pdv.parceiro_id)
        };

        const { data, error } = await supabase
            .from('pdvs')
            .insert([sanitizedPDV])
            .select();

        if (error) throw error;
        return data[0] as PDV;
    },

    async updatePDV(id: string, updates: Partial<PDV>) {
        // Remove join fields before update
        const { promotor, ...cleanUpdates } = updates;

        if ('promotor_id' in cleanUpdates) {
            cleanUpdates.promotor_id = sanitizeUUID(cleanUpdates.promotor_id) as any;
        }
        if ('parceiro_id' in cleanUpdates) {
            cleanUpdates.parceiro_id = sanitizeUUID(cleanUpdates.parceiro_id) as any;
        }

        const { data, error } = await supabase
            .from('pdvs')
            .update(cleanUpdates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0] as PDV;
    },

    async deletePDV(id: string) {
        const { error } = await supabase
            .from('pdvs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getPDVStats() {
        const [salesRes, defaultRes] = await Promise.all([
            supabase.from('vendas').select('valor_total'),
            supabase.from('parcelas_crediario').select('valor').eq('status', 'ATRASADO')
        ]);

        if (salesRes.error) throw salesRes.error;
        if (defaultRes.error) throw defaultRes.error;

        const totalRevenue = salesRes.data.reduce((acc, curr) => acc + Number(curr.valor_total), 0);
        const totalDefault = defaultRes.data.reduce((acc, curr) => acc + Number(curr.valor), 0);

        return {
            totalRevenue,
            totalDefault
        };
    },

    async getPromoterPDVs(promotorId: string) {
        // 1. Fetch PDVs assigned to promoter with Partner details
        const { data: pdvs, error } = await supabase
            .from('pdvs')
            .select(`
                *,
                parceiro:usuarios!pdvs_parceiro_id_fkey(nome, whatsapp)
            `)
            .eq('promotor_id', promotorId);

        if (error) throw error;

        // 2. Enrich with stats (Stock Value, Monthly Sales)
        // This acts like a "View" logic
        const enrichedPDVs = await Promise.all(pdvs.map(async (pdv) => {
            // A. Stock Value
            const { data: stockItems } = await supabase
                .from('estoque_pdv')
                .select('quantidade, produto:produtos(preco)')
                .eq('pdv_id', pdv.id);

            const estoqueValor = (stockItems || []).reduce((acc: number, item: any) =>
                acc + (item.quantidade * (item.produto?.preco || 0)), 0);

            // B. Monthly Sales (Current Month)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: sales } = await supabase
                .from('vendas')
                .select('valor_total')
                .eq('pdv_id', pdv.id)
                .gte('created_at', startOfMonth.toISOString());

            const vendasMensais = (sales || []).reduce((acc: number, sale: any) =>
                acc + Number(sale.valor_total), 0);

            return {
                ...pdv,
                estoque_valor: estoqueValor,
                vendas_mensais: vendasMensais,
                // Heuristics for status
                status_financeiro: 'EM_DIA', // Placeholder logic 
                status_estoque: estoqueValor < 2000 ? 'BAIXO' : 'NORMAL'
            };
        }));

        return enrichedPDVs;
    },

    async getPDVByPartnerId(parceiroId: string) {
        const { data, error } = await supabase
            .from('pdvs')
            .select('*')
            .eq('parceiro_id', parceiroId)
            .single();

        if (error) throw error;
        return data as PDV;
    },

    async getPDVDashboardStats(pdvId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Today's Sales
        const { data: sales, error: sError } = await supabase
            .from('vendas')
            .select('id, valor_total, created_at')
            .eq('pdv_id', pdvId)
            .gte('created_at', today.toISOString());

        if (sError) throw sError;

        const todaySalesValue = sales.reduce((acc, sale) => acc + Number(sale.valor_total), 0);
        const todaySalesCount = sales.length;

        // 2. Cycle Pieces Sold (Total for the month/cycle)
        // We need to sum quantities from venda_itens for all sales in this cycle
        const { data: cycleSales, error: csError } = await supabase
            .from('vendas')
            .select('id')
            .eq('pdv_id', pdvId)
            .gte('created_at', startOfMonth.toISOString());

        if (csError) throw csError;

        let piecesSoldInCycle = 0;
        if (cycleSales.length > 0) {
            const { data: items, error: iError } = await supabase
                .from('venda_itens')
                .select('quantidade')
                .in('venda_id', cycleSales.map(s => s.id));

            if (iError) throw iError;
            piecesSoldInCycle = (items || []).reduce((acc, item) => acc + (item.quantidade || 0), 0);
        }

        // 3. Stock Level
        const { data: stockItems, error: stError } = await supabase
            .from('estoque_pdv')
            .select('quantidade')
            .eq('pdv_id', pdvId);

        if (stError) throw stError;
        const piecesInStock = stockItems.reduce((acc, item) => acc + (item.quantidade || 0), 0);

        // 4. Dynamic Commission Rate
        const TOTAL_KIT_PIECES = 72;
        const percentageSold = piecesSoldInCycle / TOTAL_KIT_PIECES;
        let commissionRate = 0.30;
        if (percentageSold >= 0.90) commissionRate = 0.40;
        else if (percentageSold >= 0.70) commissionRate = 0.35;

        return {
            todaySalesValue,
            todaySalesCount,
            piecesInStock,
            piecesSoldInCycle,
            commissionRate
        };
    },

    async getDailySalesTrend(pdvId: string, days: number = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('vendas')
            .select('valor_total, created_at')
            .eq('pdv_id', pdvId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map data to daily buckets
        const trend = Array.from({ length: days }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
            return {
                date: d.toISOString().split('T')[0],
                label: label.charAt(0).toUpperCase() + label.slice(1),
                value: 0
            };
        });

        data.forEach(sale => {
            const dateStr = sale.created_at.split('T')[0];
            const bucket = trend.find(b => b.date === dateStr);
            if (bucket) {
                bucket.value += Number(sale.valor_total);
            }
        });

        return trend;
    }
};
