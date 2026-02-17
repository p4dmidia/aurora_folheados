
import { Product, User, Role, Sale } from './types';

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', sku: 'AUR-BR45', nome: 'Brinco Argola Ouro 18k', preco: 189.90, imagemUrl: 'https://picsum.photos/200/200?random=1', categoria: 'Brincos' },
  { id: '2', sku: 'AUR-CL12', nome: 'Colar Ponto de Luz Zircônia', preco: 245.00, imagemUrl: 'https://picsum.photos/200/200?random=2', categoria: 'Colares' },
  { id: '3', sku: 'AUR-AN05', nome: 'Anel Solitário Classic', preco: 155.00, imagemUrl: 'https://picsum.photos/200/200?random=3', categoria: 'Anéis' },
  { id: '4', sku: 'AUR-PL88', nome: 'Pulseira Riviera Prata 925', preco: 310.00, imagemUrl: 'https://picsum.photos/200/200?random=4', categoria: 'Pulseiras' },
  { id: '5', sku: 'AUR-BR99', nome: 'Brinco Cascata Pérolas', preco: 298.90, imagemUrl: 'https://picsum.photos/200/200?random=5', categoria: 'Brincos' },
];

export const MOCK_USERS: User[] = [
  { id: 'admin-1', nome: 'Administrador', email: 'admin@aurora.com', role: Role.ADMIN },
  { id: 'promoter-1', nome: 'Eduardo Lima', email: 'eduardo@aurora.com', role: Role.PROMOTOR, region: 'Curitiba/PR' },
  { id: 'pdv-1', nome: 'Studio Magnólia', email: 'magnolia@beauty.com', role: Role.PARCEIRO, superiorId: 'promoter-1' },
  { id: 'pdv-2', nome: 'Bella Beauty Spa', email: 'bella@beauty.com', role: Role.PARCEIRO, superiorId: 'promoter-1' },
];

export const MOCK_SALES: Sale[] = [
  { id: 'S1', pdvId: 'pdv-1', clienteId: 'c1', valorTotal: 450.00, tipoPagamento: 'PIX', data: '2023-10-24T14:32:00', status: 'CONCLUIDO' },
  { id: 'S2', pdvId: 'pdv-2', clienteId: 'c2', valorTotal: 746.90, tipoPagamento: 'CREDIARIO', data: '2023-10-24T11:15:00', status: 'PENDENTE' },
];
