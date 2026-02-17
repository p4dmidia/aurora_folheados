
import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { User } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onForgotPassword: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.signIn(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : 'Erro ao entrar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Side: Hero Image Pane */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-10 glass-overlay"></div>
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBHygrkHENKXz-xjL0KCCcO_KeJnsNnd223LnM-5UKLFGmSo_b_h7WvQGsypO_n0bsl9BEm8kSDhoHUFsg_RziLtarPmp5eYD5PbZrBHFIExzC6Uwgr-1XQ660D1idbZw5OoUrqB7HKxHloMnyRgBO8MYrNAwRnnyVgPR5Tr250aFYXJlFM1Nxe_rFu983hqvvkH-CGKdhrJr81hnnKVStBR3MHojgUGg--3yw5gDIVWgFFcx0Ho-sGjmvWaHNyuNBiFmIZvq89KCM')" }}
        ></div>

        <div className="relative z-20 flex flex-col justify-end p-16 w-full text-white">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-accent-gold text-4xl">diamond</span>
              <h2 className="text-3xl font-extrabold tracking-tight">Aurora Foliados</h2>
            </div>
            <p className="text-lg font-light leading-relaxed opacity-90">
              Excelência em semijoias para parceiros, promotores e administradores que buscam o brilho da perfeição em cada detalhe.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Login Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white dark:bg-background-dark px-8 md:px-16 py-12">
        <div className="max-w-[420px] w-full flex flex-col">

          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="lg:hidden flex items-center gap-2 mb-6 text-primary dark:text-white">
              <span className="material-symbols-outlined text-accent-gold text-4xl">diamond</span>
              <h2 className="text-2xl font-bold">Aurora Foliados</h2>
            </div>
            <h1 className="text-primary dark:text-white tracking-tight text-3xl font-extrabold leading-tight text-center">
              Bem-vindo
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal text-center mt-2">
              Acesse sua conta para gerenciar suas operações.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="flex flex-col w-full">
                <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">E-mail</p>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">mail</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input flex w-full min-w-0 flex-1 rounded-lg text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-accent-gold/20 border border-[#dfe2e1] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-accent-gold h-14 placeholder:text-gray-400 pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-primary dark:text-white text-sm font-semibold leading-normal pb-2">Senha</p>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-semibold text-accent-gold hover:underline mb-2"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 rounded-lg text-primary dark:text-white focus:outline-0 focus:ring-2 focus:ring-accent-gold/20 border border-[#dfe2e1] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-accent-gold h-14 placeholder:text-gray-400 pl-12 pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="••••••••"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl cursor-pointer hover:text-primary transition-colors"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <input className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer" id="remember" type="checkbox" />
              <label className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer" htmlFor="remember">Manter conectado</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex h-14 items-center justify-center overflow-hidden rounded-lg bg-primary hover:bg-[#233830] text-accent-gold text-base font-bold leading-normal tracking-wide transition-colors shadow-lg shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="truncate">Entrar</span>}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Precisa de ajuda?
              <a className="font-bold text-primary dark:text-white hover:text-accent-gold transition-colors inline-flex items-center gap-1 ml-1" href="#">
                Falar com o Suporte
                <span className="material-symbols-outlined text-base">arrow_outward</span>
              </a>
            </p>
            <div className="flex gap-6 mt-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Admins</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Promotores</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Parceiros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
