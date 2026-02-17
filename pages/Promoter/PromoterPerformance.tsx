import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { movementService, Movement } from '../../services/movementService';
import { commissionService, CommissionReportItem } from '../../services/commissionService';
import { Trophy, TrendingUp, Gauge, Users, Target } from 'lucide-react';

interface CommissionRecord {
    id: string;
    data: string;
    pdv: string;
    valorVenda: number;
    porcentagem: number;
    valorComissao: number;
    status: 'DISPONIVEL' | 'PENDENTE' | 'PAGO';
}

const PromoterPerformance: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<CommissionReportItem | null>(null);
    const [commissionHistory, setCommissionHistory] = useState<CommissionRecord[]>([]);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            const [report, sales] = await Promise.all([
                commissionService.getCommissionReport(currentMonth, currentYear),
                movementService.getPromoterSales(user.id)
            ]);

            const myStats = report.find(r => r.promoterId === user.id);
            setStats(myStats || null);

            // Map History
            const hist: CommissionRecord[] = sales.map(s => {
                const val = (s.quantidade * (s.produto?.preco || 0));
                return {
                    id: s.id.substring(0, 8).toUpperCase(),
                    data: new Date(s.created_at || '').toLocaleDateString('pt-BR'),
                    pdv: (s as any).pdv?.nome_fantasia || 'PDV Especial',
                    valorVenda: val,
                    porcentagem: (myStats?.baseRate || 0.01) * 100,
                    valorComissao: val * (myStats?.baseRate || 0.01),
                    status: 'PENDENTE'
                };
            });

            setCommissionHistory(hist);
        } catch (err) {
            console.error('Erro ao carregar performance', err);
        } finally {
            setLoading(false);
        }
    };

    const getLevelLabel = (level: string) => {
        switch (level) {
            case 'COORDENADOR': return 'Coordenador';
            case 'SENIOR': return 'Sênior';
            default: return 'Júnior';
        }
    };

    const totalMonthlyEarnings = (stats?.commissionGenerated || 0) + (stats?.overridingGenerated || 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <PageHeader
                title="Minha Performance & Comissões"
                description="Acompanhe suas metas de faturamento, giro médio e bônus de liderança."
                extra={<span className="text-xs font-bold text-gray-400 self-center hidden md:block italic">Dados baseados no fechamento do mês atual</span>}
            />

            {/* Global Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Faturamento Mensal" value={`R$ ${(stats?.monthlySales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="trending_up" className="!text-brand-dark" />
                <StatCard label="Minha Taxa Base" value={`${((stats?.baseRate || 0) * 100).toFixed(1)}%`} icon="stars" className="!text-primary font-black" />
                <StatCard label="Giro Médio Carteira" value={`${((stats?.averageTurnover || 0) * 100).toFixed(1)}%`} progress={(stats?.averageTurnover || 0) * 100} icon="speed" />
                <StatCard label="Total Previsto" value={`R$ ${totalMonthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" className="!bg-primary/5 border border-primary/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Level Details */}
                <Card className="lg:col-span-2" title="Evolução de Nível e Regras">
                    <div className="space-y-8 py-4">
                        <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div className="size-16 rounded-2xl bg-brand-dark flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-4xl">workspace_premium</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível Atual</p>
                                <p className="text-2xl font-black text-brand-dark uppercase tracking-tight">{getLevelLabel(stats?.level || 'JUNIOR')}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gatilho de Comissao</p>
                                <p className={`text-sm font-bold ${stats?.hasTrigger ? 'text-green-600' : 'text-amber-500'}`}>
                                    {stats?.hasTrigger ? 'ATIVADO ✅' : 'PENDENTE (Abaixo 50% de Giro)'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-2">
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider">Metas Júnior</p>
                                <p className="text-xs text-brand-dark font-bold">1% de comissão</p>
                                <p className="text-[10px] text-gray-400 leading-tight italic">Requer Giro Médio ≥ 50% para liberar pagamento.</p>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-2">
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider">Metas Sênior</p>
                                <p className="text-xs text-brand-dark font-bold">1.5% a 2.0%</p>
                                <p className="text-[10px] text-gray-400 leading-tight italic">1.5% base. Sobe para 2.0% se Giro Médio {'>'} 75%. Requer {'>'} 20 PDVs.</p>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-2">
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider">Coordenador</p>
                                <p className="text-xs text-brand-dark font-bold">1.0% + Overriding</p>
                                <p className="text-[10px] text-gray-400 leading-tight italic">Ganha 0.5% sobre o faturamento total da sua equipe de promotores.</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Turnover Gauge */}
                <Card title="Giro Médio (Performance)" className="bg-brand-dark text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <span className="material-symbols-outlined text-8xl">bolt</span>
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="text-center">
                            <p className="text-6xl font-black text-primary">
                                {((stats?.averageTurnover || 0) * 100).toFixed(0)}%
                            </p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">Média da Carteira</p>
                        </div>

                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                                <span>Progresso Meta 50%</span>
                                <span>{stats?.hasTrigger ? 'COMPLETA' : 'EM ANDAMENTO'}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${stats?.hasTrigger ? 'bg-primary' : 'bg-amber-400'}`}
                                    style={{ width: `${Math.min((stats?.averageTurnover || 0) * 200, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                            <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">
                                {stats?.hasTrigger
                                    ? "Parabéns! Sua comissão está liberada para o fechamento."
                                    : "Atenção: Aumente as vendas nos PDVs para atingir os 50% de giro mínimo."}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card padding="none" title="Extrato de Vendas (Base Atual)" className="overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ponto de Venda (PDV)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Venda</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sua Taxa</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {commissionHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-gray-400">
                                            <p className="text-xs font-black uppercase tracking-widest">Nenhuma venda registrada no período</p>
                                        </td>
                                    </tr>
                                ) : (
                                    commissionHistory.map((com) => (
                                        <tr key={com.id} className="hover:bg-gray-50/20 transition-colors uppercase">
                                            <td className="px-6 py-4">
                                                <div className="text-[11px] font-black text-brand-dark tracking-tighter">{com.id}</div>
                                                <div className="text-[9px] text-gray-400 font-bold">{com.data}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-black text-brand-dark tracking-tight">{com.pdv}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-black text-gray-600">R$ {com.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black text-primary">{com.porcentagem.toFixed(1)}%</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[9px] font-black text-brand-dark/40 bg-gray-100 px-2 py-1 rounded">PENDENTE</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default PromoterPerformance;
