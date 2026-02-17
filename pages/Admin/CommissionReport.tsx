import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { commissionService, CommissionReportItem } from '../../services/commissionService';
import { TrendingUp, Users, Award, ShieldCheck, AlertCircle } from 'lucide-react';

const CommissionReport: React.FC = () => {
  const [report, setReport] = useState<CommissionReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await commissionService.getCommissionReport(currentMonth, currentYear);
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (p: CommissionReportItem) => {
    try {
      setLoading(true);
      const totalToPay = p.commissionGenerated + p.overridingGenerated;
      await commissionService.authorizePayment(p.promoterId, currentMonth, currentYear, totalToPay);
      await loadData();
    } catch (error: any) {
      alert('Erro ao autorizar pagamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCommissions = report.reduce((acc, p) => acc + p.commissionGenerated + p.overridingGenerated, 0);
  const totalSales = report.reduce((acc, p) => acc + p.monthlySales, 0);
  const avgTurnover = report.length > 0
    ? (report.reduce((acc, p) => acc + p.averageTurnover, 0) / report.length) * 100
    : 0;

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'COORDENADOR': return <StatusBadge label="Coordenador" variant="info" />;
      case 'SENIOR': return <StatusBadge label="Sênior" variant="success" />;
      default: return <StatusBadge label="Júnior" variant="default" />;
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
      <PageHeader
        title="Gestão de Comissões"
        description="Relatório de performance baseado em níveis (Júnior, Sênior e Coordenador) e Giro Médio."
        extra={
          <div className="flex gap-2">
            <Button variant="ghost" icon="refresh" onClick={loadData} loading={loading}>Atualizar</Button>
            <Button variant="brand" icon="download" size="sm">Exportar</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard
          label="Faturamento Total"
          value={totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon="trending_up"
        />
        <StatCard
          label="Comissões a Pagar"
          value={totalCommissions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon="payments"
          className="bg-brand-dark !text-white"
        />
        <StatCard
          label="Giro Médio da Rede"
          value={`${avgTurnover.toFixed(1)}%`}
          icon="star"
        />
      </div>

      <Card padding="none" className="rounded-[2rem] overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-6 py-5">Promotor / Nível</th>
                <th className="px-6 py-5">Faturamento</th>
                <th className="px-6 py-5 text-center">Giro Médio</th>
                <th className="px-6 py-5 text-right">Comissão Própria</th>
                <th className="px-6 py-5 text-right">Overriding</th>
                <th className="px-6 py-5 text-right">Total</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 uppercase tracking-tighter">
              {report.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center text-gray-400 font-bold">Nenhum dado encontrado</td>
                </tr>
              )}
              {report.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-brand-dark text-sm">{p.promoterName}</span>
                      <div className="flex gap-1">{getLevelBadge(p.level)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-500">R$ {p.monthlySales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{p.activePDVs} PDVs ativos</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className={`text-xs font-black ${p.hasTrigger || p.level !== 'JUNIOR' ? 'text-emerald-600' : 'text-rose-500 flex flex-col items-center'}`}>
                      {(p.averageTurnover * 100).toFixed(1)}%
                      {!p.hasTrigger && p.level === 'JUNIOR' && (
                        <span className="text-[8px] uppercase tracking-tighter">Abaixo da meta 50%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-brand-dark">R$ {p.commissionGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-gray-400">Taxa: {(p.baseRate * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${p.overridingGenerated > 0 ? 'text-primary' : 'text-gray-300'}`}>
                        R$ {p.overridingGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {p.teamSales > 0 && <span className="text-[9px] text-gray-400">0.5% s/ R$ {p.teamSales.toLocaleString('pt-BR')}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-brand-dark">
                    R$ {(p.commissionGenerated + p.overridingGenerated).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <StatusBadge
                      label={p.status === 'PAGO' ? 'PAGO' : 'PENDENTE'}
                      variant={p.status === 'PAGO' ? 'success' : 'warning'}
                    />
                  </td>
                  <td className="px-6 py-5 text-right">
                    {p.status === 'PENDENTE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="uppercase !text-[10px] font-black hover:bg-primary/10"
                        onClick={() => handleAuthorize(p)}
                      >
                        Autorizar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-primary/5 p-8 rounded-3xl border border-primary/20">
          <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest mb-6 flex items-center gap-2">
            <Award size={16} />
            Diretrizes de Crescimento Aurora
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="small" className="bg-white/70 border-none shadow-sm">
              <p className="text-[10px] font-black text-primary uppercase mb-2">Nível 1: Júnior</p>
              <ul className="text-[10px] space-y-1 font-bold text-gray-500">
                <li>• Comissão de 1%</li>
                <li className="text-rose-500">• Gatilho: Giro Médio &gt; 50%</li>
                <li>• Foco: Pontos de Qualidade</li>
              </ul>
            </Card>
            <Card padding="small" className="bg-white/70 border-none shadow-sm">
              <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Nível 2: Sênior</p>
              <ul className="text-[10px] space-y-1 font-bold text-gray-500">
                <li>• Requisito: &gt; 20 PDVs</li>
                <li>• Comissão: 1.5% a 2%</li>
                <li className="text-emerald-600">• Bônus extra se Giro &gt; 75%</li>
              </ul>
            </Card>
            <Card padding="small" className="bg-white/70 border-none shadow-sm">
              <p className="text-[10px] font-black text-brand-dark uppercase mb-2">Nível 3: Coordenador</p>
              <ul className="text-[10px] space-y-1 font-bold text-gray-500">
                <li>• Salário Fixo Maior</li>
                <li>• 1% sobre carteira Própria</li>
                <li className="text-primary">• 0.5% Overriding s/ Equipe</li>
              </ul>
            </Card>
          </div>
        </div>

        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-gray-400" />
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">O que é Giro Médio?</h4>
          </div>
          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            É a média de peças vendidas por PDV em relação ao kit padrão de 72 peças.
            Exemplo: Se o PDV vendeu 36 peças, o giro dele é 50%.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommissionReport;
