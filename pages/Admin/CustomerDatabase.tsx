import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import { User, Customer, PDV } from '../../types';
import { customerService } from '../../services/customerService';
import { pdvService } from '../../services/pdvService';

const CustomerDatabase: React.FC<{ user: User }> = ({ user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [pdvs, setPdvs] = useState<PDV[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<Partial<Customer>>({
        nome: '',
        whatsapp: '',
        cpf: '',
        pdv_origem: undefined
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [custData, pdvData] = await Promise.all([
                customerService.getCustomers(),
                pdvService.getPDVs()
            ]);
            setCustomers(custData);
            setPdvs(pdvData);
        } catch (err: any) {
            console.error('Erro ao carregar clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.nome) {
            alert('Por favor, informe ao menos o nome do lead.');
            return;
        }

        try {
            setLoading(true);
            await customerService.createCustomer(formData as Omit<Customer, 'id' | 'created_at' | 'pdv'>);
            setShowModal(false);
            setFormData({ nome: '', whatsapp: '', cpf: '', pdv_origem: undefined });
            await loadData();
        } catch (err: any) {
            alert('Erro ao salvar cliente: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.whatsapp?.includes(searchTerm)) ||
        (c.cpf?.includes(searchTerm))
    );

    const totalCustomers = customers.length;
    // For now, these stats are mock since we don't have sales linked to all customers in this view easily
    const avgMonthlySpend = totalCustomers > 0 ? 450 : 0;

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Base Mestre de Clientes (Leads)"
                description="Gestão centralizada de leads. Clientes são ativos da Aurora Folheados, independente do PDV de origem."
                extra={
                    <Button icon="person_add" onClick={() => setShowModal(true)}>Cadastrar Novo Lead</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center p-6 bg-brand-dark !text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Total de Leads</p>
                    <p className="text-4xl font-black">{totalCustomers.toLocaleString('pt-BR')}</p>
                </Card>
                <Card className="text-center p-6 border-primary/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Gasto Médio Mensal</p>
                    <p className="text-4xl font-black text-primary">R$ {avgMonthlySpend.toLocaleString('pt-BR')}</p>
                </Card>
                <Card className="text-center p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Conversão Leads</p>
                    <p className="text-4xl font-black text-brand-dark">65%</p>
                </Card>
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por nome, WhatsApp ou CPF..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-80 shadow-sm font-bold"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>
                        <Button size="sm" variant="secondary" icon="download">Exportar CRM</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                        </div>
                    )}

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead / Contato</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem (PDV)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Data Cadastro</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 uppercase tracking-tighter">
                            {!loading && filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase">Nenhum lead encontrado</td>
                                </tr>
                            )}
                            {filteredCustomers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-brand-dark tracking-tight">{c.nome}</div>
                                        <div className="text-[10px] text-gray-400 font-bold">{c.whatsapp || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {c.pdv_origem ? (
                                            <span className="text-[10px] font-black text-primary uppercase">
                                                {c.pdv?.nome_fantasia || 'PDV DESATIVADO (AURORA)'}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-brand-dark text-[10px] font-black text-white rounded-md">
                                                AURORA FOLHEADOS
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400 text-[10px]">
                                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" icon="chat" className="!px-2 !text-green-500"></Button>
                                            <Button size="sm" variant="ghost" icon="edit" className="!px-2"></Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                icon="delete"
                                                className="!px-2 !text-red-400"
                                                onClick={() => {
                                                    if (confirm('Remover Lead?')) {
                                                        customerService.deleteCustomer(c.id).then(() => loadData());
                                                    }
                                                }}
                                            ></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title="Cadastrar Novo Lead"
                        headerAction={
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-brand-dark leading-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        }
                    >
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.nome || ''}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none text-sm font-bold"
                                    placeholder="Nome do Cliente"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                                    <input
                                        type="text"
                                        value={formData.whatsapp || ''}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none text-sm font-bold"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                                    <input
                                        type="text"
                                        value={formData.cpf || ''}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none text-sm font-bold"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">PDV de Origem (Opcional)</label>
                                <select
                                    value={formData.pdv_origem || ''}
                                    onChange={(e) => setFormData({ ...formData, pdv_origem: e.target.value || undefined })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none text-sm font-bold"
                                >
                                    <option value="">AURORA FOLHEADOS (DIRETO)</option>
                                    {pdvs.map(pdv => (
                                        <option key={pdv.id} value={pdv.id}>{pdv.nome_fantasia}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button fullWidth onClick={handleSave} loading={loading}>Salvar Lead</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CustomerDatabase;
