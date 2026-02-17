import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { inventoryService } from '../../services/inventoryService';
import { pdvService } from '../../services/pdvService';

const LocalStock: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [stock, setStock] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        totalValue: 0
    });

    useEffect(() => {
        loadStock();
    }, [user.id]);

    const loadStock = async () => {
        try {
            setLoading(true);
            const pdv = await pdvService.getPDVByPartnerId(user.id);
            if (!pdv) return;

            const items = await inventoryService.getPDVItems(pdv.id);
            setStock(items);

            const totalItems = items.reduce((acc, item) => acc + item.quantidade, 0);
            const totalValue = items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

            setStats({ totalItems, totalValue });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando estoque...</div>;
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <PageHeader
                title="Meu Estoque Local"
                description="Gestão do mostruário sob sua responsabilidade no PDV."
                actions={
                    <Button variant="brand" icon="move_to_inbox" size="sm">Solicitar Reposição</Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Total de Peças"
                    value={stats.totalItems.toString()}
                    icon="inventory_2"
                />
                <StatCard
                    label="Valor em Expositor"
                    value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon="payments"
                    className="!text-primary"
                />
                <StatCard
                    label="Mix de Produtos"
                    value={`${stock.length} SKUs`}
                    icon="category"
                    subtitle="Variedade de modelos no PDV"
                />
            </div>

            <Card padding="none" className="rounded-3xl">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-brand-dark">Peças no Expositor</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-8 py-4">Produto</th>
                                <th className="px-8 py-4">SKU</th>
                                <th className="px-8 py-4 text-center">Quantidade</th>
                                <th className="px-8 py-4 text-right">Preço Unit.</th>
                                <th className="px-8 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stock.map((item, i) => (
                                <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center">
                                                {item.imagemUrl ? (
                                                    <img src={item.imagemUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-gray-300">image</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-brand-dark">{item.nome}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-medium">{item.categoria}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-mono text-gray-500">{item.sku}</td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${item.quantidade <= 3 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-brand-dark'}`}>
                                            {item.quantidade} un
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-medium text-gray-500">R$ {item.preco.toFixed(2)}</td>
                                    <td className="px-8 py-5 text-right font-black text-brand-dark">R$ {(item.preco * item.quantidade).toFixed(2)}</td>
                                </tr>
                            ))}
                            {stock.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 text-sm italic">
                                        Seu estoque está vazio.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <div>
                    <p className="text-sm font-bold text-amber-800">Sincronização em Tempo Real</p>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">Este estoque é atualizado automaticamente a cada venda ou reposição confirmada.</p>
                </div>
            </div>
        </div>
    );
};

export default LocalStock;
