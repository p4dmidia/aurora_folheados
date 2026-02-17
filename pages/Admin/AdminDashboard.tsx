import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { dashboardService, DashboardStats } from '../../services/dashboardService';

type Period = 'HOJE' | 'SEMANA' | 'MES' | 'ANO';

const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('MES');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentData, setRecentData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, activity] = await Promise.all([
        dashboardService.getAdminStats(),
        dashboardService.getRecentActivity()
      ]);
      setStats(statsData);
      setRecentData(activity);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    HOJE: 'Hoje',
    SEMANA: 'Esta Semana',
    MES: 'Este Mês',
    ANO: 'Este Ano',
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-20">
      <PageHeader
        title="Painel Geral Administrativo"
        description="Gestão global de faturamento, metas e alertas críticos."
        actions={
          <div className="flex gap-4 items-center">
            <Button size="sm" variant="ghost" icon="refresh" onClick={loadDashboardData} loading={loading}>Atualizar</Button>
            <div className="relative">
              <Button
                variant="secondary"
                icon="calendar_today"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                {periodLabels[period]}
              </Button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#233830] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
                  {(['HOJE', 'SEMANA', 'MES', 'ANO'] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); setIsFilterOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${period === p ? 'bg-primary text-white' : 'text-brand-dark dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
              )}
              {isFilterOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsFilterOpen(false)}></div>}
            </div>
          </div>
        }
      />

      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Faturamento Total"
            value={`R$ ${(stats?.totalNetworkRevenue || 0).toLocaleString('pt-BR')}`}
            trend={{ value: `+12% vs anterior`, type: 'up' }}
          />
          <StatCard
            label="Meta Período"
            value="84%"
            progress={84}
            subtitle="Atingimento parcial"
          />
          <StatCard
            label="Inadimplência"
            value={`R$ ${(stats?.overdueAmount || 0).toLocaleString('pt-BR')}`}
            trend={{ value: 'Atenção necessária', type: 'warning' }}
            className="!text-rose-600"
          />
          <StatCard
            label="PDVs Ativos"
            value={stats?.activePDVs.toString() || '0'}
            trend={{ value: '8 novos este mês', type: 'up' }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card padding="large">
          <h3 className="text-lg font-black mb-8 uppercase tracking-tight">Desempenho de Vendas ({periodLabels[period]})</h3>
          <div className="h-64 bg-gray-50 dark:bg-white/5 rounded-lg flex items-end justify-between p-4 gap-2">
            {[40, 60, 45, 90, 80, 50, 70].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-all rounded-t-sm" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </Card>

        <Card padding="large">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-tight">Alertas Críticos</h3>
            <StatusBadge status="danger">Pendentes</StatusBadge>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-lg border border-rose-100">
              <span className="material-symbols-outlined text-rose-600">inventory_2</span>
              <div>
                <p className="text-sm font-black uppercase">Estoque Baixo</p>
                <p className="text-xs text-gray-500 font-bold">Verifique o inventário central para produtos em níveis críticos.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100">
              <span className="material-symbols-outlined text-amber-600">assignment_late</span>
              <div>
                <p className="text-sm font-black uppercase">Próximas Vistorias</p>
                <p className="text-xs text-gray-500 font-bold">3 PDVs aguardando auditoria de vitrine esta semana.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
