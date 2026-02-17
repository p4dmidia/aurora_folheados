import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import { User } from '../../types';

interface CommissionTier {
    id: string;
    minRevenue: number;
    percentage: number;
}

const SystemSettings: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'REGRAS' | 'PERMISSÕES' | 'SEGURANÇA'>('REGRAS');

    // --- RULES STATE ---
    const [bonusValue, setBonusValue] = useState(500);
    const [bonusStep, setBonusStep] = useState(10000);
    const [bonusStart, setBonusStart] = useState(100000);
    const [tiers, setTiers] = useState<CommissionTier[]>([
        { id: '1', minRevenue: 0, percentage: 1 },
        { id: '2', minRevenue: 40000, percentage: 2 },
        { id: '3', minRevenue: 60000, percentage: 3 },
        { id: '4', minRevenue: 80000, percentage: 4 },
    ]);
    const [globalGoal, setGlobalGoal] = useState(450000);

    // --- PERMISSIONS STATE ---
    const [permissions, setPermissions] = useState({
        'Administrador': {
            'Dashboard': true,
            'Estoque Central': true,
            'Gestão de PDVs': true,
            'Equipe': true,
            'Relatórios Fiscais': true,
            'Configurações Sistema': true
        },
        'Promotor': {
            'Dashboard': true,
            'Maleta': true,
            'Meus Ganhos': true,
            'Histórico de Vendas': true,
            'Catálogo': true,
            'Clientes': true
        },
        'Parceiro (PDV)': {
            'Estoque Local': true,
            'Vendas': true,
            'Solicitar Reposição': true,
            'Catálogo': true,
            'Perfil Loja': true
        }
    });

    // --- SECURITY STATE ---
    const [activeSessions, setActiveSessions] = useState([
        { id: 'S1', device: 'Chrome on Windows', location: 'São Paulo, BR', lastActive: 'Ativo agora', isCurrent: true },
        { id: 'S2', device: 'Safari on iPhone', location: 'Rio de Janeiro, BR', lastActive: '2 horas atrás', isCurrent: false },
        { id: 'S3', device: 'Firefox on macOS', location: 'Curitiba, BR', lastActive: 'Ontem', isCurrent: false },
    ]);

    // --- HANDLERS ---
    const addTier = () => {
        const lastTier = tiers[tiers.length - 1];
        const newTier: CommissionTier = {
            id: Math.random().toString(36).substr(2, 9),
            minRevenue: lastTier ? lastTier.minRevenue + 20000 : 0,
            percentage: lastTier ? lastTier.percentage + 1 : 1
        };
        setTiers([...tiers, newTier]);
    };

    const updateTier = (id: string, field: keyof CommissionTier, value: number) => {
        setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const removeTier = (id: string) => {
        if (tiers.length > 1) {
            setTiers(tiers.filter(t => t.id !== id));
        }
    };

    const togglePermission = (role: string, module: string) => {
        setPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role as keyof typeof prev],
                [module]: !prev[role as keyof typeof prev][module as keyof (typeof prev)['Administrador']]
            }
        }));
    };

    const handleSave = () => {
        alert('Configurações salvas com sucesso!');
        console.log('Saved data:', { tiers, bonusRules: { bonusValue, bonusStep, bonusStart }, globalGoal, permissions });
    };

    const handleGenerateBackup = () => {
        const backupData = {
            tiers,
            bonusRules: { bonusValue, bonusStep, bonusStart },
            globalGoal,
            permissions,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_aurora_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup gerado e baixado com sucesso!');
    };

    const handleRevokeSession = (id: string) => {
        if (confirm('Deseja realmente encerrar esta sessão?')) {
            setActiveSessions(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleRevokeAllSessions = () => {
        if (confirm('Deseja encerrar todas as outras sessões ativas?')) {
            setActiveSessions(prev => prev.filter(s => s.isCurrent));
            alert('Todas as outras sessões foram revogadas.');
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Configurações de Regras Master"
                description="Gerencie os parâmetros globais do sistema, comissões e regras de bônus."
            />

            <div className="flex gap-4 border-b border-gray-100 pb-px">
                {(['REGRAS', 'PERMISSÕES', 'SEGURANÇA'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'REGRAS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-8">
                        <Card title="Comissões (Bateu, Ganhou)" description="Configure as faixas de faturamento e as respectivas porcentagens de comissão para os promotores.">
                            <div className="space-y-6">
                                {tiers.map((tier, index) => (
                                    <div key={tier.id} className="flex items-end gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-primary/20 transition-all">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Mínimo (R$)</label>
                                            <input
                                                type="number"
                                                value={tier.minRevenue}
                                                onChange={(e) => updateTier(tier.id, 'minRevenue', Number(e.target.value))}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comissão (%)</label>
                                            <input
                                                type="number"
                                                value={tier.percentage}
                                                onChange={(e) => updateTier(tier.id, 'percentage', Number(e.target.value))}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        {index > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                icon="delete"
                                                className="!text-red-400 !px-2 mb-1"
                                                onClick={() => removeTier(tier.id)}
                                            ></Button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="secondary" icon="add" fullWidth onClick={addTier}>Adicionar Nova Faixa</Button>
                            </div>
                        </Card>

                        <Card title="Acelerador (Super Bônus)" description="Configure as regras de premiação por produtividade acima da meta master.">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor do Prêmio (R$)</label>
                                        <input
                                            type="number"
                                            value={bonusValue}
                                            onChange={(e) => setBonusValue(Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">A cada incremento de (R$)</label>
                                        <input
                                            type="number"
                                            value={bonusStep}
                                            onChange={(e) => setBonusStep(Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black text-brand-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta de Início do Bônus (R$)</label>
                                    <input
                                        type="number"
                                        value={bonusStart}
                                        onChange={(e) => setBonusStart(Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black text-brand-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold italic pt-2">
                                    Regra Atual: O promotor ganha R$ {bonusValue},00 extras para cada R$ {bonusStep},00 que vender acima de R$ {bonusStart},00.
                                </p>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Card title="Meta Global da Equipe" description="Defina a meta de faturamento mensal para toda a operação.">
                            <div className="space-y-4 text-center">
                                <div className="text-4xl font-black text-primary tracking-tighter">
                                    {globalGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                                <div className="px-8 pb-4">
                                    <input
                                        type="range"
                                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                        min="100000"
                                        max="2000000"
                                        step="50000"
                                        value={globalGoal}
                                        onChange={(e) => setGlobalGoal(Number(e.target.value))}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 px-12">Esta meta é usada como base para os indicadores de progresso no dashboard administrativo.</p>
                            </div>
                        </Card>

                        <Card title="Registro de Alterações" padding="none">
                            <div className="divide-y divide-gray-50">
                                {[
                                    { user: 'Admin Master', action: 'Alterou Valor do Bônus', date: '29/01/2026 10:45' },
                                    { user: 'Admin Master', action: 'Atualizou Faixa 3 para 4%', date: '15/01/2026 14:20' },
                                ].map((log, i) => (
                                    <div key={i} className="px-6 py-4 flex justify-between items-center transition-colors hover:bg-gray-50/50">
                                        <div>
                                            <p className="text-[11px] font-black text-brand-dark uppercase tracking-tight">{log.action}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{log.user}</p>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-300">{log.date}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-gray-50/50 text-center">
                                <button className="text-[9px] font-black uppercase text-primary tracking-widest">Ver Histórico Completo</button>
                            </div>
                        </Card>

                        <div className="pt-4">
                            <Button variant="primary" fullWidth size="large" icon="save" onClick={handleSave}>Salvar Configurações Globais</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PERMISSÕES' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card title="Gestão de Acessos" description="Defina quais módulos cada perfil tem permissão para visualizar e operar.">
                        <div className="space-y-8 py-4">
                            {Object.entries(permissions).map(([role, modules]) => (
                                <div key={role} className="space-y-4">
                                    <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                                        <span className="material-symbols-outlined text-primary">verified_user</span>
                                        <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest">{role}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Object.entries(modules).map(([module, isEnabled]) => (
                                            <button
                                                key={module}
                                                onClick={() => togglePermission(role, module)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isEnabled
                                                        ? 'bg-primary/5 border-primary/20 text-primary'
                                                        : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
                                                    }`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tight">{module}</span>
                                                <span className="material-symbols-outlined text-lg">
                                                    {isEnabled ? 'toggle_on' : 'toggle_off'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="flex justify-end pt-4">
                        <Button variant="primary" size="large" icon="save" onClick={handleSave}>Salvar Alterações de Permissões</Button>
                    </div>
                </div>
            )}

            {activeTab === 'SEGURANÇA' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card title="Backup de Dados" description="Exporte todas as configurações atuais e parâmetros do sistema para um arquivo de segurança.">
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium leading-relaxed">
                                    O arquivo conterá as regras de comissão, metas, permissões e configurações globais em formato JSON.
                                </p>
                            </div>
                            <Button icon="cloud_download" onClick={handleGenerateBackup} fullWidth variant="secondary">Gerar e Baixar Backup</Button>
                        </div>
                    </Card>

                    <Card title="Sessões Ativas" description="Gerencie os dispositivos que têm acesso à sua conta administrativa.">
                        <div className="space-y-4">
                            <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                                {activeSessions.map((session) => (
                                    <div key={session.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                <span className="material-symbols-outlined text-lg">
                                                    {session.device.includes('iPhone') ? 'smartphone' : 'desktop_windows'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-brand-dark uppercase tracking-tight">
                                                    {session.device} {session.isCurrent && <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded ml-2">ESTE DISPOSITIVO</span>}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{session.location} • {session.lastActive}</p>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
                                            <button
                                                onClick={() => handleRevokeSession(session.id)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">logout</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                icon="lock_open"
                                fullWidth
                                variant="ghost"
                                className="!text-red-500"
                                onClick={handleRevokeAllSessions}
                            >
                                Revogar Todas as Outras Sessões
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SystemSettings;
