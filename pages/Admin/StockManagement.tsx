
import React from 'react';
import { MOCK_PRODUCTS } from '../../mockData';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Card from '../../components/Card';

const StockManagement: React.FC = () => {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Gestão de Estoque Central"
        description="Administre a entrada, saída e custódia global de produtos."
        actions={
          <>
            <Button variant="brand" icon="add_circle">Cadastrar Produto</Button>
            <Button icon="local_shipping">Emitir Carga (Maleta)</Button>
          </>
        }
      />

      <Card padding="none" className="rounded-[2rem]">
        <div className="px-8 py-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-brand-dark text-xl font-bold">Catálogo Central</h3>
          <div className="flex gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
              <input className="pl-9 pr-4 py-2 text-xs rounded-lg border-gray-200 bg-gray-50 focus:ring-primary w-64" placeholder="Buscar por SKU ou Nome..." type="text" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-4">Produto</th>
                <th className="px-8 py-4">SKU</th>
                <th className="px-8 py-4">Estoque Central</th>
                <th className="px-8 py-4">Em Custódia</th>
                <th className="px-8 py-4 text-right">Preço</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_PRODUCTS.map((product, i) => (
                <tr key={i} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-100">
                        <img src={product.imagemUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-brand-dark">{product.nome}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">{product.categoria}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-mono text-gray-500">{product.sku}</td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-brand-dark">450 un</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-primary">124 un</span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-brand-dark">R$ {product.preco.toFixed(2)}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-gray-300 hover:text-brand-dark">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-gray-50/30 border-t border-gray-100 flex justify-between items-center">
          <p className="text-xs text-gray-400">Mostrando {MOCK_PRODUCTS.length} de 1,240 produtos</p>
          <div className="flex gap-2">
            <button className="size-8 rounded border border-gray-200 flex items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="size-8 rounded bg-primary text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/20">1</button>
            <button className="size-8 rounded border border-gray-200 flex items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StockManagement;
