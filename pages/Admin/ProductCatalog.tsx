import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { User } from '../../types';
import { productService, Product } from '../../services/productService';

const ProductCatalog: React.FC<{ user: User }> = ({ user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [importMode, setImportMode] = useState<'CSV' | 'NFE'>('CSV');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({});

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await productService.getProducts();
            setProducts(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData(product);
        } else {
            setEditingProduct(null);
            setFormData({
                sku: '',
                nome: '',
                categoria: 'Brincos',
                preco: 0,
                custo: 0,
                material: '',
                colecao: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (editingProduct) {
                await productService.updateProduct(editingProduct.id, formData);
            } else {
                await productService.createProduct(formData as Omit<Product, 'id' | 'created_at'>);
            }
            setShowModal(false);
            await loadProducts();
        } catch (err: any) {
            console.error('Full error saving product:', err);
            alert('Erro ao salvar produto: ' + (err.message || JSON.stringify(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Catálogo de Produtos"
                description="Gerencie as mercadorias, SKUs e precificação base da Aurora Folheados."
                extra={
                    <div className="flex gap-3">
                        <Button variant="secondary" icon="upload_file" onClick={() => { setImportMode('CSV'); setShowImportModal(true); }}>Importar Lote</Button>
                        <Button variant="secondary" icon="description" onClick={() => { setImportMode('NFE'); setShowImportModal(true); }}>Processar NF-e</Button>
                        <Button icon="add_box" onClick={() => openModal()}>Novo Produto</Button>
                    </div>
                }
            />

            {/* Quick Stats for Catalog */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="text-center p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Modelos</p>
                    <p className="text-2xl font-black text-brand-dark">{products.length} SKUs</p>
                </Card>
                <Card className="text-center p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Margem Média</p>
                    <p className="text-2xl font-black text-primary">
                        {products.length > 0
                            ? (((products.reduce((acc, p) => acc + (Number(p.preco) / (Number(p.custo) || 1)), 0) / products.length) - 1) * 100).toFixed(0) + '%'
                            : '0%'}
                    </p>
                </Card>
                <Card className="text-center p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Categorias</p>
                    <p className="text-2xl font-black text-brand-dark">
                        {new Set(products.map(p => p.categoria)).size} Ativas
                    </p>
                </Card>
                <Card className="text-center p-4 border-primary/20 bg-primary/5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Custo Total Catálogo</p>
                    <p className="text-2xl font-black text-primary">
                        R$ {products.reduce((acc, p) => acc + (Number(p.custo) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </Card>
            </div>

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar SKU ou nome do produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-80 shadow-sm font-bold"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" icon="refresh" onClick={loadProducts} loading={loading}>Atualizar</Button>
                        <Button size="sm" variant="ghost" icon="download">Baixar Planilha Modelo</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-8 text-center text-red-500 font-bold">
                            <span className="material-symbols-outlined text-4xl mb-2">error</span>
                            <p>{error}</p>
                            <Button variant="ghost" onClick={loadProducts} className="mt-4">Tentar Novamente</Button>
                        </div>
                    )}

                    {!loading && products.length === 0 && !error && (
                        <div className="p-20 text-center text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
                            <p className="text-lg font-black uppercase tracking-widest">Nenhum produto cadastrado</p>
                            <p className="text-sm font-bold">Clique em "Novo Produto" para começar.</p>
                        </div>
                    )}

                    {(products.length > 0 || loading) && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU / Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material / Coleção</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Custo</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Venda</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase tracking-tighter">
                                {filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-brand-dark tracking-tight">{p.sku}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">{p.nome}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[11px] font-black text-brand-dark tracking-tight">{p.material || '-'}</div>
                                            <div className="text-[9px] text-primary font-bold">{p.colecao || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-black px-3 py-1 bg-gray-100 rounded-full text-gray-500">
                                                {p.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-bold text-gray-400">R$ {Number(p.custo).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-primary">R$ {Number(p.preco).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" icon="edit" className="!px-2" onClick={() => openModal(p)}></Button>
                                                <Button size="sm" variant="ghost" icon="delete" className="!px-2 !text-red-400" onClick={() => {
                                                    if (confirm('Deseja realmente excluir este produto?')) {
                                                        productService.deleteProduct(p.id).then(() => loadProducts());
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

            {/* Main Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-2xl w-full animate-in fade-in zoom-in duration-300"
                        title={editingProduct ? "Editar Produto" : "Novo Cadastro de Produto"}
                        headerAction={
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-brand-dark leading-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        }
                    >
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome do Produto</label>
                                        <input
                                            type="text"
                                            value={formData.nome || ''}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            placeholder="Ex: Anel Cravejado Ouro"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-brand-dark"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">SKU</label>
                                            <input
                                                type="text"
                                                value={formData.sku || ''}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                                placeholder="AUR-000"
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-brand-dark uppercase"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Categoria</label>
                                            <select
                                                value={formData.categoria || 'Brincos'}
                                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                            >
                                                <option value="Brincos">Brincos</option>
                                                <option value="Correntes">Correntes</option>
                                                <option value="Pulseiras">Pulseiras</option>
                                                <option value="Anéis">Anéis</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Material</label>
                                        <input
                                            type="text"
                                            value={formData.material || ''}
                                            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                            placeholder="Ex: Prata 925"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Coleção</label>
                                        <input
                                            type="text"
                                            value={formData.colecao || ''}
                                            onChange={(e) => setFormData({ ...formData, colecao: e.target.value })}
                                            placeholder="Ex: Coleção Verão 2026"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Preço de Custo (R$)</label>
                                            <input
                                                type="number"
                                                value={formData.custo || 0}
                                                onChange={(e) => setFormData({ ...formData, custo: Number(e.target.value) })}
                                                placeholder="0,00"
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Preço de Venda (R$)</label>
                                            <input
                                                type="number"
                                                value={formData.preco || 0}
                                                onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                                                placeholder="0,00"
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-black text-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="h-full">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Foto do Produto (URL)</label>
                                        <input
                                            type="text"
                                            value={formData.imagem_url || ''}
                                            onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                                            placeholder="https://..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button fullWidth onClick={handleSave} loading={loading}>
                                    {editingProduct ? "Salvar Alterações" : "Cadastrar no Catálogo"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Import Modal placeholder same as before */}
            {showImportModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-3xl w-full"
                        title={importMode === 'CSV' ? "Importação em Lote (Planilha)" : "Processamento de NF-e (XML)"}
                        headerAction={<button onClick={() => setShowImportModal(false)}>X</button>}
                    >
                        <p className="p-8 text-center text-gray-400">Funcionalidade em desenvolvimento para conexão com Supabase.</p>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ProductCatalog;
