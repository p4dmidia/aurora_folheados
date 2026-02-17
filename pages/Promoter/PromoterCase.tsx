
import React from 'react';
import { MOCK_PRODUCTS } from '../../mockData';
import { User } from '../../types';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';

const PromoterCase: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="bg-white dark:bg-accent-dark/40 border-b border-gray-100 px-8 flex items-center justify-between shrink-0 h-20">
        <div className="flex items-center gap-8">
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Minha Maleta (Custódia)</h2>
          <div className="h-8 w-px bg-gray-200"></div>
          <p className="text-sm font-medium text-gray-500">Região: {user.region}</p>
        </div>
        <Button size="sm" icon="add">Solicitar Carga Central</Button>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Peças sob Custódia"
            value="1.420"
            icon="inventory_2"
          />
          <StatCard
            label="Valor em Maleta"
            value="R$ 28.450,00"
            icon="payments"
            className="!text-brand-dark"
          />
          <StatCard
            label="Cargas em Trânsito"
            value="02"
            icon="local_shipping"
            className="bg-brand-dark !text-white"
          />
        </div>

        <Card padding="none" className="rounded-3xl">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-brand-dark">Inventário da Maleta Atual</h3>
            <Button variant="secondary" size="sm">Exportar PDF</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quantidade</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Total</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_PRODUCTS.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={p.imagemUrl} alt="" className="size-12 rounded-lg object-cover border border-gray-100" />
                        <div>
                          <p className="text-sm font-bold text-brand-dark">{p.nome}</p>
                          <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-black text-brand-dark">12 un</span>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-sm">
                      R$ {(p.preco * 12).toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Button variant="primary" size="sm" className="bg-primary/10 hover:bg-primary hover:text-white uppercase !text-[10px]">
                        Enviar para PDV
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PromoterCase;
