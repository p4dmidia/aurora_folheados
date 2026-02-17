import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { movementService, Movement } from '../../services/movementService';

interface ShipmentItem {
    movement_id: string;
    sku: string;
    nome: string;
    categoria: string;
    qty: number;
    preco: number;
    imagemUrl?: string; // Optional if not in DB join (DB has imagem_url)
}

interface Shipment {
    id: string; // Grouping ID (e.g., Date)
    date: string;
    totalItems: number;
    items: ShipmentItem[];
}

const ReceiveCentralCargo: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [confirmedState, setConfirmedState] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const movements = await movementService.getPendingTransfers(user.id);

            // Group by Date (DD/MM/YYYY)
            const grouped: Record<string, Shipment> = {};

            movements.forEach(m => {
                const date = new Date(m.created_at || new Date()).toLocaleDateString('pt-BR');
                if (!grouped[date]) {
                    grouped[date] = {
                        id: date.replace(/\//g, '-'), // e.g., 30-01-2026
                        date: date,
                        totalItems: 0,
                        items: []
                    };
                }

                // Add item
                // Note: m.produto is joined with *
                const prod = m.produto as any;
                if (prod) {
                    grouped[date].items.push({
                        movement_id: m.id,
                        sku: prod.sku,
                        nome: prod.nome,
                        categoria: prod.categoria || 'Geral',
                        qty: m.quantidade,
                        preco: prod.preco || 0,
                        imagemUrl: prod.imagem_url
                    });
                    grouped[date].totalItems += m.quantidade;
                }
            });

            setShipments(Object.values(grouped));
        } catch (err) {
            console.error('Erro ao carregar recebimentos:', err);
            // alert('Erro ao carregar recebimentos pendentes'); // Supressed as per user request to avoid empty state alerts
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.id]);

    const handleConfirmShipment = async (shipment: Shipment) => {
        try {
            setLoading(true);
            const ids = shipment.items.map(i => i.movement_id);
            await movementService.confirmMovements(ids);
            setConfirmedState(true);
            await loadData();
        } catch (err: any) {
            alert('Erro ao confirmar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (confirmedState && shipments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50/50 min-h-[500px]">
                <Card padding="large" className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                    <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-black text-brand-dark mb-2">Tudo Confirmado!</h2>
                    <p className="text-gray-500 mb-8 text-sm">As peças foram confirmadas e adicionadas oficialmente ao seu estoque.</p>
                    <Button variant="brand" className="w-full" onClick={() => setConfirmedState(false)}>Voltar ao Início</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <PageHeader
                title="Receber Carga Central"
                description="Confirme o recebimento das peças enviadas pela Matriz para sua Maleta."
                extra={<Button variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>}
            />

            {loading && shipments.length === 0 && (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-gray-300 animate-spin">sync</span>
                    <p className="text-gray-400 font-bold mt-2">Carregando recebimentos...</p>
                </div>
            )}

            {!loading && shipments.length === 0 && !confirmedState && (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">inventory_2</span>
                    <h3 className="text-xl font-black text-gray-400">Nenhuma carga pendente</h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto mt-2">Você não possui transferências da central aguardando confirmação no momento.</p>
                </div>
            )}

            {shipments.map((shipment) => (
                <Card key={shipment.id} padding="none" className="overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-brand-dark text-lg">Remessa de {shipment.date}</h3>
                                <StatusBadge label="AGUARDANDO CONFERÊNCIA" variant="warning" />
                            </div>
                            <p className="text-xs text-brand-muted mt-1 font-bold">Verifique os itens abaixo antes de aceitar</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total de Peças</p>
                            <p className="text-2xl font-black text-brand-dark">{shipment.totalItems}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-8 py-4 bg-gray-50/50">Produto</th>
                                    <th className="px-8 py-4 bg-gray-50/50">SKU</th>
                                    <th className="px-8 py-4 bg-gray-50/50 text-center">Qtde</th>
                                    <th className="px-8 py-4 bg-gray-50/50 text-right">Valor Unit.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {shipment.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                                                    {item.imagemUrl ? (
                                                        <img src={item.imagemUrl} alt="" className="size-full object-cover rounded-lg" />
                                                    ) : (
                                                        <span className="material-symbols-outlined">image</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-brand-dark text-sm">{item.nome}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-medium">{item.categoria}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-mono text-gray-500">{item.sku}</td>
                                        <td className="px-8 py-4 text-center font-black text-brand-dark">{item.qty} un</td>
                                        <td className="px-8 py-4 text-right font-bold text-gray-500">R$ {item.preco.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-8 py-8 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-start gap-3 max-w-md">
                            <span className="material-symbols-outlined text-primary">verified_user</span>
                            <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-wide">
                                Ao confirmar, você declara ter conferido fisicamente todas as peças deste lote.
                            </p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Button variant="secondary" icon="report" className="flex-1 md:flex-initial" onClick={() => alert('Entre em contato com a matriz para relatar divergências.')}>Relatar Problema</Button>
                            <Button
                                variant="primary"
                                icon="check_circle"
                                className="flex-1 md:flex-initial"
                                onClick={() => handleConfirmShipment(shipment)}
                                loading={loading}
                            >
                                Confirmar Recebimento
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default ReceiveCentralCargo;
