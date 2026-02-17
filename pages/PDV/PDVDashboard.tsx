import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Customer } from '../../types';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import { pdvService, PDV } from '../../services/pdvService';
import { customerService } from '../../services/customerService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Target,
  Gift,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Zap
} from 'lucide-react';

const PDVDashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pdv, setPdv] = useState<PDV | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<Customer[]>([]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const pdvRes = await pdvService.getPDVByPartnerId(user.id);
      setPdv(pdvRes || null);

      if (pdvRes) {
        const [statsRes, trendRes, birthdayRes] = await Promise.all([
          pdvService.getPDVDashboardStats(pdvRes.id),
          pdvService.getDailySalesTrend(pdvRes.id),
          customerService.getBirthdaysOfMonth(new Date().getMonth() + 1)
        ]);

        setStats(statsRes);
        setTrend(trendRes);

        // Filter birthdays for today or this week
        const today = new Date().getUTCDate();
        const todayBirthdays = birthdayRes.filter(c => new Date(c.data_nascimento as string).getUTCDate() === today);
        setBirthdays(todayBirthdays);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium animate-pulse">Preparando seu dashboard...</p>
        </div>
      </div>
    );
  }

  if (!pdv) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center mt-20">
        <Card padding="large" className="rounded-3xl border-dashed border-2">
          <span className="material-symbols-outlined text-6xl text-gray-200">store_off</span>
          <h2 className="text-xl font-bold mt-4 text-brand-dark">Unidade não encontrada</h2>
          <p className="text-gray-500 mt-2 text-sm px-8">Parece que você ainda não está vinculado a um PDV oficial. Contate o suporte da Aurora.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black transition-colors"
          >
            Voltar para Login
          </button>
        </Card>
      </div>
    );
  }

  const commissionRate = stats?.commissionRate || 0.3;
  const TOTAL_KIT = 72;
  const piecesSold = stats?.piecesSoldInCycle || 0;
  const goalPercentage = Math.min(100, (piecesSold / TOTAL_KIT) * 100);

  // Gauge data
  const gaugeData = [
    { value: piecesSold, fill: '#D4AF37' },
    { value: Math.max(0, TOTAL_KIT - piecesSold), fill: '#F3F4F6' }
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header / Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Clock size={16} />
            <span className="text-xs uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-brand-dark tracking-tight">
            {getGreeting()}, <span className="text-primary">{user.nome.split(' ')[0]}!</span>
          </h1>
          <p className="text-gray-400 font-medium">{pdv.nome_fantasia} • {pdv.cidade}/{pdv.estado}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/venda-rapida')}
            className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-lg active:scale-95 group"
          >
            <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics & Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Performance */}
        <Card className="flex flex-col justify-between p-8 bg-gradient-to-br from-brand-dark to-black text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-colors"></div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-1">Ganhos de Hoje</p>
              <h2 className="text-4xl font-black">R$ {(stats?.todaySalesValue * commissionRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              <p className="text-xs text-white/40 mt-1 font-medium">Refere-se à sua comissão de {(commissionRate * 100).toFixed(0)}%</p>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">Vendas Brutas</p>
                <p className="font-bold">R$ {stats?.todaySalesValue.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-white/40 uppercase">Items Vendidos</p>
                <p className="font-bold">{stats?.todaySalesCount} un</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Sales Chart */}
        <Card className="lg:col-span-2 p-6 md:p-8 rounded-3xl border-gray-100 shadow-sm relative group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-brand-dark">Tendência das Vendas</h3>
              <p className="text-xs text-gray-400 font-medium">Histórico dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
              <TrendingUp size={12} />
              Desempenho Semanal
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    background: '#fff',
                    padding: '12px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 6, 6]}
                  barSize={32}
                >
                  {trend.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === trend.length - 1 ? '#D4AF37' : '#111827'}
                      fillOpacity={index === trend.length - 1 ? 1 : 0.05 + (index * 0.1)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Gauge */}
        <Card className="p-8 rounded-3xl border-gray-100 shadow-sm overflow-hidden relative group">
          <div className="flex items-start justify-between">
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-xl font-black text-brand-dark">Meta de Comissão</h3>
                <p className="text-xs text-gray-400 font-medium italic">Gire o estoque para ganhar mais!</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase">
                    <span className="text-gray-400">Progresso do Ciclo</span>
                    <span className="text-primary font-black">{goalPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                      style={{ width: `${goalPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Package size={14} className="text-primary" />
                      <p className="text-[10px] font-black text-gray-400 uppercase">Vendidas</p>
                    </div>
                    <p className="text-xl font-black text-brand-dark">{piecesSold} <span className="text-xs text-gray-300">/ {TOTAL_KIT}</span></p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className="text-emerald-600" />
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Comissão Atual</p>
                    </div>
                    <p className="text-xl font-black text-emerald-700">{(commissionRate * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 font-medium">
                  {piecesSold < 51
                    ? `Faltam ${51 - piecesSold} peças para subir sua comissão para 35%!`
                    : piecesSold < 65
                      ? `Extraordinário! Faltam ${65 - piecesSold} peças para chegar aos 40%!`
                      : "Parabéns! Você atingiu a comissão máxima de 40%!"}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center p-4">
              <div className="size-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={180}
                      endAngle={0}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-center">
                  <p className="text-2xl font-black text-brand-dark leading-none">{piecesSold}</p>
                  <p className="text-[8px] font-black text-gray-400 uppercase mt-1">Peças</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Rapid CRM/Birthdays */}
        <Card className="p-8 rounded-3xl border-gray-200 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                <Gift size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-dark">Conquiste Clientes</h3>
                <p className="text-xs text-gray-400 font-medium">Aniversariantes de hoje no seu PDV</p>
              </div>
            </div>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-full font-black">HOJE</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar mb-6">
            {birthdays.length > 0 ? (
              birthdays.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-rose-200 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-white rounded-full flex items-center justify-center text-xs font-black text-rose-400 shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-colors uppercase">
                      {c.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-dark">{c.nome}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{c.whatsapp}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="text-gray-300 group-hover:text-rose-500 transition-colors" size={16} />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-sm text-gray-300 italic">Nenhum aniversariante hoje.</p>
                <p className="text-xs text-gray-400 mt-1">Que tal entrar em contato com suas melhores clientes?</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/historico-vendas')}
            className="w-full flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest bg-primary/5 py-4 rounded-2xl hover:bg-primary/10 transition-all border border-primary/10"
          >
            Ver Lista Completa
            <ChevronRight size={14} />
          </button>
        </Card>
      </div>

      {/* Bottom Info/Support */}
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 gap-4">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="size-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-dark">Estoque Sempre Ativo</p>
            <p className="text-xs text-gray-400 font-medium">Suas reposições são prioridade para mantermos o seu desempenho.</p>
          </div>
        </div>
        <button className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-brand-dark transition-colors">Precisa de Ajuda?</button>
      </div>
    </div>
  );
};

export default PDVDashboard;
