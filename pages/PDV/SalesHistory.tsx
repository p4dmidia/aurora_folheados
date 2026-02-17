import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { saleService } from '../../services/saleService';
import { pdvService } from '../../services/pdvService';
import { customerService } from '../../services/customerService';
import { receiptService } from '../../services/receiptService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
    id: string;
    data: string;
    cliente: {
        nome: string;
        whatsapp: string;
        cpf: string;
    };
    total: number;
    metodoPagamento: 'PIX' | 'CARTAO' | 'DINHEIRO' | 'CREDIARIO';
    status: 'CONCLUIDA' | 'PENDENTE' | 'CANCELADA';
    parcelas?: {
        pagas: number;
        total: number;
        atrasadas: number;
    };
}



const SalesHistory: React.FC<{ user: User }> = ({ user }) => {
    const [filter, setFilter] = useState('TODOS');
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<Sale[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalMonth: 0,
        revenue: 0,
        activeCustomers: 0
    });

    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [saleItems, setSaleItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const pdv = await pdvService.getPDVByPartnerId(user.id);
            if (!pdv) return;

            const [salesData, birthdaysData] = await Promise.all([
                saleService.getSalesByPDV(pdv.id),
                customerService.getBirthdaysOfMonth(new Date().getMonth() + 1)
            ]);

            // Map Sales
            const mappedSales = (salesData || []).map((s: any) => {
                const pagas = s.parcelas?.filter((p: any) => p.status === 'PAGO').length || 0;
                const total = s.parcelas?.length || 0;
                const atrasadas = s.parcelas?.filter((p: any) => p.status === 'ATRASADO').length || 0;

                return {
                    id: s.id.substring(0, 8).toUpperCase(),
                    realId: s.id,
                    data: format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                    cliente: {
                        nome: s.cliente?.nome || 'Cliente não identificado',
                        whatsapp: s.cliente?.whatsapp || '',
                        cpf: s.cliente?.cpf || ''
                    },
                    total: Number(s.valor_total),
                    metodoPagamento: s.tipo_pagamento === 'CARD' ? 'CARTAO' : s.tipo_pagamento === 'CASH' ? 'DINHEIRO' : s.tipo_pagamento,
                    status: 'CONCLUIDA',
                    parcelas: s.tipo_pagamento === 'CREDIARIO' ? { pagas, total, atrasadas } : undefined
                };
            });

            setSales(mappedSales);



            setBirthdays(birthdaysData || []);

            // Stats
            const now = new Date();
            const thisMonthSales = mappedSales.filter(s => {
                const sDate = new Date(s.data.split(' ')[0].split('/').reverse().join('-'));
                return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
            });

            setStats({
                totalMonth: thisMonthSales.length,
                revenue: thisMonthSales.reduce((acc, s) => acc + s.total, 0),
                activeCustomers: new Set(mappedSales.map(s => s.cliente.cpf)).size
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'PIX': return 'qr_code_2';
            case 'CARTAO': return 'credit_card';
            case 'DINHEIRO': return 'payments';
            case 'CREDIARIO': return 'history_edu';
            default: return 'help';
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        if (!phone) return alert('Cliente sem WhatsApp cadastrado');
        const message = encodeURIComponent(`Olá ${name}, tudo bem? Sou da Aurora Folheados...`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const filteredSales = filter === 'TODOS'
        ? sales
        : sales.filter(s => s.metodoPagamento === filter);

    const handleViewDetails = async (sale: any) => {
        try {
            setSelectedSale(sale);
            setLoadingItems(true);
            const items = await saleService.getSaleItems(sale.realId);
            setSaleItems(items || []);
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar detalhes da venda');
        } finally {
            setLoadingItems(false);
        }
    };

    const handlePrintReceipt = async () => {
        if (!selectedSale || saleItems.length === 0) return;

        try {
            setIsGeneratingPdf(true);

            // Reconstruct applied credit
            // subtotal = sum of items
            // discount = 10% if PIX or DINHEIRO
            // appliedCredit = subtotal - discount - total_paid
            const subtotal = saleItems.reduce((acc, item) => acc + (Number(item.preco_unitario) * item.quantidade), 0);
            const isPixOrCash = selectedSale.metodoPagamento === 'PIX' || selectedSale.metodoPagamento === 'DINHEIRO';
            const discount = isPixOrCash ? subtotal * 0.1 : 0;
            const appliedCredit = Math.max(0, subtotal - discount - selectedSale.total);

            // Create a fake sale object for the service
            const saleData = {
                ...selectedSale,
                appliedCredit: appliedCredit
            };

            const pdfBlob = await receiptService.generateReceipt(
                saleData,
                saleItems,
                selectedSale.cliente,
                selectedSale.metodoPagamento
            );

            const url = window.URL.createObjectURL(pdfBlob as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `segunda_via_aurora_${selectedSale.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao gerar segunda via:', err);
            alert('Erro ao gerar PDF do recibo.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">sync</span>
            <p>Carregando histórico e CRM...</p>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <PageHeader
                title="Histórico de Vendas e CRM"
                description="Acompanhe suas vendas e gerencie o relacionamento com seus clientes."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Vendas no Mês" value={stats.totalMonth.toString()} icon="shopping_bag" />
                <StatCard label="Faturamento" value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon="payments" className="!text-primary" />
                <StatCard label="Clientes Ativos" value={stats.activeCustomers.toString()} icon="groups" />
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Filtrar por:</span>
                        <div className="flex gap-2">
                            {['TODOS', 'PIX', 'CARTAO', 'DINHEIRO'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setFilter(m)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === m
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Venda / Data</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor total</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pagamento</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-brand-dark">{sale.id}</div>
                                        <div className="text-[11px] text-gray-400">{sale.data}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {sale.cliente.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-700">{sale.cliente.nome}</div>
                                                <div className="text-[11px] text-gray-400 font-mono">{sale.cliente.cpf}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-700">R$ {sale.total.toFixed(2)}</div>

                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400 text-sm">
                                                {getPaymentIcon(sale.metodoPagamento)}
                                            </span>
                                            <span className="text-[11px] font-semibold text-gray-600 uppercase">
                                                {sale.metodoPagamento}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            label={sale.status.replace('_', ' ')}
                                            variant={
                                                sale.status === 'CONCLUIDA' || sale.status === 'APROVADA' ? 'success' :
                                                    sale.status === 'PENDENTE' ? 'warning' :
                                                        sale.status === 'CANCELADA' ? 'danger' : 'neutral'
                                            }
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 transition-opacity">
                                            <button
                                                onClick={() => openWhatsApp(sale.cliente.whatsapp, sale.cliente.nome)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors border border-emerald-100/50"
                                                title="Enviar WhatsApp"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">chat</span>
                                                <span className="text-[10px] font-bold uppercase tracking-tight">WhatsApp</span>
                                            </button>
                                            <button
                                                onClick={() => handleViewDetails(sale)}
                                                className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/10"
                                                title="Ver Detalhes"
                                            >
                                                <span className="material-symbols-outlined text-lg">receipt</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                        Nenhuma venda encontrada para o filtro selecionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-8">
                <Card title="Aniversariantes do Mês">
                    <div className="space-y-4">
                        {birthdays.map((v) => (
                            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-pink-500">cake</span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-700">{v.nome}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">
                                            {format(new Date(v.data_nascimento), "dd 'de' MMMM", { locale: ptBR })}
                                        </div>
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" className="px-4" onClick={() => openWhatsApp(v.whatsapp, v.nome)}>
                                    Parabenizar
                                </Button>
                            </div>
                        ))}
                        {birthdays.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm italic">Nenhum aniversariante este mês.</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl shadow-2xl scale-in" title={`Detalhes da Venda #${selectedSale.id}`}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-2xl">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</p>
                                    <p className="text-sm font-bold text-brand-dark">{selectedSale.cliente.nome}</p>
                                    <p className="text-[11px] text-gray-500">{selectedSale.cliente.whatsapp}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data / Hora</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedSale.data}</p>
                                    <p className="text-[11px] text-primary font-bold uppercase">{selectedSale.metodoPagamento}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">list_alt</span>
                                    Itens do Pedido
                                </p>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Produto</th>
                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-center">Qtd</th>
                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Preço</th>
                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {loadingItems ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                                            <span className="text-xs text-gray-400">Carregando itens...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                saleItems.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="text-xs font-bold text-gray-700">{item.produto?.nome}</div>
                                                            <div className="text-[10px] text-gray-400">{item.produto?.sku}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-center font-bold text-gray-600">{item.quantidade}</td>
                                                        <td className="px-4 py-3 text-xs text-right text-gray-600">R$ {Number(item.preco_unitario).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-xs text-right font-bold text-brand-dark">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {!loadingItems && (
                                            <tfoot className="bg-gray-50/50">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Total Final</td>
                                                    <td className="px-4 py-3 text-right text-sm font-black text-primary">R$ {selectedSale.total.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setSelectedSale(null)}
                                >
                                    Fechar
                                </Button>
                                <Button
                                    icon="chat"
                                    className="flex-1 !bg-emerald-600"
                                    onClick={() => openWhatsApp(selectedSale.cliente.whatsapp, selectedSale.cliente.nome)}
                                >
                                    Falar com Cliente
                                </Button>
                                <Button
                                    icon="print"
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handlePrintReceipt}
                                    loading={isGeneratingPdf}
                                    disabled={loadingItems}
                                >
                                    Imprimir 2ª Via
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div >
    );
};

export default SalesHistory;
