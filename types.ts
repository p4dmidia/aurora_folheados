
export enum Role {
  ADMIN = 'ADMIN',
  PROMOTOR = 'PROMOTOR',
  PARCEIRO = 'PARCEIRO'
}

export interface Product {
  id: string;
  sku: string;
  nome: string;
  preco: number;
  imagemUrl: string;
  categoria: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  superior_id?: string;
  status?: 'ATIVO' | 'INATIVO';
  whatsapp?: string;
  senha?: string;
  endereco?: string;
  region?: string;
  nivel_promotor?: 'JUNIOR' | 'SENIOR' | 'COORDENADOR';
}

export interface Stock {
  productId: string;
  quantity: number;
  locationId: string; // PDV ID, Promoter ID, or 'CENTRAL'
}

export interface Sale {
  id: string;
  pdvId: string;
  clienteId: string;
  valorTotal: number;
  tipoPagamento: 'PIX' | 'CARD' | 'CASH' | 'CREDIARIO';
  data: string;
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
  asaas_id?: string;
}

export interface Load {
  id: string;
  promoterId: string;
  dataEnvio: string;
  status: 'PENDENTE' | 'RECEBIDO';
  totalPeças: number;
  valorTotal: number;
  items: { productId: string; quantity: number }[];
}
export interface PDV {
  id: string;
  nome_fantasia: string;
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
  documento?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  promotor_id?: string;
  parceiro_id?: string;
  created_at?: string;
  // Join fields
  promotor?: {
    nome: string;
  };
}
export interface Customer {
  id: string;
  nome: string;
  whatsapp?: string;
  cpf?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  asaas_id?: string;
  pdv_origem?: string;
  created_at?: string;
  // Join fields
  pdv?: {
    nome_fantasia: string;
  };
}
