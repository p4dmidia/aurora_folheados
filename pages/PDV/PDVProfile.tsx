import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import { User } from '../../types';

const PDVProfile: React.FC<{ user: User }> = ({ user }) => {
    const openWhatsApp = (phone: string) => {
        window.open(`https://wa.me/${phone}`, '_blank');
    };

    return (
        <div className="p-8 max-w-[1000px] mx-auto space-y-8">
            <PageHeader
                title="Meu Perfil"
                description="Gerencie suas informações de conta e encontre suporte rápido."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="text-center py-10 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-primary/10 -z-10 group-hover:h-32 transition-all duration-500"></div>
                        <div className="w-24 h-24 rounded-full bg-white border-4 border-primary/20 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg">
                            <span className="material-symbols-outlined text-5xl text-primary">person</span>
                        </div>
                        <h2 className="text-xl font-black text-brand-dark">{user.nome}</h2>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{user.role}</p>
                        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 gap-4 text-left">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                                <p className="text-sm font-semibold text-gray-700 truncate">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID de Membro</p>
                                <p className="text-sm font-mono font-bold text-gray-700">#AF-{user.id.substring(0, 8)}</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Supporte Direto" className="border-2 border-primary/10">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">support_agent</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-dark">Seu Promotor</p>
                                        <p className="text-[11px] text-gray-500 font-semibold">Ricardo Almeida</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    fullWidth
                                    icon="chat"
                                    className="bg-green-600 border-none hover:bg-green-700"
                                    onClick={() => openWhatsApp('5511999999999')}
                                >
                                    WhatsApp Promotor
                                </Button>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-dark/10 flex items-center justify-center text-brand-dark">
                                        <span className="material-symbols-outlined">corporate_fare</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-dark">Suporte Central</p>
                                        <p className="text-[11px] text-gray-500 font-semibold">Atendimento Aurora</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    fullWidth
                                    variant="secondary"
                                    icon="phone"
                                    onClick={() => window.location.href = 'tel:0800000000'}
                                >
                                    Ligar para Central
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Details and Settings */}
                <div className="md:col-span-2 space-y-8">
                    <Card title="Dados do Estabelecimento / Comercial" headerAction={<Button size="sm" variant="ghost" icon="edit">Editar</Button>}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Razão Social / Nome Fantasia</label>
                                <p className="text-sm font-bold text-gray-700">{user.nome} PDV</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CNPJ / CPF</label>
                                <p className="text-sm font-bold text-gray-700">12.345.678/0001-90</p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Endereço de Atendimento</label>
                                <p className="text-sm font-bold text-gray-700">Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01001-000</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de Contrato</label>
                                <p className="text-sm font-bold text-primary uppercase">Consignação Diamond (30%)</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Configurações e Segurança">
                        <div className="divide-y divide-gray-50">
                            <div className="py-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-700">Notificações por WhatsApp</p>
                                    <p className="text-xs text-gray-400">Receber alertas de reposição e pagamentos.</p>
                                </div>
                                <div className="w-12 h-6 bg-primary/20 rounded-full relative">
                                    <div className="absolute right-1 top-1 size-4 bg-primary rounded-full"></div>
                                </div>
                            </div>

                            <div className="py-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-700">Modo de Exibição</p>
                                    <p className="text-xs text-gray-400">Alternar entre modo claro e escuro.</p>
                                </div>
                                <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                                    <div className="absolute left-1 top-1 size-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>

                            <div className="py-6 pt-8 flex gap-4">
                                <Button variant="secondary" icon="lock_reset" className="flex-1">Alterar Senha</Button>
                                <Button variant="ghost" icon="logout" className="flex-1 !text-red-500 hover:bg-red-50">Sair da Conta</Button>
                            </div>
                        </div>
                    </Card>

                    <div className="p-6 bg-brand-dark/5 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center text-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">privacy_tip</span>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aurora Folheados System v1.0.4</p>
                        <p className="text-[9px] text-gray-400 uppercase">Seus dados estão protegidos por criptografia de ponta a ponta.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDVProfile;
