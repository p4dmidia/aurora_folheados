import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { User, PDV } from '../../types';
import { commissionService, CommissionReportItem } from '../../services/commissionService';
import { pdvService } from '../../services/pdvService';
import { inventoryService } from '../../services/inventoryService';

interface EnhancedPromoterStats extends CommissionReportItem {
    pdvsCount: number;
    inventoryValue: number;
}

const PromoterPerformanceAdmin: React.FC<{ user: User }> = ({ user }) => {
    const [promotersData, setPromotersData] = useState<EnhancedPromoterStats[]>([]);
    const [loading, setLoading] = useState(true);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [report, allPdvs, invValues] = await Promise.all([
                commissionService.getCommissionReport(currentMonth, currentYear),
                pdvService.getPDVs(),
                inventoryService.getPromoterInventoryValues()
            ]);

            const enhanced: EnhancedPromoterStats[] = report.map(r => ({
                ...r,
                pdvsCount: allPdvs.filter(p => p.promotor_id === r.promoterId).length,
                inventoryValue: invValues[r.promoterId] || 0
            }));

            setPromotersData(enhanced);
        } catch (error) {
            console.error('Erro ao carregar performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTier = (rev: number) => {
        if (rev >= 100000) return { label: 'DIAMOND', percent: 4, color: 'text-primary' };
        if (rev >= 80000) return { label: 'GOLD', percent: 3, color: 'text-amber-500' };
        if (rev >= 60000) return { label: 'SILVER', percent: 2.5, color: 'text-slate-400' };
        return { label: 'BRONZE', percent: 2, color: 'text-amber-700' };
    };

    const calculateBonus = (rev: number) => {
        if (rev < 100000) return 0;
        return Math.floor((rev - 100000) / 10000) * 500;
    };

    const handleAuthorize = async (p: EnhancedPromoterStats) => {
        try {
            setLoading(true);
            await commissionService.authorizePayment(p.promoterId, currentMonth, currentYear, p.commissionGenerated);
            await loadData();
        } catch (error: any) {
            alert('Erro ao autorizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalTeamRevenue = promotersData.reduce((acc, p) => acc + p.monthlySales, 0);
    const totalBonuses = promotersData.reduce((acc, p) => acc + calculateBonus(p.monthlySales), 0);
    const totalPdvCount = promotersData.reduce((acc, p) => acc + p.pdvsCount, 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Performance da Equipe"
                description="Monitore metas, comissões e bônus de todos os promotores em tempo real (Mês Atual)."
                extra={
                    <Button variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Faturamento Equipe" value={totalTeamRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} icon="groups" className="!text-brand-dark" />
                <StatCard label="Total em Bônus (Previsão)" value={totalBonuses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} icon="redeem" className="!text-green-600" />
                <StatCard label="Ticket Médio / Promotor" value={(promotersData.length > 0 ? totalTeamRevenue / promotersData.length : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} icon="assessment" />
                <StatCard label="Lojas Atendidas" value={totalPdvCount.toString()} icon="storefront" className="!text-primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                    </div>
                )}

                {/* Main List */}
                <Card className="lg:col-span-2" padding="none" title="Ranking de Performance">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 uppercase tracking-widest text-[10px]">
                                    <th className="px-6 py-4 font-black text-gray-400">Promotor</th>
                                    <th className="px-6 py-4 font-black text-gray-400 text-center">Nível</th>
                                    <th className="px-6 py-4 font-black text-gray-400">Faturamento</th>
                                    <th className="px-6 py-4 font-black text-gray-400">Bônus</th>
                                    <th className="px-6 py-4 font-black text-gray-400 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase tracking-tighter">
                                {promotersData.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase">Nenhum promotor encontrado</td>
                                    </tr>
                                )}
                                {promotersData.sort((a, b) => b.monthlySales - a.monthlySales).map((p, idx) => {
                                    const pTier = getTier(p.monthlySales);
                                    const pBonus = calculateBonus(p.monthlySales);
                                    return (
                                        <tr key={p.promoterId} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-gray-300 w-4">#{idx + 1}</span>
                                                    <div>
                                                        <p className="text-sm font-black text-brand-dark uppercase tracking-tight">{p.promoterName}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{p.pdvsCount} PDVs Ativos</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${pTier.color}`}>
                                                    {pTier.label} ({pTier.percent}%)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-brand-dark">R$ {p.monthlySales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`text-sm font-black ${pBonus > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                                                    {pBonus > 0 ? `+ R$ ${pBonus}` : '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {p.status === 'PENDENTE' && pBonus > 0 && (
                                                    <Button variant="primary" size="sm" className="!text-[9px] !py-1" onClick={() => handleAuthorize(p)}>Aprovar Bônus</Button>
                                                )}
                                                {p.status === 'PAGO' && pBonus > 0 && (
                                                    <span className="text-[9px] font-black text-green-500 uppercase">Pago</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Bonus & Alerts */}
                <div className="space-y-6">
                    <Card title="Aprovação de Super Bônus" className="bg-primary/5 border-primary/20">
                        <div className="space-y-4">
                            {promotersData.filter(p => calculateBonus(p.monthlySales) > 0 && p.status === 'PENDENTE').map(p => (
                                <div key={p.promoterId} className="p-4 bg-white rounded-2xl border border-primary/10 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="text-xs font-black text-brand-dark uppercase">{p.promoterName}</p>
                                        <p className="text-[10px] text-primary font-bold">Bônus: R$ {calculateBonus(p.monthlySales)}</p>
                                    </div>
                                    <Button size="sm" variant="primary" className="!text-[10px] !py-1" onClick={() => handleAuthorize(p)}>Aprovar</Button>
                                </div>
                            ))}
                            {promotersData.filter(p => calculateBonus(p.monthlySales) > 0 && p.status === 'PENDENTE').length === 0 && (
                                <p className="text-center text-xs text-gray-400 py-4 italic">Nenhum bônus pendente.</p>
                            )}
                        </div>
                    </Card>

                    <Card title="Saúde dos Briefcases" description="Status do estoque fixo com os promotores.">
                        <div className="space-y-4">
                            {promotersData.map(p => (
                                <div key={p.promoterId} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.promoterName}</span>
                                        <span className="text-[11px] font-bold text-brand-dark">R$ {p.inventoryValue.toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${p.inventoryValue > 40000 ? 'bg-primary' : 'bg-amber-400'}`}
                                            style={{ width: `${Math.min((p.inventoryValue / 50000) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PromoterPerformanceAdmin;
