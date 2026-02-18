
import React, { useState } from 'react';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sending recovery link
    setSubmitted(true);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center p-4">
      <div className="layout-container flex w-full max-w-[480px] flex-col">
        {/* Main Card Container */}
        <div className="bg-white dark:bg-[#1f2423] rounded-xl shadow-sm border border-[#dfe2e1] dark:border-[#2d3332] overflow-hidden p-8 sm:p-12">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 text-primary dark:text-white mb-6">
              <div className="size-10 flex items-center justify-center bg-primary rounded-lg text-accent-gold">
                <span className="material-symbols-outlined">diamond</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight uppercase">Aurora Folheados</span>
            </div>

            {/* HeadlineText */}
            <h2 className="text-[#131515] dark:text-white tracking-tight text-3xl font-black leading-tight text-center pb-2 pt-4">
              Recuperar Senha
            </h2>
            {/* BodyText */}
            <p className="text-[#4f5b57] dark:text-[#a1aca9] text-base font-medium leading-relaxed pb-8 text-center max-w-[320px]">
              Informe seu e-mail para receber as instruções de redefinição de senha da sua conta.
            </p>
          </div>

          {/* Recovery Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* TextField */}
            <div className="flex flex-col w-full">
              <label className="flex flex-col flex-1">
                <p className="text-[#131515] dark:text-white text-sm font-black uppercase tracking-widest leading-normal pb-3">E-mail</p>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-[#131515] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dfe2e1] dark:border-[#3d4543] bg-white dark:bg-[#252a29] focus:border-primary h-14 placeholder:text-[#6f7b77] px-4 text-base font-normal"
                  placeholder="exemplo@email.com"
                />
              </label>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex h-14 items-center justify-center rounded-lg bg-primary text-white text-sm font-black uppercase tracking-widest transition-all hover:bg-opacity-90 active:scale-[0.98] shadow-lg shadow-primary/10"
              >
                {submitted ? 'Link Enviado' : 'Enviar Link de Recuperação'}
              </button>
            </div>
          </form>

          {/* Footer Link */}
          <div className="mt-10 flex items-center justify-center">
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-2 text-primary dark:text-[#a1aca9] text-sm font-bold hover:underline transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Voltar para o Login
            </button>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-[#6f7b77] dark:text-[#5c6a65] text-xs text-center mt-8 font-medium">
          © 2024 Aurora Folheados. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
