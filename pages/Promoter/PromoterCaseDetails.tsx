import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { inventoryService } from '../../services/inventoryService';
import { movementService, Movement } from '../../services/movementService';

interface CaseItem {
    id: string;
    sku: string;
    nome: string;
    categoria: string;
    quantidade: number;
    preco: number;
    imagemUrl?: string;
    status: 'EM_ESTOQUE' | 'ABAIXO_ALERTA';
}

const PromoterCaseDetails: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'HISTORICO'>('INVENTARIO');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [briefcaseItems, setBriefcaseItems] = useState<CaseItem[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [itemsData, movementsData] = await Promise.all([
                inventoryService.getPromoterItems(user.id),
                movementService.getMovements() // This fetches ALL movements, we should filter by user in service or here (service is better for perf, but here for now)
            ]);

            setBriefcaseItems(itemsData);

            // Filter movements relevant to this promoter
            // Origem OR Destino = user.id
            const userMovements = movementsData.filter(m =>
                m.usuario_id === user.id ||
                m.origem_id === user.id ||
                m.destino_id === user.id
            );
            setMovements(userMovements);

        } catch (err) {
            console.error('Erro ao carregar dados da maleta:', err);
            // alert('Erro ao carregar dados da maleta'); // Suppressed for better UX on empty states
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.id]);

    const totalItems = briefcaseItems.reduce((acc, item) => acc + item.quantidade, 0);
    const totalValue = briefcaseItems.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const lowStockCount = briefcaseItems.filter(i => i.status === 'ABAIXO_ALERTA').length;

    const filteredItems = briefcaseItems.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <PageHeader
                title="Minha Maleta"
                description="Gerencie seu estoque circulante, confira peças e acompanhe transferências."
                extra={<Button variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Total de Peças" value={totalItems.toString()} icon="inventory_2" />
                <StatCard label="Valor na Maleta" value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" className="!text-brand-dark" />
                <StatCard label="Itens em Alerta" value={lowStockCount} icon="warning" className="!text-amber-500" />
                <StatCard label="Movimentações (Mês)" value={movements.length} icon="sync_alt" className="!text-primary" />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('INVENTARIO')}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'INVENTARIO' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Inventário Atual
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORICO')}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'HISTORICO' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Histórico de Movimentações
                        </button>
                    </div>

                    {activeTab === 'INVENTARIO' && (
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por SKU ou Nome..."
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
                        </div>
                    ) : activeTab === 'INVENTARIO' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SKU / Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qtd</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtotal</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            <span className="material-symbols-outlined text-3xl mb-2">work_off</span>
                                            <p className="text-sm font-bold uppercase">Sua maleta está vazia</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded bg-gray-100 flex items-center justify-center text-gray-300">
                                                        {item.imagemUrl ? <img src={item.imagemUrl} className="size-full object-cover rounded" /> : <span className="material-symbols-outlined text-lg">image</span>}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-brand-dark">{item.sku}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">{item.nome}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{item.categoria}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${item.quantidade <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {item.quantidade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-600">R$ {item.preco.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-xs font-black text-brand-dark">R$ {(item.preco * item.quantidade).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <StatusBadge status={item.status === 'EM_ESTOQUE' ? 'success' : 'warning'}>
                                                    {item.status === 'EM_ESTOQUE' ? 'Em Estoque' : 'Baixo Estoque'}
                                                </StatusBadge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qtd</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Responsável</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {movements.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400">
                                            <p className="text-sm font-bold uppercase">Nenhuma movimentação encontrada</p>
                                        </td>
                                    </tr>
                                ) : (
                                    movements.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                                {new Date(t.created_at || '').toLocaleDateString('pt-BR')}
                                                <span className="text-[9px] ml-1 opacity-70">{new Date(t.created_at || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge
                                                    status={t.tipo === 'TRANSFERENCIA' ? (t.origem_tipo === 'CENTRAL' ? 'success' : 'neutral') : 'warning'}
                                                >
                                                    {t.tipo}
                                                </StatusBadge>
                                                <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                                                    {t.origem_tipo === 'CENTRAL' ? 'Recebido da Matriz' : `Destino: ${t.destino_tipo}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-black text-brand-dark">{t.produto?.sku}</div>
                                                <div className="text-[9px] text-gray-400">{t.produto?.nome}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{t.quantidade}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-brand-dark">{t.usuario?.nome}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            <div className="flex justify-between items-center bg-primary/5 p-6 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-dark">Conferência Rápida</h4>
                        <p className="text-xs text-gray-500">Use a câmera para auditar sua maleta rapidamente.</p>
                    </div>
                </div>
                <Button variant="primary" icon="photo_camera" onClick={() => alert('Feature camera em desenvolvimento')}>Abrir Leitor</Button>
            </div>
        </div>
    );
};

export default PromoterCaseDetails;
