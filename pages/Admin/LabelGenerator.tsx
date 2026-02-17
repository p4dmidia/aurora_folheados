import React, { useState, useEffect } from 'react';
import { productService, Product } from '../../services/productService';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Card from '../../components/Card';

interface SelectedItem extends Product {
  quantity: number;
}

const LabelGenerator: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelFormat, setLabelFormat] = useState('TAG-3CM');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setAllProducts(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (product: Product) => {
    if (selectedItems.find(item => item.id === product.id)) return;
    setSelectedItems([...selectedItems, { ...product, quantity: 20 }]);
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleQuantityChange = (id: string, qty: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === id ? { ...item, quantity: qty } : item
    ));
  };

  const filteredProducts = allProducts.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const totalLabels = selectedItems.reduce((acc, item) => acc + Number(item.quantity), 0);

  const handlePrint = () => {
    window.print();
  };

  // Flatten items for printing (one entry per label)
  const printItems: Product[] = [];
  selectedItems.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      printItems.push(item);
    }
  });

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden bg-background-light">
      {/* Sidebar - Controls */}
      <aside className="w-full lg:w-[400px] bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto print:hidden">
        <div className="p-8 space-y-8">
          <PageHeader
            title="Gerador de Etiquetas"
            description="Configure o lote para impressão."
          />

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none block">1. Selecionar Produtos</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">search</span>
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="SKU ou nome..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Search Results Dropdown */}
              {searchTerm && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                      onClick={() => { handleAddItem(p); setSearchTerm(''); }}
                    >
                      <div className="size-8 rounded bg-gray-100 flex items-center justify-center">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt="" className="size-full object-cover rounded" />
                        ) : (
                          <span className="material-symbols-outlined text-gray-400 text-sm">image</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-dark">{p.nome}</p>
                        <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">{p.sku}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {selectedItems.map((item) => (
                <Card key={item.id} padding="none" className="flex items-center justify-between !rounded-2xl border-gray-100 bg-gray-50/50 overflow-hidden">
                  <div className="p-3 flex items-center gap-3 flex-1 min-w-0">
                    <div className="size-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                      {item.imagem_url ? (
                        <img src={item.imagem_url} alt="" className="size-full object-cover rounded-lg" />
                      ) : (
                        <span className="material-symbols-outlined text-gray-300">image</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-brand-dark truncate pr-2 uppercase italic">{item.nome}</p>
                      <p className="text-[9px] text-gray-400 font-mono flex items-center gap-1 uppercase">
                        <span className="material-symbols-outlined text-[10px]">qr_code_2</span>
                        {item.sku}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-2 border-l border-gray-50">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-xs font-black text-center border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </Card>
              ))}

              {selectedItems.length === 0 && (
                <div className="py-10 text-center space-y-2 opacity-30">
                  <span className="material-symbols-outlined text-4xl">inventory_2</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum produto selecionado</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none block">2. Formato da Folha</label>
            <select
              className="w-full h-12 rounded-xl border-gray-100 bg-gray-50 text-sm font-black text-gray-600 outline-none px-4 focus:ring-1 focus:ring-primary/20 appearance-none bg-[url('https://api.iconify.design/material-symbols:expand-more.svg')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat uppercase"
              value={labelFormat}
              onChange={(e) => setLabelFormat(e.target.value)}
            >
              <option value="TAG-3CM">Tag Semi-Joia (3x3cm - A4)</option>
              <option value="A4-6180">A4 - Pimaco 6180 (20 etiquetas)</option>
              <option value="A4-6182">A4 - Pimaco 6182 (30 etiquetas)</option>
              <option value="THERMAL">Térmica - Zebra 40x25mm</option>
            </select>
          </div>

          <Card className="!bg-primary/5 !border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-primary uppercase mb-1 tracking-tighter">Total de Impressões</p>
              <p className="text-3xl font-black text-brand-dark italic leading-none">{totalLabels} <span className="text-xs uppercase not-italic opacity-30">unid</span></p>
            </div>
            <span className="material-symbols-outlined text-primary text-4xl">print</span>
          </Card>

          <Button variant="brand" size="lg" className="w-full !rounded-2xl shadow-xl shadow-primary/10" disabled={selectedItems.length === 0} onClick={handlePrint}>
            Iniciar Impressão
          </Button>
        </div>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 bg-gray-200 dark:bg-brand-dark/20 p-4 lg:p-10 overflow-y-auto flex flex-col items-center gap-6 print:p-0 print:bg-white print:overflow-visible">
        <div className="print:hidden w-full max-w-[210mm] text-center mb-[-20px]">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest shadow-sm">
            <span className="material-symbols-outlined text-sm animate-pulse text-green-500">visibility</span>
            Visualização de Impressão ({labelFormat})
          </span>
          <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase italic px-10">
            * O formato QR Code foi escolhido por ser mais compacto para joias e legível mesmo se a etiqueta sofrer pequenos danos.
          </p>
        </div>

        {/* The Document Area */}
        <div className={`bg-white shadow-2xl overflow-hidden print:shadow-none print:m-0 ${labelFormat === 'THERMAL' ? 'w-[40mm] h-auto p-2' : 'w-[210mm] min-h-[297mm] p-[10mm]'}`}>

          <div className={`grid gap-x-2 gap-y-4 ${labelFormat === 'A4-6180' ? 'grid-cols-2' :
            labelFormat === 'A4-6182' ? 'grid-cols-3' :
              labelFormat === 'TAG-3CM' ? 'grid-cols-6' : 'grid-cols-1'
            }`}>
            {printItems.map((item, i) => (
              <div key={i} className={`border border-dashed border-gray-100 p-1 flex flex-col items-center justify-between overflow-hidden text-center ${labelFormat === 'THERMAL' ? 'h-[25mm] border-none' :
                labelFormat === 'TAG-3CM' ? 'w-[30mm] h-[30mm] border-gray-200' : 'h-[60mm]'
                }`}>
                <div className="w-full space-y-0.5">
                  <div className="flex flex-col items-center justify-center text-primary leading-tight">
                    <span className="material-symbols-outlined text-[10px] font-black">diamond</span>
                    <span className="text-[6px] font-black uppercase tracking-tighter italic">Aurora Folheados</span>
                  </div>
                  <h4 className="font-black text-brand-dark uppercase tracking-tighter leading-none line-clamp-2 px-1 text-[6px]">
                    {item.nome}
                  </h4>
                </div>

                <div className="flex flex-col items-center gap-0">
                  <div className={`bg-white border border-gray-100 rounded flex items-center justify-center p-0.5 shadow-sm ${labelFormat === 'TAG-3CM' || labelFormat === 'THERMAL' ? 'size-[12mm]' : 'size-[25mm]'}`}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(item.sku)}`}
                      alt="QR Code"
                      className="size-full"
                    />
                  </div>
                  <span className="text-[5px] font-black text-gray-500 font-mono uppercase tracking-widest bg-gray-50 px-0.5 rounded leading-none">{item.sku}</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0 text-center">
                  <p className="text-[10px] font-black text-brand-dark italic leading-none">
                    <span className="text-[6px] not-italic mr-0.5">R$</span>
                    {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[6px] font-black text-primary uppercase tracking-widest leading-none mt-1">Aço Inox</span>
                </div>
              </div>
            ))}

            {/* Filler items to help visualize empty spaces in Pimaco sheets */}
            {labelFormat.startsWith('A4') && printItems.length === 0 && (
              <>
                <div className="h-[60mm] border border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-300 font-black uppercase tracking-widest italic opacity-20">Espaço Reservado</div>
                <div className="h-[60mm] border border-dashed border-gray-100 flex items-center justify-center text-[10px] text-gray-300 font-black uppercase tracking-widest italic opacity-20">Espaço Reservado</div>
              </>
            )}
          </div>
        </div>

        <div className="h-20 print:hidden"></div>
      </main>

      {/* Print Styles */}
      <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: A4 portrait;
                    }
                    body {
                        background: white !important;
                        margin: 0;
                        padding: 0;
                    }
                    main {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 9999 !important;
                    }
                    .print-hidden, aside, nav, header {
                        display: none !important;
                    }
                }
            `}</style>
    </div>
  );
};

export default LabelGenerator;
