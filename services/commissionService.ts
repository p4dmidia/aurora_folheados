import { supabase } from '../lib/supabase';
import { User } from '../types';

export interface CommissionReportItem {
    promoterId: string;
    promoterName: string;
    level: 'JUNIOR' | 'SENIOR' | 'COORDENADOR';
    monthlySales: number;
    teamSales: number;
    activePDVs: number;
    averageTurnover: number;
    commissionGenerated: number;
    overridingGenerated: number;
    baseRate: number;
    hasTrigger: boolean;
    status: 'PENDENTE' | 'PAGO';
}

export const commissionService = {
    KIT_SIZE: 72,

    async getCommissionReport(mes: number, ano: number) {
        const startDate = new Date(ano, mes - 1, 1).toISOString();
        const endDate = new Date(ano, mes, 0, 23, 59, 59).toISOString();

        // 1. Get all promoters with their levels and superior
        const { data: promoters, error: pError } = await supabase
            .from('usuarios')
            .select('id, nome, nivel_promotor, superior_id')
            .eq('role', 'PROMOTOR');

        if (pError) throw pError;

        // 2. Get all PDVs to count portfolio size and link sales
        const { data: pdvs, error: pdvError } = await supabase
            .from('pdvs')
            .select('id, promotor_id');

        if (pdvError) throw pdvError;

        // 3. Get all sales for this month
        const { data: sales, error: sError } = await supabase
            .from('vendas')
            .select(`
                id,
                valor_total,
                pdv_id
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (sError) throw sError;

        // 4. Get items sold (for Turnover calculation)
        const { data: items, error: iError } = await supabase
            .from('venda_itens')
            .select('quantidade, venda_id')
            .in('venda_id', sales.map(s => s.id));

        if (iError) throw iError;

        // 5. Get payment status
        const { data: payments, error: payError } = await supabase
            .from('pagamentos_comissoes')
            .select('*')
            .eq('mes_referencia', mes)
            .eq('ano_referencia', ano);

        if (payError) throw payError;

        // 6. Aggregate and calculate
        const report: CommissionReportItem[] = promoters.map(promoter => {
            const promoterPDVs = pdvs.filter(p => p.promotor_id === promoter.id);
            const pdvIds = promoterPDVs.map(p => p.id);

            // Sales of his own portfolio
            const ownSales = sales.filter(s => pdvIds.includes(s.pdv_id));
            const monthlySalesValue = ownSales.reduce((acc, curr) => acc + Number(curr.valor_total), 0);

            // Pieces sold (for turnover)
            const saleIds = ownSales.map(s => s.id);
            const piecesSold = items
                .filter(it => saleIds.includes(it.venda_id))
                .reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

            // Turnover: Pieces Sold / (PDVs * 72)
            const averageTurnover = pdvIds.length > 0
                ? (piecesSold / (pdvIds.length * this.KIT_SIZE))
                : 0;

            // Team Sales (Overriding for Coordinators)
            let teamSalesValue = 0;
            if (promoter.nivel_promotor === 'COORDENADOR') {
                const subPromoters = promoters.filter(p => p.superior_id === promoter.id);
                const subPromoterIds = subPromoters.map(p => p.id);
                const subPDVIds = pdvs.filter(p => subPromoterIds.includes(p.promotor_id)).map(p => p.id);
                const teamSales = sales.filter(s => subPDVIds.includes(s.pdv_id));
                teamSalesValue = teamSales.reduce((acc, curr) => acc + Number(curr.valor_total), 0);
            }

            // Calculation Logic based on Level
            let commissionGenerated = 0;
            let overridingGenerated = 0;
            let baseRate = 0;
            let hasTrigger = true;

            const level = (promoter.nivel_promotor || 'JUNIOR') as 'JUNIOR' | 'SENIOR' | 'COORDENADOR';

            if (level === 'JUNIOR') {
                baseRate = 0.01;
                hasTrigger = averageTurnover >= 0.50;
                if (hasTrigger) commissionGenerated = monthlySalesValue * baseRate;
            }
            else if (level === 'SENIOR') {
                // Base 1.5%. Bonus +0.5% (Total 2%) if turnover > 75%
                baseRate = averageTurnover > 0.75 ? 0.02 : 0.015;
                commissionGenerated = monthlySalesValue * baseRate;
            }
            else if (level === 'COORDENADOR') {
                baseRate = 0.01;
                commissionGenerated = monthlySalesValue * baseRate;
                overridingGenerated = teamSalesValue * 0.005; // 0.5% overriding
            }

            const paymentRecord = payments.find(p => p.promotor_id === promoter.id);

            return {
                promoterId: promoter.id,
                promoterName: promoter.nome,
                level: level,
                monthlySales: monthlySalesValue,
                teamSales: teamSalesValue,
                activePDVs: pdvIds.length,
                averageTurnover,
                commissionGenerated,
                overridingGenerated,
                baseRate,
                hasTrigger,
                status: paymentRecord?.status || 'PENDENTE'
            };
        });

        return report;
    },

    async authorizePayment(promoterId: string, mes: number, ano: number, valor: number) {
        const { data, error } = await supabase
            .from('pagamentos_comissoes')
            .upsert({
                promotor_id: promoterId,
                mes_referencia: mes,
                ano_referencia: ano,
                status: 'PAGO',
                valor_pago: valor
            }, { onConflict: 'promotor_id,mes_referencia,ano_referencia' })
            .select();

        if (error) throw error;
        return data[0];
    }
};
