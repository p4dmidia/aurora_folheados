import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { movementService } from '../../services/movementService';
import { pdvService } from '../../services/pdvService';
import { commissionService, CommissionReportItem } from '../../services/commissionService';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';

const PromoterDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionReportItem | null>(null);
  const [pdvs, setPdvs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [report, branchPDVs] = await Promise.all([
        commissionService.getCommissionReport(currentMonth, currentYear),
        pdvService.getPromoterPDVs(user.id)
      ]);

      const myStats = report.find(r => r.promoterId === user.id);
      setStats(myStats || null);
      setPdvs(branchPDVs.slice(0, 5));

    } catch (err) {
      console.error('Erro ao carregar dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'COORDENADOR': return 'Coordenador';
      case 'SENIOR': return 'Sênior';
      default: return 'Júnior';
    }
  };

  const totalEarnings = (stats?.commissionGenerated || 0) + (stats?.overridingGenerated || 0);

  return (
    <div className="p-10 max-w-[1400px] mx-auto space-y-8 pb-24">
      <PageHeader
        title="Minha Performance"
        description={`Olá, ${user.nome}. Veja como está sua performance no mês atual.`}
        actions={
          <Link to="/pdvs">
            <button className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg text-sm">
              <span className="material-symbols-outlined">store</span>
              <span>Minha Carteira</span>
            </button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Meu Faturamento"
          value={`R$ ${(stats?.monthlySales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="trending_up"
          className="!text-brand-dark"
        />

        <StatCard
          label="Nível Atual"
          value={getLevelLabel(stats?.level || 'JUNIOR')}
          subtitle={`Taxa Base: ${((stats?.baseRate || 0) * 100).toFixed(1)}%`}
          icon="emoji_events"
          className="!text-primary font-black"
        />

        <StatCard
          label="Giro Médio (Meta 50%)"
          value={`${((stats?.averageTurnover || 0) * 100).toFixed(1)}%`}
          progress={(stats?.averageTurnover || 0) * 100}
          subtitle={stats?.hasTrigger ? 'Meta batida! ✅' : 'Continue vendendo! 🚀'}
          icon="speed"
        />

        <StatCard
          label="Ganhos Previstos"
          value={`R$ ${totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="payments"
          className="bg-primary/5 border border-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card padding="none" className="lg:col-span-2">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-xl uppercase tracking-tighter">Status da Carteira de PDVs</h3>
            <Link to="/pdvs" className="text-sm font-bold text-primary hover:underline uppercase">Gerenciar Todos</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                <p>Carregando dados...</p>
              </div>
            ) : pdvs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <span className="material-symbols-outlined text-3xl mb-2">store_off</span>
                <p className="text-sm font-bold uppercase">Nenhum PDV designado</p>
              </div>
            ) : (
              pdvs.map((pdv, i) => (
                <div key={pdv.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-10 bg-brand-dark text-white rounded-lg flex items-center justify-center font-black text-xs">
                      {pdv.nome_fantasia ? pdv.nome_fantasia[0] : 'L'}
                    </div>
                    <div>
                      <p className="font-black text-brand-dark uppercase tracking-tight">{pdv.nome_fantasia}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{pdv.cidade} - {pdv.estado}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-end">
                    <div className="flex flex-col items-end mr-4">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Estoque local</span>
                      <span className="text-xs font-bold text-brand-dark">R$ {pdv.estoque_valor?.toLocaleString('pt-BR')}</span>
                    </div>
                    <Link to={`/auditoria/${pdv.id}`}>
                      <Button variant="ghost" size="sm" icon="check_circle" className="!text-[10px] font-black uppercase">Auditar</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Resumo de Ganhos" className="bg-brand-dark text-white border-none shadow-2xl">
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Comissão Própria</p>
              <p className="text-2xl font-black">R$ {(stats?.commissionGenerated || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            {stats?.level === 'COORDENADOR' && (
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Overriding Equipe (0.5%)</p>
                <p className="text-2xl font-black">R$ {(stats?.overridingGenerated || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            )}

            <div className="pt-6 border-t border-white/10">
              <div className="flex justify-between items-center mb-8 px-2">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Líquido</span>
                <span className="text-4xl font-black text-primary">R$ {totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <Link to="/minha-performance">
                <Button variant="primary" fullWidth size="lg" className="rounded-2xl">Ver Detalhado</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PromoterDashboard;
