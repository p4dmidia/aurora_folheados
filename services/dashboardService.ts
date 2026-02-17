import { supabase } from '../lib/supabase';

export interface DashboardStats {
    totalSales: number;
    activePDVs: number;
    totalNetworkRevenue: number;
    overdueAmount: number;
}

export const dashboardService = {
    async getAdminStats() {
        // 1. Total Sales (Count and Sum from 'vendas')
        const { data: salesData, error: sError } = await supabase
            .from('vendas')
            .select('valor_total');

        if (sError) throw sError;
        const totalRevenue = salesData.reduce((acc, s) => acc + Number(s.valor_total), 0);
        const saleCount = salesData.length;

        // 2. Active PDVs
        const { count: pdvCount, error: pError } = await supabase
            .from('pdvs')
            .select('*', { count: 'exact', head: true });

        if (pError) throw pError;

        // 3. Overdue Amount (from 'parcelas_crediario')
        const { data: overdueData, error: oError } = await supabase
            .from('parcelas_crediario')
            .select('valor')
            .eq('status', 'ATRASADO');

        if (oError) throw oError;
        const overdueTotal = overdueData.reduce((acc, p) => acc + Number(p.valor), 0);

        return {
            totalSales: saleCount,
            activePDVs: pdvCount || 0,
            totalNetworkRevenue: totalRevenue,
            overdueAmount: overdueTotal
        } as DashboardStats;
    },

    async getRecentActivity() {
        // Combine recent movements and sales
        const [movements, sales] = await Promise.all([
            supabase.from('movimentacoes_estoque').select('*, produto:produtos(nome)').order('created_at', { ascending: false }).limit(5),
            supabase.from('vendas').select('*, pdv:pdvs(nome_fantasia)').order('created_at', { ascending: false }).limit(5)
        ]);

        return {
            movements: movements.data || [],
            sales: sales.data || []
        };
    }
};
