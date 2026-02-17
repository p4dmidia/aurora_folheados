import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { inventoryService, StockLevel } from '../../services/inventoryService';
import { movementService, Movement } from '../../services/movementService';
import { userService } from '../../services/userService';

const CentralInventory: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'ESTOQUE' | 'MOVIMENTAÇÕES'>('ESTOQUE');
    const [showAddModal, setShowAddModal] = useState(false);
    const [inventory, setInventory] = useState<StockLevel[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [promoters, setPromoters] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [addFormData, setAddFormData] = useState({ produto_id: '', quantidade: 0 });

    // Transfer Modal states
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StockLevel | null>(null);
    const [transferQty, setTransferQty] = useState(0);
    const [promoterSearch, setPromoterSearch] = useState('');
    const [selectedPromoter, setSelectedPromoter] = useState<User | null>(null);

    // Edit Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<StockLevel | null>(null);
    const [editNewQty, setEditNewQty] = useState(0);

    const handleEdit = (product: StockLevel) => {
        setEditingProduct(product);
        setEditNewQty(product.qtd_central);
        setShowEditModal(true);
    };

    const confirmEdit = async () => {
        if (!editingProduct) return;
        const delta = editNewQty - editingProduct.qtd_central;

        if (delta === 0) {
            setShowEditModal(false);
            return;
        }

        try {
            setLoading(true);
            await inventoryService.addStockToCentral(editingProduct.produto_id, delta, user.id);
            setShowEditModal(false);
            await loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [invData, moveData, userData] = await Promise.all([
                inventoryService.getInventoryLevels(),
                movementService.getMovements(),
                userService.getUsers()
            ]);
            setInventory(invData);
            setMovements(moveData);
            setPromoters(userData.filter(u => u.role === 'PROMOTOR'));
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStock = async () => {
        if (!addFormData.produto_id || addFormData.quantidade <= 0) return;
        try {
            setLoading(true);
            await inventoryService.addStockToCentral(addFormData.produto_id, addFormData.quantidade, user.id);
            setShowAddModal(false);
            setAddFormData({ produto_id: '', quantidade: 0 });
            await loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = (product: StockLevel) => {
        setSelectedProduct(product);
        setTransferQty(0);
        setPromoterSearch('');
        setSelectedPromoter(null);
        setShowTransferModal(true);
    };

    const confirmTransfer = async () => {
        if (!selectedProduct || !selectedPromoter || transferQty <= 0) {
            alert('Preencha todos os campos corretamente');
            return;
        }

        if (transferQty > selectedProduct.qtd_central) {
            alert('Estoque central insuficiente');
            return;
        }

        try {
            setLoading(true);
            await inventoryService.transferToPromoter(
                selectedProduct.produto_id,
                selectedPromoter.id,
                transferQty,
                user.id
            );
            setShowTransferModal(false);
            await loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPromoters = promoters.filter(p =>
        p.nome.toLowerCase().includes(promoterSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(promoterSearch.toLowerCase())
    );

    const totalCentralValue = inventory.reduce((acc, item) => acc + (item.preco_custo * item.qtd_central), 0);
    const totalFieldValue = inventory.reduce((acc, item) => acc + (item.preco_venda * item.qtd_em_campo), 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Estoque Central"
                description="Gerencie o almoxarifado principal, dê entrada em mercadorias e transfira para promotores."
                extra={
                    <Button icon="add" onClick={() => setShowAddModal(true)}>Adicionar Peças</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Valor em Estoque (Custo)" value={`R$ ${totalCentralValue.toLocaleString('pt-BR')}`} icon="warehouse" className="!text-brand-dark" />
                <StatCard label="Total de Peças (Central)" value={inventory.reduce((acc, i) => acc + i.qtd_central, 0)} icon="inventory" />
                <StatCard label="Valor em Campo (Venda)" value={`R$ ${totalFieldValue.toLocaleString('pt-BR')}`} icon="moving" className="!text-primary" />
                <StatCard label="Itens em Falta" value={inventory.filter(i => i.qtd_central === 0).length} icon="warning" className="!text-red-500" />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 flex items-center justify-between p-4 px-6 gap-4 flex-wrap">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('ESTOQUE')}
                            className={`py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'ESTOQUE' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Inventário Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('MOVIMENTAÇÕES')}
                            className={`py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'MOVIMENTAÇÕES' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Movimentações Recentes
                        </button>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Buscar SKU ou Nome..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 shadow-sm font-bold"
                            />
                        </div>
                        <Button size="sm" variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                        </div>
                    )}

                    {activeTab === 'ESTOQUE' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">SKU / Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qtd Central</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qtd em Campo</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custo Unit.</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase">
                                {filteredInventory.map((item) => (
                                    <tr key={item.produto_id} className="hover:bg-gray-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-brand-dark">{item.sku}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">{item.nome}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-bold text-gray-500">{item.categoria}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${item.qtd_central === 0 ? 'bg-red-50 text-red-600' :
                                                item.qtd_central < 50 ? 'bg-amber-50 text-amber-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.qtd_central}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-primary">{item.qtd_em_campo}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-gray-400">R$ {item.preco_custo.toFixed(2)}</div>
                                            <div className="text-[10px] text-primary">Margem: {Math.round((item.preco_venda / item.preco_custo - 1) * 100)}%</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 flex-nowrap min-w-max">
                                                <Button size="sm" variant="secondary" icon="local_shipping" className="!px-3" title="Transferir para Promotor" onClick={() => handleTransfer(item)}></Button>
                                                <Button size="sm" variant="ghost" icon="edit" className="!px-3" title="Ajuste Manual" onClick={() => handleEdit(item)}></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data / Hora</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operação</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qtd</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usuário</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase">
                                {movements.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50/20 transition-colors">
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-400">
                                            {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-[10px]">
                                            <StatusBadge status={m.tipo === 'TRANSFERENCIA' ? 'neutral' : 'success'}>
                                                {m.tipo}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-black">{m.produto?.sku}</div>
                                            <div className="text-[9px] text-gray-400">{m.produto?.nome}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-brand-dark">{m.quantidade}</td>
                                        <td className="px-6 py-4 text-[10px] font-bold text-primary">{m.usuario?.nome}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="Atribuição por Promotor" padding="none" className="overflow-hidden">
                    <div className="p-6 space-y-4">
                        {promoters.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-xl hover:shadow-primary/5 border border-transparent hover:border-primary/10 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-black">
                                        {p.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-brand-dark uppercase tracking-tight">{p.nome}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Atribuído em campo</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-amber-500 uppercase">Consultar Detalhes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Ajuste Rápido de Inventário" description="Use para correções manuais de estoque central.">
                    <form className="space-y-4" onSubmit={(e) => {
                        e.preventDefault();
                        const sku = (e.currentTarget.elements.namedItem('sku') as HTMLInputElement).value;
                        const qty = (e.currentTarget.elements.namedItem('qty') as HTMLInputElement).value;
                        const prod = inventory.find(i => i.sku === sku);
                        if (prod) {
                            inventoryService.addStockToCentral(prod.produto_id, parseInt(qty), user.id).then(() => loadData());
                        } else {
                            alert('Produto não encontrado');
                        }
                    }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">SKU do Produto</label>
                                <input name="sku" type="text" placeholder="Ex: AUR-001" className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Ajuste (+/-)</label>
                                <input name="qty" type="number" placeholder="Ex: -5" className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold" />
                            </div>
                        </div>
                        <Button type="submit" variant="secondary" fullWidth icon="check_circle">Aplicar Ajuste</Button>
                    </form>
                </Card>
            </div>

            {/* Modal: Adicionar Estoque */}
            {showAddModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title="Dê entrada no Estoque Central"
                        headerAction={<button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-brand-dark"><span className="material-symbols-outlined">close</span></button>}
                    >
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecione o Produto</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        onChange={(e) => setAddFormData({ ...addFormData, produto_id: e.target.value })}
                                        value={addFormData.produto_id}
                                    >
                                        <option value="">Selecione...</option>
                                        {inventory.map(i => (
                                            <option key={i.produto_id} value={i.produto_id}>{i.sku} - {i.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade de Entrada</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        onChange={(e) => setAddFormData({ ...addFormData, quantidade: parseInt(e.target.value) })}
                                        value={addFormData.quantidade}
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>Cancelar</Button>
                                <Button fullWidth onClick={handleAddStock} loading={loading}>Confirmar Entrada</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Ajuste Manual (Edit) */}
            {showEditModal && editingProduct && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title="Ajuste Manual de Estoque"
                        description={`Corrigindo: ${editingProduct.sku}`}
                        headerAction={<button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-brand-dark"><span className="material-symbols-outlined">close</span></button>}
                    >
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque Atual</p>
                                    <p className="text-2xl font-black text-brand-dark">{editingProduct.qtd_central} un</p>
                                </div>
                                <div className="h-10 w-px bg-gray-200 mx-4"></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Novo Total</p>
                                    <p className={`text-2xl font-black text-right ${editNewQty !== editingProduct.qtd_central ? 'text-primary' : 'text-gray-400'}`}>
                                        {editNewQty || 0} un
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nova Quantidade Real</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={editNewQty || ''}
                                    onChange={(e) => setEditNewQty(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-brand-dark"
                                    autoFocus
                                />
                            </div>

                            {editNewQty !== editingProduct.qtd_central && (
                                <div className={`p-3 rounded-xl flex items-center gap-3 ${editNewQty > editingProduct.qtd_central ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    <span className="material-symbols-outlined text-lg">
                                        {editNewQty > editingProduct.qtd_central ? 'add_circle' : 'remove_circle'}
                                    </span>
                                    <p className="text-xs font-bold uppercase">
                                        {editNewQty > editingProduct.qtd_central ? 'Entrada:' : 'Saída:'}
                                        <span className="ml-1 font-black text-lg">
                                            {editNewQty > editingProduct.qtd_central ? '+' : ''}
                                            {Math.abs(editNewQty - editingProduct.qtd_central)}
                                        </span>
                                    </p>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowEditModal(false)}>Cancelar</Button>
                                <Button
                                    fullWidth
                                    onClick={confirmEdit}
                                    loading={loading}
                                    disabled={editNewQty < 0}
                                    variant={editNewQty !== editingProduct.qtd_central ? 'primary' : 'secondary'}
                                >
                                    Confirmar Ajuste
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Transferir para Promotor */}
            {showTransferModal && selectedProduct && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-xl w-full animate-in fade-in zoom-in duration-300"
                        title="Transferir para Promotor"
                        description={`Enviando ${selectedProduct.nome} (${selectedProduct.sku})`}
                        headerAction={<button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-brand-dark"><span className="material-symbols-outlined">close</span></button>}
                    >
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Estoque Disponível</p>
                                    <p className="text-2xl font-black text-primary">{selectedProduct.qtd_central} peças</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">1. Pesquisar Promotor</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                        <input
                                            type="text"
                                            placeholder="Nome, e-mail ou ID..."
                                            value={promoterSearch}
                                            onChange={(e) => setPromoterSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {filteredPromoters.length > 0 ? (
                                        filteredPromoters.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPromoter(p)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedPromoter?.id === p.id
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-gray-100 hover:border-gray-200 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${selectedPromoter?.id === p.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        {p.nome.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black uppercase">{p.nome}</p>
                                                        <p className="text-[9px] font-bold opacity-60 text-gray-500">{p.email}</p>
                                                    </div>
                                                </div>
                                                {selectedPromoter?.id === p.id && (
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-400">
                                            <span className="material-symbols-outlined text-2xl mb-1">person_search</span>
                                            <p className="text-[10px] font-bold uppercase">Nenhum promotor encontrado</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 pt-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">2. Quantidade a Transferir</label>
                                    <input
                                        type="number"
                                        max={selectedProduct.qtd_central}
                                        min={1}
                                        placeholder="Digite a quantidade..."
                                        value={transferQty || ''}
                                        onChange={(e) => setTransferQty(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-brand-dark"
                                    />
                                    {transferQty > selectedProduct.qtd_central && (
                                        <p className="text-[10px] text-red-500 font-bold pl-1 uppercase mt-1">A quantidade excede o estoque central!</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowTransferModal(false)}>Cancelar</Button>
                                <Button
                                    fullWidth
                                    onClick={confirmTransfer}
                                    loading={loading}
                                    disabled={!selectedPromoter || transferQty <= 0 || transferQty > selectedProduct.qtd_central}
                                >
                                    Confirmar Transferência
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CentralInventory;
