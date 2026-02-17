import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { Link } from 'react-router-dom';
import { pdvService } from '../../services/pdvService';

interface PDV {
    id: string;
    nome: string;
    contato: string;
    whatsapp: string;
    ultimaVisita: string;
    proximaVisita: string;
    estoqueValor: number;
    vendasMensais: number;
    statusFinanceiro: 'EM_DIA' | 'EM_ATRASO' | 'ALERTA';
    statusEstoque: 'NORMAL' | 'BAIXO' | 'CRITICO';
}

const PDVManagement: React.FC<{ user: User }> = ({ user }) => {
    const [filter, setFilter] = useState('TODOS');
    const [loading, setLoading] = useState(true);
    const [pdvs, setPdvs] = useState<PDV[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await pdvService.getPromoterPDVs(user.id);

            // Map service data to UI model
            const mapped: PDV[] = data.map((item: any) => ({
                id: item.id,
                nome: item.nome_fantasia,
                contato: item.parceiro?.nome || 'N/A',
                whatsapp: item.parceiro?.whatsapp || '',
                // Simulation for dates (not yet in DB schema)
                ultimaVisita: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
                proximaVisita: new Date(Date.now() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
                estoqueValor: item.estoque_valor || 0,
                vendasMensais: item.vendas_mensais || 0,
                statusFinanceiro: item.status_financeiro || 'EM_DIA',
                statusEstoque: item.status_estoque || 'NORMAL'
            }));

            setPdvs(mapped);
        } catch (err) {
            console.error('Erro ao carregar PDVs:', err);
            // alert('Erro ao carregar PDVs'); // Suppressed for better UX on empty states
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.id]);

    const getFilteredPDVs = () => {
        let filtered = pdvs;

        // Text Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.nome.toLowerCase().includes(lower) ||
                p.contato.toLowerCase().includes(lower)
            );
        }

        // Tab Filter
        if (filter === 'TODOS') return filtered;
        if (filter === 'ATRASO') return filtered.filter(p => p.statusFinanceiro === 'EM_ATRASO');
        if (filter === 'ESTOQUE_BAIXO') return filtered.filter(p => p.statusEstoque !== 'NORMAL');

        return filtered;
    };

    const openWhatsApp = (phone: string, name: string) => {
        if (!phone) {
            alert('Telefone não cadastrado');
            return;
        }
        const message = encodeURIComponent(`Olá ${name}, aqui é o ${user.nome} da Aurora Folheados. Estou passando para combinarmos a nossa próxima visita.`);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    // Derived Stats
    const totalRevenue = pdvs.reduce((acc, p) => acc + p.vendasMensais, 0);
    const overdueCount = pdvs.filter(p => p.statusFinanceiro === 'EM_ATRASO').length; // Or logic for overdue visits if tracking visits

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <PageHeader
                title="Gestão de PDVs"
                description="Acompanhe o desempenho, visitas e saúde financeira das suas lojas parceiras."
                extra={<Button variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Total de Lojas" value={pdvs.length.toString()} icon="storefront" />
                <StatCard label="Visitas Pendentes" value="-" icon="calendar_today" className="!text-amber-500" />
                <StatCard label="PDVs em Atraso" value={overdueCount.toString()} icon="warning" className="!text-red-500" />
                <StatCard label="Faturamento da Rede" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" className="!text-primary" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2">
                    {['TODOS', 'ATRASO', 'ESTOQUE_BAIXO'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filter === f
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30'
                                }`}
                        >
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por loja ou contato..."
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">sync</span>
                    <p className="text-gray-400 font-bold mt-2">Carregando seus PDVs...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {getFilteredPDVs().length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">store_off</span>
                            <h3 className="text-xl font-black text-gray-400">Nenhum PDV encontrado</h3>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto mt-2">Você ainda não possui Pontos de Venda vinculados ou nenhum corresponde à sua busca.</p>
                        </div>
                    ) : (
                        getFilteredPDVs().map((pdv) => (
                            <Card key={pdv.id} padding="none" className="group overflow-hidden animate-in fade-in zoom-in duration-300">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined text-3xl">store</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-brand-dark">{pdv.nome}</h3>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{pdv.contato}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <StatusBadge status={pdv.statusFinanceiro === 'EM_DIA' ? 'success' : pdv.statusFinanceiro === 'ALERTA' ? 'warning' : 'error'}>
                                                Financeiro: {pdv.statusFinanceiro.replace('_', ' ')}
                                            </StatusBadge>
                                            <StatusBadge status={pdv.statusEstoque === 'NORMAL' ? 'success' : 'warning'}>
                                                Estoque: {pdv.statusEstoque}
                                            </StatusBadge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque no Local</p>
                                            <p className="text-sm font-bold text-brand-dark">R$ {pdv.estoqueValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendas do Mês</p>
                                            <p className="text-sm font-bold text-primary">R$ {pdv.vendasMensais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Última Visita</p>
                                            <p className="text-sm font-bold text-gray-600">{new Date(pdv.ultimaVisita).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próxima Visita</p>
                                            <p className={`text-sm font-bold ${new Date(pdv.proximaVisita) < new Date() ? 'text-red-500' : 'text-gray-600'}`}>
                                                {new Date(pdv.proximaVisita).toLocaleDateString('pt-BR')}
                                                {new Date(pdv.proximaVisita) < new Date() && ' (ATRASADA)'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Link to={`/auditoria/${pdv.id}`} className="flex-1">
                                            <Button fullWidth icon="inventory_2" variant="primary">Fazer Auditoria</Button>
                                        </Link>
                                        <Button variant="secondary" icon="chat" onClick={() => openWhatsApp(pdv.whatsapp, pdv.contato)}>
                                            Contatar
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">ID: {pdv.id}</span>
                                    <button className="text-[10px] font-bold text-primary uppercase hover:underline">Ver Histórico Completo</button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PDVManagement;
