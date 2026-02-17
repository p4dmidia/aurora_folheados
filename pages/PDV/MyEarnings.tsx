import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { saleService } from '../../services/saleService';
import { pdvService } from '../../services/pdvService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MyEarnings: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalBalance: 0,
        totalMonth: 0,
        piecesSold: 0,
        commissionRate: 0.30
    });

    const TOTAL_KIT_PIECES = 72;

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const pdv = await pdvService.getPDVByPartnerId(user.id);
            if (!pdv) return;

            const sales = await saleService.getSalesByPDV(pdv.id);

            // Calculate pieces sold this month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            // To be precise, we need to sum quantities. Let's fetch items for these sales.
            // For now, let's assume one sale maps to some pieces. 
            // Better: Let's calculate from sales if possible or fetch items.
            // Since we need it for goals, let's fetch items for all sales of this PDV.
            const allItems: any[] = [];
            await Promise.all((sales || []).map(async (s: any) => {
                const items = await saleService.getSaleItems(s.id);
                if (items) allItems.push(...items);
            }));

            const piecesSold = allItems.reduce((acc, item) => acc + item.quantidade, 0);

            // Determine dynamic commission rate
            let currentRate = 0.30;
            const percentageSold = (piecesSold / TOTAL_KIT_PIECES);

            if (percentageSold >= 0.90) currentRate = 0.40;
            else if (percentageSold >= 0.70) currentRate = 0.35;

            const mappedTransactions = (sales || []).map((s: any) => ({
                id: s.id,
                date: format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                value: Number(s.valor_total),
                commission: Number(s.valor_total) * currentRate,
                method: s.tipo_pagamento === 'CARD' ? 'CARTÃO' : s.tipo_pagamento === 'CASH' ? 'DINHEIRO' : s.tipo_pagamento,
                status: s.tipo_pagamento === 'CREDIARIO' ? 'RETIDO (30%)' : 'DISPONÍVEL',
                note: s.tipo_pagamento === 'CREDIARIO' ? 'Entrada retida como comissão' : undefined
            }));

            setTransactions(mappedTransactions);

            // Stats
            const thisMonthSales = mappedTransactions.filter(t => {
                const sDate = new Date(t.date.split(' ')[0].split('/').reverse().join('-'));
                return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
            });

            setStats({
                totalBalance: mappedTransactions.reduce((acc, t) => acc + t.commission, 0),
                totalMonth: thisMonthSales.reduce((acc, t) => acc + t.commission, 0),
                piecesSold,
                commissionRate: currentRate
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando ganhos...</div>;
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <PageHeader
                title="Meus Ganhos"
                description="Acompanhe suas vendas e o saldo de comissões acumuladas."
                actions={
                    <Button variant="secondary" icon="download" size="sm">Exportar Extrato</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Saldo em Carteira"
                    value={`R$ ${stats.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="account_balance_wallet"
                    className="!text-primary"
                />
                <StatCard
                    label="Ganhos do Mês"
                    value={`R$ ${stats.totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="trending_up"
                />
                <StatCard
                    label="Volume Vendido"
                    value={`${stats.piecesSold} Peças`}
                    subtitle={`Meta: ${TOTAL_KIT_PIECES} peças`}
                    progress={(stats.piecesSold / TOTAL_KIT_PIECES) * 100}
                    icon="inventory"
                />
                <StatCard
                    label="Sua Comissão Atual"
                    value={`${(stats.commissionRate * 100).toFixed(0)}%`}
                    subtitle={stats.commissionRate > 0.30 ? "Bônus por desempenho ativo!" : "Venda mais para aumentar"}
                    icon="stars"
                    className={stats.commissionRate > 0.30 ? "!text-emerald-600" : ""}
                    trend={stats.commissionRate > 0.30 ? { value: `+${((stats.commissionRate - 0.30) * 100).toFixed(0)}%`, type: 'up' } : undefined}
                />
            </div>

            <Card padding="none" className="rounded-3xl lg:col-span-2">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-brand-dark">Histórico de Transações</h3>
                    <StatusBadge label="TOTAL HISTÓRICO" variant="info" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-8 py-4">Data / Hora</th>
                                <th className="px-8 py-4">Valor Venda</th>
                                <th className="px-8 py-4">Sua Comissão ({(stats.commissionRate * 100).toFixed(0)}%)</th>
                                <th className="px-8 py-4 text-center">Forma</th>
                                <th className="px-8 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">{t.date}</td>
                                    <td className="px-8 py-5 font-bold text-gray-400">R$ {t.value.toFixed(2)}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-brand-dark text-lg">R$ {t.commission.toFixed(2)}</span>
                                            {t.note && <span className="text-[10px] text-primary font-bold uppercase">{t.note}</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-[10px] font-black text-gray-400 border border-gray-200 px-2 py-1 rounded uppercase">
                                            {t.method}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <StatusBadge
                                            label={t.status}
                                            variant={t.status.includes('RETIDO') ? 'warning' : 'success'}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 text-sm italic">
                                        Você ainda não possui vendas registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card padding="large" className="!bg-brand-dark !text-white border-none shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-symbols-outlined text-8xl">military_tech</span>
                    </div>
                    <div className="flex items-start gap-4 h-full">
                        <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-brand-dark shrink-0">
                            <span className="material-symbols-outlined font-bold">trending_up</span>
                        </div>
                        <div className="space-y-4 flex-1">
                            <h4 className="text-xl font-bold">Acelere seus Ganhos! 🚀</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-primary uppercase">Meta 70%</p>
                                    <p className="text-lg font-black">{Math.ceil(TOTAL_KIT_PIECES * 0.7)} Peças</p>
                                    <p className="text-[10px] text-white/50">Comissão sobe para 35%</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Meta 90%</p>
                                    <p className="text-lg font-black">{Math.ceil(TOTAL_KIT_PIECES * 0.9)} Peças</p>
                                    <p className="text-[10px] text-white/50">Comissão sobe para 40%</p>
                                </div>
                            </div>
                            <p className="text-xs text-white/50 leading-relaxed italic">
                                * Considerado apenas brincos para este ciclo. O kit atual possui {TOTAL_KIT_PIECES} peças.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card padding="large" className="flex flex-col justify-center border-dashed border-2 border-primary/20 bg-primary/5">
                    <div className="text-center space-y-2">
                        <span className="material-symbols-outlined text-primary text-4xl">savings</span>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Controle Financeiro</p>
                        <h4 className="text-2xl font-black text-brand-dark">Ganhos sincronizados em tempo real</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Baseado em suas vendas confirmadas</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default MyEarnings;
