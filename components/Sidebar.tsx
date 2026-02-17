
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Role, User } from '../types';

interface SidebarProps {
  user: User;
  onRoleChange: (role: Role) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onRoleChange, onLogout, isOpen, onClose }) => {
  const adminLinks = [
    { to: '/', icon: 'dashboard', label: 'Painel' },
    { to: '/admin/usuarios', icon: 'person_search', label: 'Equipe' },
    { to: '/admin/catalogo', icon: 'inventory', label: 'Produtos' },
    { to: '/estoque-central', icon: 'warehouse', label: 'Estoque Central' },
    { to: '/admin-pdvs', icon: 'storefront', label: 'Rede de PDVs' },
    { to: '/admin/clientes', icon: 'groups', label: 'Clientes' },
    { to: '/comissoes', icon: 'groups', label: 'Performance Equipe' },
    { to: '/etiquetas', icon: 'label', label: 'Etiquetas' },
    { to: '/admin/configuracoes', icon: 'settings', label: 'Configurações' },
  ];

  const promoterLinks = [
    { to: '/', icon: 'dashboard', label: 'Dashboard' },
    { to: '/recebimento', icon: 'download_for_offline', label: 'Receber Carga' },
    { to: '/maleta', icon: 'inventory_2', label: 'Minha Maleta' },
    { to: '/pdvs', icon: 'storefront', label: 'PDVs Atribuídos' },
    { to: '/minha-performance', icon: 'payments', label: 'Minha Performance' },
  ];

  const pdvLinks = [
    { to: '/', icon: 'home', label: 'Início' },
    { to: '/venda-rapida', icon: 'shopping_cart', label: 'Nova Venda' },
    { to: '/historico-vendas', icon: 'history', label: 'Histórico de Vendas' },
    { to: '/trocas', icon: 'swap_horiz', label: 'Trocas e Devoluções' },
    { to: '/confirmar-reposicao', icon: 'verified', label: 'Confirmar Reposição' },
    { to: '/estoque-local', icon: 'inventory_2', label: 'Estoque Local' },
    { to: '/meus-ganhos', icon: 'payments', label: 'Meus Ganhos' },
    { to: '/perfil', icon: 'settings', label: 'Meu Perfil' },
  ];

  const links = user.role === Role.ADMIN ? adminLinks : user.role === Role.PROMOTOR ? promoterLinks : pdvLinks;

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-brand-dark text-white flex flex-col h-full py-6 shrink-0 z-50 print:hidden transition-all duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      {/* Header - Fixed */}
      <div className="px-6 flex flex-col items-center gap-2 mb-6 shrink-0 relative">
        {/* Close Button Mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute -right-2 top-0 p-2 text-white/50 hover:text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <img src="/logo_aurora.png" alt="Aurora Foliados" className="w-32 h-auto" />
        <p className="text-primary text-[10px] font-bold opacity-80 uppercase tracking-tighter text-center">
          {user.role === Role.ADMIN ? 'Foliados Admin' : 'Foliados System'}
        </p>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar flex flex-col gap-1 min-h-0">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all shrink-0 ${isActive
                ? 'bg-primary/10 border-l-4 border-primary text-[#d1ae77]'
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer - Fixed */}
      <div className="px-6 flex flex-col gap-4 mt-auto pt-4 shrink-0">
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{user.nome}</p>
              <p className="text-white/50 text-xs truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wide border border-red-500/20 shrink-0"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
