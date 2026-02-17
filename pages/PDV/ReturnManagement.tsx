import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User, Customer } from '../../types';
import { returnService } from '../../services/returnService';
import { pdvService } from '../../services/pdvService';
import { inventoryService } from '../../services/inventoryService';
import { customerService } from '../../services/customerService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReturnRequest {
    id: string;
    data: string;
    cliente: string;
    produto: string;
    motivo: string;
    valor: number;
    status: 'CONCLUIDA' | 'PENDENTE' | 'RECUSADA';
}

const ReturnManagement: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [stats, setStats] = useState({
        monthlyReturns: 0,
        defects: 0,
        totalCredit: 0
    });

    const [showNewReturn, setShowNewReturn] = useState(false);
    const [returnStep, setReturnStep] = useState(1);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const navigate = useNavigate();

    // Form State
    const [pdvId, setPdvId] = useState<string>('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        cliente_id: '',
        produto_id: '',
        motivo: 'TROCA',
        valor_credito: 0,
        observacoes: ''
    });

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const pdv = await pdvService.getPDVByPartnerId(user.id);
            if (!pdv) return;
            setPdvId(pdv.id);

            const [returnsData, customersData, itemsData] = await Promise.all([
                returnService.getReturnsByPDV(pdv.id),
                customerService.getCustomersByPDV(pdv.id),
                inventoryService.getPDVItems(pdv.id)
            ]);

            setCustomers(customersData);
            setProducts(itemsData);

            const mapped = (returnsData || []).map((r: any) => ({
                id: r.id.substring(0, 8).toUpperCase(),
                data: format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                cliente: r.cliente?.nome || 'Cliente não identificado',
                produto: r.produto?.nome || 'Produto não identificado',
                motivo: r.motivo,
                valor: Number(r.valor_credito),
                status: r.status as any
            }));

            setReturns(mapped);

            // Stats
            const now = new Date();
            const thisMonth = returnsData.filter(r => {
                const rDate = new Date(r.created_at);
                return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
            });

            setStats({
                monthlyReturns: thisMonth.length,
                defects: returnsData.filter(r => r.motivo === 'DEFEITO').length,
                totalCredit: returnsData.reduce((acc, r) => acc + Number(r.valor_credito), 0)
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.produto_id) return alert('Selecione um produto');

            await returnService.createReturn({
                pdv_id: pdvId,
                cliente_id: formData.cliente_id || undefined,
                produto_id: formData.produto_id,
                quantidade: 1,
                motivo: formData.motivo,
                valor_credito: formData.valor_credito,
                status: 'CONCLUIDA',
                observacoes: formData.observacoes
            });

            setReturnStep(2);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Erro ao registrar troca');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando trocas e devoluções...</div>;
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <PageHeader
                title="Trocas e Devoluções"
                description="Gerencie os retornos de produtos e solicitações de garantia dos seus clientes."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Trocas no Mês"
                    value={stats.monthlyReturns.toString()}
                    icon="sync_alt"
                />
                <StatCard
                    label="Defeitos Reportados"
                    value={stats.defects.toString()}
                    icon="report_problem"
                    className="!text-amber-500"
                />
                <StatCard
                    label="Crédito Gerado (Total)"
                    value={`R$ ${stats.totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="account_balance_wallet"
                    className="!text-primary"
                />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-brand-dark">Solicitações Recentes</h3>
                    <Button onClick={() => setShowNewReturn(true)} icon="add">Nova Troca / Devolução</Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID / Data</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente / Produto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Motivo</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {returns.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-brand-dark">{req.id}</div>
                                        <div className="text-[11px] text-gray-400">{req.data}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-700">{req.cliente}</div>
                                        <div className="text-[11px] text-primary font-bold uppercase">{req.produto}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${req.motivo === 'DEFEITO' ? 'bg-red-50 text-red-600' :
                                            req.motivo === 'TROCA' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {req.motivo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-700">R$ {req.valor.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            label={req.status}
                                            variant={req.status === 'CONCLUIDA' ? 'success' : req.status === 'PENDENTE' ? 'warning' : 'danger'}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedReturn(req)}
                                            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/10"
                                        >
                                            <span className="material-symbols-outlined text-lg">receipt</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {returns.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                        Nenhuma solicitação encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* New Return Modal */}
            {showNewReturn && (
                <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg shadow-2xl scale-in" title="Registrar Nova Troca">
                        <div className="space-y-6">
                            {returnStep === 1 ? (
                                <>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cliente</label>
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                                value={formData.cliente_id}
                                                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                            >
                                                <option value="">Selecione o Cliente (Opcional)</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Produto sendo devolvido</label>
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                                value={formData.produto_id}
                                                onChange={(e) => {
                                                    const prod = products.find(p => p.id === e.target.value);
                                                    setFormData({ ...formData, produto_id: e.target.value, valor_credito: prod?.preco || 0 });
                                                }}
                                            >
                                                <option value="">Selecione o Produto</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.nome} - {p.sku}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Motivo</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setFormData({ ...formData, motivo: 'TROCA' })}
                                                    className={`py-3 border-2 rounded-xl text-xs font-bold transition-all ${formData.motivo === 'TROCA' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-gray-400'}`}
                                                >
                                                    TROCA / TAMANHO
                                                </button>
                                                <button
                                                    onClick={() => setFormData({ ...formData, motivo: 'DEFEITO' })}
                                                    className={`py-3 border-2 rounded-xl text-xs font-bold transition-all ${formData.motivo === 'DEFEITO' ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-gray-100 bg-white text-gray-400'}`}
                                                >
                                                    DEFEITO DE FÁBRICA
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Valor do Crédito</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                                value={formData.valor_credito}
                                                onChange={(e) => setFormData({ ...formData, valor_credito: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" className="flex-1" onClick={() => setShowNewReturn(false)}>Cancelar</Button>
                                        <Button className="flex-1" onClick={handleSubmit}>Concluir Registro</Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-4">
                                        <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                                        <div>
                                            <p className="text-sm font-bold text-green-800">Crédito Gerado</p>
                                            <p className="text-[11px] text-green-600 font-semibold uppercase">R$ {formData.valor_credito.toFixed(2)} disponível para o cliente</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center px-4">
                                        Deseja aplicar este crédito agora em uma **nova venda** ou apenas registrar a devolução no estoque?
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            icon="shopping_cart"
                                            onClick={() => {
                                                const selCustomer = customers.find(c => c.id === formData.cliente_id);
                                                navigate('/venda-rapida', {
                                                    state: {
                                                        creditAmount: formData.valor_credito,
                                                        customerName: selCustomer?.nome,
                                                        customerWhatsapp: selCustomer?.whatsapp,
                                                        customerCpf: selCustomer?.cpf
                                                    }
                                                });
                                            }}
                                        >
                                            Iniciar Nova Venda com Crédito
                                        </Button>
                                        <Button variant="secondary" onClick={() => { setShowNewReturn(false); setReturnStep(1); }}>Apenas Registrar Devolução</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            )}
            {/* View Details Modal */}
            {selectedReturn && (
                <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg shadow-2xl scale-in" title="Detalhes da Solicitação">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID da Solicitação</p>
                                    <p className="text-sm font-bold text-brand-dark">{selectedReturn.id}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data / Hora</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedReturn.data}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedReturn.cliente}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</p>
                                    <p className="text-sm font-bold text-primary uppercase">{selectedReturn.produto}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Motivo</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedReturn.motivo}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor de Crédito</p>
                                    <p className="text-sm font-bold text-emerald-600">R$ {selectedReturn.valor.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <Button variant="secondary" className="w-full" onClick={() => setSelectedReturn(null)}>Fechar</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ReturnManagement;
