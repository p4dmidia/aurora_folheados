import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { User, Role } from '../../types';
import { userService } from '../../services/userService';

const UserManagement: React.FC<{ user: User }> = ({ user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<User>>({});

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (u?: User) => {
        if (u) {
            setEditingUser(u);
            setFormData(u);
        } else {
            setEditingUser(null);
            setFormData({
                nome: '',
                email: '',
                role: Role.PROMOTOR,
                superior_id: user.id, // Default superior is the current admin if it's a promoter
                status: 'ATIVO'
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (editingUser) {
                await userService.updateUser(editingUser.id, formData);
            } else {
                // Now userService.createUser handles Supabase Auth
                await userService.createUser(formData as any);
                alert('Usuário criado com sucesso! Lembre-se que ele precisará confirmar o e-mail ou você pode confirmar manualmente no painel do Supabase se necessário.');
            }
            setShowModal(false);
            await loadUsers();
        } catch (err: any) {
            alert('Erro ao salvar usuário: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-20">
            <PageHeader
                title="Gestão de Usuários"
                description="Controle o acesso de administradores e promotores à plataforma."
                extra={
                    <Button icon="person_add" onClick={() => openModal()}>Novo Usuário</Button>
                }
            />

            <Card padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-80 shadow-sm font-bold"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" icon="refresh" onClick={loadUsers} loading={loading}>Atualizar</Button>
                        <Button size="sm" variant="secondary" icon="download">Exportar</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[200px] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <div className="p-20 text-center text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-4">group_off</span>
                            <p className="text-lg font-black uppercase tracking-widest">Nenhum usuário encontrado</p>
                        </div>
                    )}

                    {(users.length > 0 || loading) && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome / E-mail</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Acesso / Nível</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cadastro</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 uppercase">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-dark flex items-center justify-center text-[10px] font-black text-white">
                                                    {u.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-brand-dark tracking-tight">{u.nome}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold lowercase italic">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${u.role === Role.ADMIN ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                                {u.role === Role.PROMOTOR && (
                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded">
                                                        {u.nivel_promotor || 'JUNIOR'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${u.status === 'INATIVO' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                                <StatusBadge status={u.status === 'INATIVO' ? 'error' : 'success'}>
                                                    {u.status || 'ATIVO'}
                                                </StatusBadge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-[11px] font-bold text-gray-400">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" icon="edit" className="!px-2" onClick={() => openModal(u)}></Button>
                                                <Button size="sm" variant="ghost" icon="delete" className="!px-2 !text-red-400" onClick={() => {
                                                    if (confirm('Deseja realmente remover este usuário?')) {
                                                        userService.deleteUser(u.id).then(() => loadUsers());
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

            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card
                        className="max-w-md w-full animate-in fade-in zoom-in duration-300"
                        title={editingUser ? "Editar Usuário" : "Cadastrar Novo Usuário"}
                        headerAction={
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-brand-dark leading-none">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        }
                    >
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={formData.nome || ''}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Ex: João da Silva"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail de Acesso</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        disabled={!!editingUser}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp || ''}
                                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Senha</label>
                                        <input
                                            type="password"
                                            value={formData.senha || ''}
                                            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                                    <textarea
                                        value={formData.endereco || ''}
                                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                        placeholder="Rua, Número, Bairro, Cidade - UF"
                                        rows={2}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo de Perfil</label>
                                        <select
                                            value={formData.role || Role.PROMOTOR}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        >
                                            <option value={Role.PROMOTOR}>Promotor</option>
                                            <option value={Role.ADMIN}>Administrador</option>
                                            <option value={Role.PARCEIRO}>Parceiro (PDV)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nível Promotor</label>
                                        <select
                                            value={formData.nivel_promotor || 'JUNIOR'}
                                            onChange={(e) => setFormData({ ...formData, nivel_promotor: e.target.value as any })}
                                            disabled={formData.role !== Role.PROMOTOR}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold disabled:opacity-50"
                                        >
                                            <option value="JUNIOR">Júnior</option>
                                            <option value="SENIOR">Sênior</option>
                                            <option value="COORDENADOR">Coordenador</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                                        <select
                                            value={formData.status || 'ATIVO'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:border-primary outline-none transition-all text-sm font-bold"
                                        >
                                            <option value="ATIVO">Ativo</option>
                                            <option value="INATIVO">Inativo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button variant="ghost" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button fullWidth onClick={handleSave} loading={loading}>
                                    {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
