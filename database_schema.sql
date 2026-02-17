-- AURORA FOLIADOS - DATABASE SCHEMA (SUPABASE)

-- 1. ENUMS
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'PROMOTOR', 'PARCEIRO');
CREATE TYPE public.payment_type AS ENUM ('PIX', 'CARD', 'CASH', 'CREDIARIO');
CREATE TYPE public.movement_type AS ENUM ('TRANSFERENCIA', 'AJUSTE', 'VENDA', 'DEVOLUCAO');
CREATE TYPE public.installment_status AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- 2. TABLES

-- Profiles (extends auth.users)
CREATE TABLE public.usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'PARCEIRO',
  superior_id UUID REFERENCES public.usuarios(id), -- Admin -> null, Promotor -> Admin, PDV -> Promotor
  status TEXT DEFAULT 'ATIVO' NOT NULL,
  whatsapp TEXT,
  senha TEXT, -- In a real app, this should be handled by Supabase Auth
  endereco TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE public.produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  preco DECIMAL(10,2) NOT NULL,
  custo DECIMAL(10,2), -- Visible only to Admin
  imagem_url TEXT,
  material TEXT,
  colecao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDVs (Stores/Salons)
CREATE TABLE public.pdvs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_fantasia TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  tipo_pessoa TEXT, -- 'FISICA' or 'JURIDICA'
  documento TEXT, -- CPF or CNPJ
  promotor_id UUID REFERENCES public.usuarios(id), -- Responsible promoter
  parceiro_id UUID REFERENCES public.usuarios(id), -- User with 'PARCEIRO' role
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STOCK LEVELS

-- Central Stock (Admin)
CREATE TABLE public.estoque_central (
  produto_id UUID REFERENCES public.produtos(id) PRIMARY KEY,
  quantidade INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promoter Stock (Maleta)
CREATE TABLE public.estoque_promotor (
  promotor_id UUID REFERENCES public.usuarios(id),
  produto_id UUID REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (promotor_id, produto_id)
);

-- PDV Stock (Expositor)
CREATE TABLE public.estoque_pdv (
  pdv_id UUID REFERENCES public.pdvs(id),
  produto_id UUID REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pdv_id, produto_id)
);

-- CUSTOMERS & SALES

-- Customers (Leads)
CREATE TABLE public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  cpf TEXT UNIQUE,
  pdv_origem UUID REFERENCES public.pdvs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE public.vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdv_id UUID REFERENCES public.pdvs(id) NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  valor_total DECIMAL(10,2) NOT NULL,
  tipo_pagamento public.payment_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items
CREATE TABLE public.venda_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL
);

-- Installments (Asaas integration)
CREATE TABLE public.parcelas_crediario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  status public.installment_status DEFAULT 'PENDENTE',
  asaas_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movements Audit
CREATE TABLE public.movimentacoes_estoque (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL,
  origem_tipo TEXT, -- 'CENTRAL', 'PROMOTOR', 'PDV'
  origem_id UUID,
  destino_tipo TEXT, -- 'PROMOTOR', 'PDV', 'VENDA', 'DEVOLUCAO'
  destino_id UUID,
  usuario_id UUID REFERENCES public.usuarios(id),
  tipo public.movement_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_promotor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_crediario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- 4. BASIC POLICIES (Example: Admins can see everything)
CREATE POLICY "Admins have full access" ON public.produtos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Promoters and Partners can view product catalog" ON public.produtos
  FOR SELECT TO authenticated USING (true);

-- TEMPORARY FOR DEVELOPMENT: Allow anonymous inserts and updates
-- REMOVE BEFORE PRODUCTION
CREATE POLICY "Allow anonymous ops for dev" ON public.produtos
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ADDITIONAL POLICIES FOR DEVELOPMENT
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to usuarios" ON public.usuarios FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.estoque_central ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to estoque_central" ON public.estoque_central FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.estoque_promotor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to estoque_promotor" ON public.estoque_promotor FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to movimentacoes_estoque" ON public.movimentacoes_estoque FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.pdvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to pdvs" ON public.pdvs FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to vendas" ON public.vendas FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.parcelas_crediario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to parcelas_crediario" ON public.parcelas_crediario FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to clientes" ON public.clientes FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to venda_itens" ON public.venda_itens FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION increment_central_stock(p_id UUID, q INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.estoque_central (produto_id, quantidade, updated_at)
    VALUES (p_id, q, NOW())
    ON CONFLICT (produto_id)
    DO UPDATE SET 
        quantidade = public.estoque_central.quantidade + q,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
