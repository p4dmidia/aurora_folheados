import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { movementService, Movement } from '../../services/movementService';
import { pdvService, PDV } from '../../services/pdvService';

const ConfirmDelivery: React.FC<{ user: User }> = ({ user }) => {
    const navigate = useNavigate();
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pdv, setPdv] = useState<PDV | null>(null);
    const [pendingMovements, setPendingMovements] = useState<Movement[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const pdvRes = await pdvService.getPDVByPartnerId(user.id);
            setPdv(pdvRes || null);

            if (pdvRes) {
                const movements = await movementService.getPendingTransfers(pdvRes.id);
                setPendingMovements(movements || []);
            }
        } catch (err) {
            console.error('Error loading delivery data:', err);
            // Error typically handled by keeping states empty/null
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!pendingMovements.length) return;

        try {
            setIsProcessing(true);
            const ids = pendingMovements.map(m => m.id);
            await movementService.confirmMovements(ids);
            setConfirmed(true);
        } catch (err: any) {
            console.error('Error confirming:', err);
            alert('Erro ao confirmar recebimento: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
            </div>
        );
    }

    if (!pdv) {
        return (
            <div className="p-8 max-w-lg mx-auto text-center mt-20">
                <Card padding="large">
                    <span className="material-symbols-outlined text-6xl text-gray-200">store_off</span>
                    <h2 className="text-xl font-bold mt-4 text-brand-dark">Nenhum PDV Vinculado</h2>
                    <p className="text-gray-500 mt-2 text-sm">Contate o suporte para vincular seu usuário a um PDV.</p>
                    <Button variant="secondary" className="mt-8 w-full" onClick={() => navigate('/')}>Voltar</Button>
                </Card>
            </div>
        );
    }

    if (confirmed) {
        return (
            <div className="p-8 max-w-lg mx-auto text-center mt-20">
                <Card padding="large" className="scale-in shadow-2xl">
                    <div className="size-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-5xl">verified</span>
                    </div>
                    <h2 className="text-2xl font-black text-brand-dark mb-2">Carga Confirmada!</h2>
                    <p className="text-gray-500 mb-8 text-sm">O estoque local do seu PDV foi atualizado com sucesso.</p>
                    <Button variant="brand" className="w-full" onClick={() => navigate('/estoque-local')}>Ver Meu Estoque</Button>
                </Card>
            </div>
        );
    }

    if (pendingMovements.length === 0) {
        return (
            <div className="p-8 max-w-lg mx-auto text-center mt-20">
                <Card padding="large" className="bg-gray-50/50 border-dashed border-2 border-gray-200 shadow-none">
                    <div className="size-20 bg-white text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <span className="material-symbols-outlined text-5xl">inventory_2</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-400">Sem Reposições Pendentes</h2>
                    <p className="text-gray-400 mt-2 mb-8 text-sm italic">Não há cargas aguardando sua conferência.</p>
                    <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>Voltar</Button>
                </Card>
            </div>
        );
    }

    const senderName = (pendingMovements[0] as any).origem_usuario?.nome || 'Seu Promotor';

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-32">
            <PageHeader
                title="Confirmar Reposição"
                description="Verifique os itens entregues antes de aceitar a entrada no seu estoque."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card padding="none" className="overflow-hidden shadow-sm border-gray-100">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-brand-dark">Conferência de Carga</h3>
                                <p className="text-xs text-gray-400 font-medium">Enviada por: <span className="text-primary font-bold">{senderName}</span></p>
                            </div>
                            <StatusBadge label="Pendente" variant="warning" />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/30 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <th className="px-8 py-4">Produto</th>
                                        <th className="px-8 py-4 text-center">Quantidade</th>
                                        <th className="px-8 py-4 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pendingMovements.map((move) => (
                                        <tr key={move.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    {move.produto?.imagem_url ? (
                                                        <img src={move.produto.imagem_url} alt="" className="size-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="size-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300">
                                                            <span className="material-symbols-outlined text-xl">image</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-brand-dark">{move.produto?.nome}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">SKU: {move.produto?.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center font-black text-brand-dark">
                                                {move.quantidade}
                                            </td>
                                            <td className="px-8 py-5 text-right font-bold text-sm text-gray-600">
                                                R$ {((move.produto?.preco || 0) * move.quantidade).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50/30">
                                    <tr>
                                        <td colSpan={2} className="px-8 py-4 text-right text-[10px] font-bold text-gray-400 uppercase">Total da Carga</td>
                                        <td className="px-8 py-4 text-right font-black text-lg text-primary">
                                            R$ {pendingMovements.reduce((acc, curr) => acc + ((curr.produto?.preco || 0) * curr.quantidade), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card padding="large" className="bg-brand-dark text-white border-none shadow-xl">
                        <h4 className="text-lg font-bold mb-4">Atenção Parceiro!</h4>
                        <p className="text-sm text-white/70 leading-relaxed mb-8">
                            Ao confirmar, você assume a responsabilidade financeira por estas peças.
                            **Conte fisicamente cada item antes de confirmar.**
                        </p>
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full !bg-primary !text-brand-dark font-black"
                            onClick={handleConfirm}
                            loading={isProcessing}
                        >
                            Confirmar Carga
                        </Button>
                    </Card>

                    <Card padding="small" className="bg-amber-50 border border-amber-100 flex gap-4">
                        <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-amber-600 text-xl">report</span>
                        </div>
                        <div>
                            <p className="text-[11px] text-amber-900 font-bold uppercase tracking-tight mb-1">Divergência?</p>
                            <p className="text-[10px] text-amber-700 font-medium leading-tight">
                                Se as quantidades não conferirem, não confirme a carga e chame seu promotor.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDelivery;
