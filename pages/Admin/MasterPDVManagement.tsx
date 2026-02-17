import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User, Role } from '../../types';
import { pdvService, PDV } from '../../services/pdvService';
import { userService } from '../../services/userService';

const MasterPDVManagement: React.FC<{ user: User }> = ({ user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPromotor, setFilterPromotor] = useState('TODOS');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingPDV, setEditingPDV] = useState<PDV | null>(null);
    const [viewingPDV, setViewingPDV] = useState<PDV | null>(null);
    const [pdvs, setPdvs] = useState<PDV[]>([]);
    const [promoters, setPromoters] = useState<User[]>([]);
    const [partners, setPartners] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ totalRevenue: 0, totalDefault: 0 });

    // Form states
    const [formData, setFormData] = useState<Partial<PDV>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pdvData, userData, statsData] = await Promise.all([
                pdvService.getPDVs(),
                userService.getUsers(),
                pdvService.getPDVStats()
            ]);
            setPdvs(pdvData);
            setPromoters(userData.filter(u => u.role === Role.PROMOTOR));
            setPartners(userData.filter(u => u.role === Role.PARCEIRO));
            setStats(statsData);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const filteredPDVs = pdvs.filter(pdv =>
        (pdv.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) || (pdv.cidade?.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (filterPromotor === 'TODOS' || pdv.promotor_id === filterPromotor)
    );

    const openModal = (pdv?: PDV) => {
        if (pdv) {
            setEditingPDV(pdv);
            setFormData(pdv);
        } else {
            setEditingPDV(null);
            setFormData({
                nome_fantasia: '',
                tipo_pessoa: 'FISICA',
                documento: '',
                endereco: '',
                cidade: '',
                estado: '',
                promotor_id: '',
                parceiro_id: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (editingPDV) {
                await pdvService.updatePDV(editingPDV.id, formData);
            } else {
                await pdvService.createPDV(formData as Omit<PDV, 'id' | 'created_at' | 'promotor'>);
            }
            setShowModal(false);
            await loadData();
        } catch (err: any) {
            alert('Erro ao salvar PDV: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Rede de Parceiros (PDVs)"
                description="Gestão centralizada de todos os pontos de venda, saúde financeira e performance por região."
                extra={
                    <Button icon="person_add" onClick={() => openModal()}>Cadastrar Novo PDV</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="PDVs Ativos" value={pdvs.length} icon="storefront" className="!text-brand-dark" />
                <StatCard
                    label="Faturamento Total Rede"
                    value={stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon="payments"
                    className="!text-primary"
                />
                <StatCard
                    label="Inadimplência (Valor)"
                    value={stats.totalDefault.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon="warning"
                    className="!text-red-600"
                />
                <StatCard label="Cobertura Territorial" value={`${new Set(pdvs.map(p => p.cidade)).size} Cidades`} icon="map" />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nome ou cidade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-80 shadow-sm font-bold"
                            />
                        </div>

                        <select
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                            value={filterPromotor}
                            onChange={(e) => setFilterPromotor(e.target.value)}
                        >
                            <option value="TODOS">Todos os Promotores</option>
                            {promoters.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>
                        <Button size="sm" variant="secondary" icon="download">Exportar</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                        </div>
                    )}

                    {!loading && pdvs.length === 0 && (
                        <div className="p-20 text-center text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-4">store_off</span>
                            <p className="text-lg font-black uppercase tracking-widest">Nenhum PDV cadastrado</p>
                        </div>
                    )}

                    {(pdvs.length > 0 || loading) && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loja / Cidade</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Promotor Responsável</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parceiro (Dono)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Devedor / Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cadastro</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase">
                                {filteredPDVs.map((pdv) => (
                                    <tr key={pdv.id} className="hover:bg-gray-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-brand-dark tracking-tight">{pdv.nome_fantasia}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">{pdv.cidade || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-primary">
                                                    {(pdv.promotor?.nome || 'S').charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-bold text-gray-600">{pdv.promotor?.nome || 'Não atribuído'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-black text-brand-dark">
                                                    {(partners.find(p => p.id === pdv.parceiro_id)?.nome || 'P').charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-bold text-brand-dark">{partners.find(p => p.id === pdv.parceiro_id)?.nome || 'Não vinculado'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-brand-dark">R$ 0,00</span>
                                                <StatusBadge status="success">Em dia</StatusBadge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-[11px] font-bold text-gray-400">
                                            {pdv.created_at ? new Date(pdv.created_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    icon="visibility"
                                                    className="!px-2"
                                                    title="Ver Detalhes"
                                                    onClick={() => {
                                                        setViewingPDV(pdv);
                                                        setShowViewModal(true);
                                                    }}
                                                ></Button>
                                                <Button size="sm" variant="ghost" icon="edit" className="!px-2" onClick={() => openModal(pdv)}></Button>
                                                <Button size="sm" variant="ghost" icon="delete" className="!px-2 !text-red-400" onClick={() => {
                                                    if (confirm('Remover PDV? Todos os vínculos serão perdidos.')) {
                                                        pdvService.deletePDV(pdv.id).then(() => loadData());
                                                    }
                                                }}></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="Alertas de Cobrança" description="PDVs com parcelas vencidas (Dados em tempo real em breve).">
                    <div className="p-12 text-center text-gray-300">
                        <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma pendência crítica hoje</p>
                    </div>
                </Card>

                <Card title="Crescimento da Rede" description="Novos parceiros cadastrados nos últimos meses.">
                    <div className="h-48 flex items-end gap-3 px-2">
                        {[40, 60, 45, 80, 70, 95].map((h, i) => (
                            <div key={i} className="flex-1 space-y-2">
                                <div className="bg-primary/10 hover:bg-primary transition-all rounded-t-lg" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title={editingPDV ? "Editar PDV" : "Cadastrar Novo PDV"}
                        headerAction={
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-brand-dark leading-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        }
                    >
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Fantasia / Salão</label>
                                    <input
                                        type="text"
                                        value={formData.nome_fantasia || ''}
                                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                                        placeholder="Ex: Studio Glow"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-brand-dark"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo de Pessoa</label>
                                        <select
                                            value={formData.tipo_pessoa || 'FISICA'}
                                            onChange={(e) => setFormData({ ...formData, tipo_pessoa: e.target.value as 'FISICA' | 'JURIDICA' })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        >
                                            <option value="FISICA">Pessoa Física</option>
                                            <option value="JURIDICA">Pessoa Jurídica</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                            {formData.tipo_pessoa === 'JURIDICA' ? 'CNPJ' : 'CPF'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.documento || ''}
                                            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                                            placeholder={formData.tipo_pessoa === 'JURIDICA' ? '00.000.000/0000-00' : '000.000.000-00'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço (Rua, Número, Bairro)</label>
                                    <input
                                        type="text"
                                        value={formData.endereco || ''}
                                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                        placeholder="Ex: Av. Brasil, 1000 - Centro"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={formData.cidade || ''}
                                            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                            placeholder="Ex: São Paulo"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado</label>
                                        <input
                                            type="text"
                                            value={formData.estado || ''}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                                            placeholder="SP"
                                            maxLength={2}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Promotor Responsável</label>
                                        <select
                                            value={formData.promotor_id || ''}
                                            onChange={(e) => setFormData({ ...formData, promotor_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        >
                                            <option value="">Selecione...</option>
                                            {promoters.map(p => (
                                                <option key={p.id} value={p.id}>{p.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Parceiro (Dono)</label>
                                        <select
                                            value={formData.parceiro_id || ''}
                                            onChange={(e) => setFormData({ ...formData, parceiro_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        >
                                            <option value="">Selecione...</option>
                                            {partners.map(p => (
                                                <option key={p.id} value={p.id}>{p.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button fullWidth onClick={handleSave} loading={loading}>
                                    {editingPDV ? "Salvar Alterações" : "Ativar PDV"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {showViewModal && viewingPDV && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title="Detalhes do PDV"
                        headerAction={
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-brand-dark leading-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        }
                    >
                        <div className="space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Fantasia</label>
                                    <div className="text-sm font-black text-brand-dark uppercase">{viewingPDV.nome_fantasia}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promotor</label>
                                    <div className="text-sm font-black text-brand-dark uppercase">{viewingPDV.promotor?.nome || 'Não atribuído'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Pessoa</label>
                                    <div className="text-sm font-black text-brand-dark">{viewingPDV.tipo_pessoa === 'JURIDICA' ? 'JURÍDICA' : 'FÍSICA'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {viewingPDV.tipo_pessoa === 'JURIDICA' ? 'CNPJ' : 'CPF'}
                                    </label>
                                    <div className="text-sm font-black text-brand-dark">{viewingPDV.documento || '-'}</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço</label>
                                <div className="text-sm font-bold text-gray-600 uppercase">{viewingPDV.endereco || '-'}</div>
                                <div className="text-[11px] font-black text-primary uppercase">
                                    {viewingPDV.cidade} - {viewingPDV.estado}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    icon="edit"
                                    onClick={() => {
                                        setShowViewModal(false);
                                        openModal(viewingPDV);
                                    }}
                                >
                                    Editar PDV
                                </Button>
                                <Button variant="ghost" fullWidth onClick={() => setShowViewModal(false)}>Fechar</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MasterPDVManagement;
