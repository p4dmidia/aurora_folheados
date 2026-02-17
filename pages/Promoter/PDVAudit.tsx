import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { inventoryService } from '../../services/inventoryService';
import { movementService } from '../../services/movementService';

interface AuditItem {
    id: string;
    sku: string;
    nome: string;
    imagemUrl?: string;
    preco: number;
    systemQty: number;   // What DB says
    physicalQty: number; // What user counts
}

interface ReplenishItem {
    id: string; // Product ID
    sku: string;
    nome: string;
    imagemUrl?: string;
    briefcaseQty: number; // Promoter stock
    addQty: number;       // To transfer
}

const PDVAudit: React.FC<{ user: User }> = ({ user }) => {
    const { pdvId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [replenishItems, setReplenishItems] = useState<ReplenishItem[]>([]);

    useEffect(() => {
        if (!pdvId) return;
        loadData();
    }, [pdvId, user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pdvStock, promoterStock] = await Promise.all([
                inventoryService.getPDVItems(pdvId!),
                inventoryService.getPromoterItems(user.id)
            ]);

            // Map System Stock
            setAuditItems(pdvStock.map((item: any) => ({
                id: item.id,
                sku: item.sku,
                nome: item.nome,
                imagemUrl: item.imagemUrl,
                preco: item.preco,
                systemQty: item.quantidade,
                physicalQty: item.quantidade // Default to system count (user adjusts)
            })));

            // Map Promoter Stock for Replenishment
            setReplenishItems(promoterStock.map((item: any) => ({
                id: item.id,
                sku: item.sku,
                nome: item.nome,
                imagemUrl: item.imagemUrl,
                briefcaseQty: item.quantidade,
                addQty: 0
            })));

        } catch (err) {
            console.error(err);
            alert('Erro ao carregar dados da auditoria');
        } finally {
            setLoading(false);
        }
    };

    const handleAuditChange = (id: string, val: number) => {
        setAuditItems(prev => prev.map(item => item.id === id ? { ...item, physicalQty: val } : item));
    };

    const handleReplenishChange = (id: string, val: number) => {
        setReplenishItems(prev => prev.map(item => item.id === id ? { ...item, addQty: val } : item));
    };

    const handleFinalize = async () => {
        if (!pdvId) return;
        try {
            setSubmitting(true);

            // 1. Process Sales (Audit Differences)
            // If System > Physical => Sold
            const salesMovements = auditItems
                .filter(i => i.systemQty > i.physicalQty)
                .map(i => ({
                    produto_id: i.id,
                    quantidade: i.systemQty - i.physicalQty, // Sold Qty
                    origem_tipo: 'PDV',
                    origem_id: pdvId,
                    destino_tipo: 'VENDA',
                    usuario_id: user.id,
                    tipo: 'VENDA'
                }));

            // Adjustments (If Physical > System - unexpected found items)
            // We'll treat this as 'AJUSTE' adding to PDV
            const foundMovements = auditItems
                .filter(i => i.physicalQty > i.systemQty)
                .map(i => ({
                    produto_id: i.id,
                    quantidade: i.physicalQty - i.systemQty,
                    destino_tipo: 'PDV',
                    destino_id: pdvId,
                    usuario_id: user.id,
                    tipo: 'AJUSTE'
                }));

            // 2. Process Replenishment (Transfer Promoter -> PDV)
            const replenishMovements = replenishItems
                .filter(i => i.addQty > 0)
                .map(i => ({
                    produto_id: i.id,
                    quantidade: i.addQty,
                    origem_tipo: 'PROMOTOR' as const,
                    origem_id: user.id,
                    destino_tipo: 'PDV' as const,
                    destino_id: pdvId,
                    usuario_id: user.id,
                    tipo: 'TRANSFERENCIA' as const,
                    confirmed_at: new Date().toISOString()
                }));

            // Execute Movements Log (Trigger handles stock updates)
            const allMovements = [
                ...salesMovements.map(m => ({ ...m, confirmed_at: new Date().toISOString() })),
                ...foundMovements.map(m => ({ ...m, confirmed_at: new Date().toISOString() })),
                ...replenishMovements
            ];

            for (const m of allMovements) {
                await movementService.createMovement(m as any);
            }

            alert('Auditoria Finalizada com Sucesso!');
            navigate('/pdvs');

        } catch (err: any) {
            console.error(err);
            alert('Erro ao finalizar: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Totals
    const totalSold = auditItems.reduce((acc, item) => acc + Math.max(0, item.systemQty - item.physicalQty), 0);
    const totalReplenished = replenishItems.reduce((acc, item) => acc + item.addQty, 0);
    const totalValueSold = auditItems.reduce((acc, item) => acc + (Math.max(0, item.systemQty - item.physicalQty) * item.preco), 0);


    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando dados da auditoria...</div>;
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <div className="flex items-center gap-4 text-gray-400 mb-2">
                <button onClick={() => navigate('/pdvs')} className="hover:text-brand-dark flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Gestão de PDVs
                </button>
            </div>

            <PageHeader
                title="Auditoria de Visita"
                description="Realize a conferência física e reposição de estoque do PDV."
                actions={
                    <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl border border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passo atual</span>
                            <span className="text-sm font-black text-brand-dark">
                                {step === 1 ? '1. Conferência Física' : step === 2 ? '2. Reposição de Peças' : '3. Resumo de Fechamento'}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-1.5 w-8 rounded-full ${s <= step ? 'bg-primary' : 'bg-gray-100'}`}></div>
                            ))}
                        </div>
                    </div>
                }
            />

            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                        <span className="material-symbols-outlined text-amber-600">qr_code_scanner</span>
                        <div>
                            <p className="text-sm font-bold text-amber-800">Instruções de Conferência</p>
                            <p className="text-xs text-amber-700 leading-relaxed font-medium">Contagem física de todas as peças no mostruário. A diferença entre o saldo do sistema e sua contagem será registrada como **Venda Realizada**.</p>
                        </div>
                    </div>

                    <Card padding="none" className="overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-8 py-4">Produto</th>
                                    <th className="px-8 py-4 text-center">Saldo Sistema</th>
                                    <th className="px-8 py-4 text-center">Contagem Física</th>
                                    <th className="px-8 py-4 text-right">Diferença</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {auditItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                    {item.imagemUrl ? <img src={item.imagemUrl} className="size-full object-cover rounded-lg" /> : <span className="material-symbols-outlined text-gray-300">image</span>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-dark">{item.nome}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono italic">{item.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-gray-400">{item.systemQty} un</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => handleAuditChange(item.id, Math.max(0, item.physicalQty - 1))} className="size-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">-</button>
                                                <input
                                                    type="number"
                                                    className="w-12 text-center font-black text-brand-dark border-none bg-transparent"
                                                    value={item.physicalQty}
                                                    onChange={(e) => handleAuditChange(item.id, parseInt(e.target.value) || 0)}
                                                />
                                                <button onClick={() => handleAuditChange(item.id, item.physicalQty + 1)} className="size-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">+</button>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <StatusBadge
                                                label={`${item.systemQty - item.physicalQty > 0 ? '-' : '+'}${Math.abs(item.systemQty - item.physicalQty)} UN`}
                                                variant={item.systemQty === item.physicalQty ? 'neutral' : item.systemQty > item.physicalQty ? 'success' : 'error'}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <div className="flex justify-end">
                        <Button variant="primary" size="lg" icon="arrow_forward" onClick={() => setStep(2)}>Confirmar e Repor Estoque</Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-start gap-4">
                        <span className="material-symbols-outlined text-primary">inventory_2</span>
                        <div>
                            <p className="text-sm font-bold text-brand-dark">Minha Maleta (Disponível)</p>
                            <p className="text-xs text-primary font-medium tracking-wide">Selecione as peças que você está transferindo da sua maleta para o PDV.</p>
                        </div>
                    </div>

                    <Card padding="none" className="overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-8 py-4">Produto</th>
                                    <th className="px-8 py-4 text-center">Saldo Maleta</th>
                                    <th className="px-8 py-4 text-center">Adicionar ao PDV</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {replenishItems.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center py-8 text-gray-400">Maleta vazia</td></tr>
                                ) : (
                                    replenishItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                        {item.imagemUrl ? <img src={item.imagemUrl} className="size-full object-cover rounded-lg" /> : <span className="material-symbols-outlined text-gray-300">image</span>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-brand-dark">{item.nome}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono italic">{item.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-gray-400">{item.briefcaseQty} un</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => handleReplenishChange(item.id, Math.max(0, item.addQty - 1))} className="size-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">-</button>
                                                    <input
                                                        type="number"
                                                        className="w-12 text-center font-black text-brand-dark border-none bg-transparent"
                                                        value={item.addQty}
                                                        onChange={(e) => handleReplenishChange(item.id, parseInt(e.target.value) || 0)}
                                                    />
                                                    <button onClick={() => handleReplenishChange(item.id, Math.min(item.briefcaseQty, item.addQty + 1))} className="size-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">+</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Card>

                    <div className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => setStep(1)}>Voltar Conferência</Button>
                        <Button variant="primary" size="lg" icon="check_circle" onClick={() => setStep(3)}>Relatório de Fechamento</Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Total Vendido" value={`${totalSold} un`} trend={{ value: 'Acerto de 30 dias', type: 'info' }} />
                        <StatCard label="Valor p/ Acerto" value={`R$ ${totalValueSold.toFixed(2)}`} className="!text-brand-dark" />
                        <StatCard label="Peças Repostas" value={`${totalReplenished} un`} icon="local_shipping" />
                        <StatCard label="Novo Saldo PDV" value={`${auditItems.reduce((acc, i) => acc + i.physicalQty, 0) + totalReplenished} un`} className="!text-primary" />
                    </div>

                    <Card padding="large" className="text-center py-16 space-y-6">
                        <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                            <span className="material-symbols-outlined text-6xl">verified</span>
                        </div>
                        <div className="max-w-md mx-auto">
                            <h3 className="text-2xl font-black text-brand-dark uppercase">Conferência Pronta!</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Ao clicar em finalizar, o saldo da sua maleta será atualizado e o PDV terá o estoque renovado. O financeiro será notificado das vendas totais de R$ {totalValueSold.toFixed(2)}.
                            </p>
                        </div>
                        <div className="pt-8 max-w-sm mx-auto space-y-3">
                            <Button variant="brand" size="lg" className="w-full" onClick={handleFinalize} loading={submitting}>Finalizar e Salvar</Button>
                            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(2)}>Revisar Reposição</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PDVAudit;
