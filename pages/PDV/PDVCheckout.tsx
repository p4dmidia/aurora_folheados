import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Product, User, PDV } from '../../types';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Card from '../../components/Card';
import BarcodeScanner from '../../components/BarcodeScanner';
import { pdvService } from '../../services/pdvService';
import { inventoryService } from '../../services/inventoryService';
import { saleService } from '../../services/saleService';
import { mercadoPagoService } from '../../services/mercadoPagoService';
import { receiptService } from '../../services/receiptService';
import { customerService } from '../../services/customerService';
import { supabase } from '../../lib/supabase';
import Toast, { ToastType } from '../../components/Toast';

// Extended Product interface for what we display
interface PDVProduct extends Product {
  estoque: number;
}

interface CartItem {
  product: PDVProduct;
  quantity: number;
}

const PDVCheckout: React.FC<{ user: User }> = ({ user }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [pdv, setPdv] = useState<PDV | null>(null);
  const [products, setProducts] = useState<PDVProduct[]>([]);

  const [cart, setCart] = useState<{ product: PDVProduct; quantity: number }[]>([]);
  const [step, setStep] = useState<'SELECTION' | 'CUSTOMER' | 'PAYMENT' | 'PAYMENT_DETAILS' | 'SUCCESS'>('SELECTION');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    nome: (location.state as any)?.customerName || '',
    whatsapp: (location.state as any)?.customerWhatsapp || '',
    cpf: (location.state as any)?.customerCpf || '',
    email: '',
    cep: '',
    endereco: '',
    numero: ''
  });
  const [ccForm, setCcForm] = useState({
    number: '',
    holderName: '',
    expiry: '',
    ccv: ''
  });
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [appliedCredit, setAppliedCredit] = useState<number>((location.state as any)?.creditAmount || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    console.log('PDVCheckout v2 Mounted - Asaas Integration Active');
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (!currentSaleId || step !== 'PAYMENT_DETAILS') return;

    const channel = supabase
      .channel(`sale_${currentSaleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vendas',
          filter: `id=eq.${currentSaleId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          if (payload.new.status === 'CONCLUIDA') {
            setStep('SUCCESS');
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSaleId, step]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Get PDV for this partner
      const myPDV = await pdvService.getPDVByPartnerId(user.id);
      setPdv(myPDV);

      if (myPDV) {
        // 2. Get Inventory
        const items = await inventoryService.getPDVItems(myPDV.id);
        // Transform to PDVProduct
        const availProds = items.map((i: any) => ({
          id: i.id, // This is product_id from getPDVItems return
          sku: i.sku,
          nome: i.nome,
          categoria: i.categoria,
          preco: i.preco,
          imagemUrl: i.imagemUrl,
          estoque: i.quantidade
        }));
        // Only show items with stock > 0
        setProducts(availProds.filter(p => p.estoque > 0));
      }
    } catch (err) {
      console.error('Erro ao carregar checkout', err);
      // alert('Erro ao carregar dados do PDV'); // Suppressed
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: PDVProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Check stock limit
        if (existing.quantity >= product.estoque) {
          showToast('Quantidade máxima em estoque atingida.', 'warning');
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (delta > 0 && newQty > item.product.estoque) {
            showToast('Quantidade máxima em estoque atingida.', 'warning');
            return item;
          }
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleScan = (sku: string) => {
    const product = products.find(p => p.sku === sku);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    } else {
      showToast('Produto não encontrado ou sem estoque.', 'error');
    }
  };

  const handleCpfLookup = async (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    setCustomer({ ...customer, cpf: cleanCpf });

    if (cleanCpf.length === 11) {
      try {
        setIsSearchingCustomer(true);
        const existing = await customerService.getCustomerByCpf(cleanCpf);
        if (existing) {
          setCustomer({
            nome: existing.nome,
            whatsapp: existing.whatsapp || '',
            cpf: existing.cpf,
            email: existing.email || '',
            cep: existing.cep || '',
            endereco: existing.endereco || '',
            numero: existing.numero || ''
          });
          setCustomerFound(true);
        } else {
          setCustomerFound(false);
        }
      } catch (err) {
        console.error('Erro ao buscar CPF:', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    } else {
      setCustomerFound(false);
    }
  };

  const handleFinishSale = async () => {
    if (!pdv || !paymentMethod) return;

    try {
      setIsProcessing(true);

      // 1. Create Sale Record in Supabase (PENDENTE)
      const sale = await saleService.createSale({
        pdv_id: pdv.id,
        parceiro_id: user.id,
        valor_total: finalTotal,
        tipo_pagamento: paymentMethod as any,
        cliente_dados: customer.nome ? {
          nome: customer.nome,
          whatsapp: customer.whatsapp || undefined,
          cpf: customer.cpf || undefined
        } : undefined,
        itens: cart.map(i => ({
          produto_id: i.product.id,
          quantidade: i.quantity,
          preco_unitario: i.product.preco
        }))
      });

      setCurrentSaleId(sale.id);

      // 2. Process Mercado Pago Payment
      if (paymentMethod === 'PIX') {
        const res = await mercadoPagoService.createPayment({
          vendaId: sale.id,
          paymentMethodId: 'pix',
          amount: finalTotal,
          description: `Venda ${sale.id} - Aurora Folheados`,
          payer: {
            email: customer.email || `${customer.whatsapp}@aurora.com.br`,
            first_name: customer.nome.split(' ')[0],
            last_name: customer.nome.split(' ').slice(1).join(' '),
            identification: {
              type: 'CPF',
              number: customer.cpf
            }
          }
        });

        if (res.point_of_interaction?.transaction_data) {
          setPixData({
            payload: res.point_of_interaction.transaction_data.qr_code,
            encodedImage: res.point_of_interaction.transaction_data.qr_code_base64
          });
        }
      } else if (paymentMethod === 'CARD') {
        let cardToken = '';
        if ((window as any).MercadoPago) {
          try {
            const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
            const [month, year] = ccForm.expiry.split('/');

            const tokenResult = await mp.createCardToken({
              cardNumber: ccForm.number.replace(/\s/g, ''),
              cardholderName: ccForm.holderName,
              cardExpirationMonth: month,
              cardExpirationYear: '20' + year || '2026',
              securityCode: ccForm.ccv,
              identificationType: 'CPF',
              identificationNumber: customer.cpf
            });
            cardToken = tokenResult.id;
          } catch (tokenErr: any) {
            console.error('Tokenization error:', tokenErr);
            throw new Error(tokenErr.message || 'Erro ao processar dados do cartão. Verifique os dados e tente novamente.');
          }
        }

        await mercadoPagoService.createPayment({
          vendaId: sale.id,
          paymentMethodId: 'credit_card',
          amount: finalTotal,
          description: `Venda ${sale.id} - Aurora Folheados`,
          payer: {
            email: customer.email || `${customer.whatsapp}@aurora.com.br`,
            first_name: customer.nome.split(' ')[0],
            identification: {
              type: 'CPF',
              number: customer.cpf
            }
          },
          token: cardToken,
          installments: 1
        });
      }

      if (paymentMethod !== 'PIX') {
        setStep('SUCCESS');
        loadData();
      }

    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.preco * item.quantity), 0);
  const discount = (paymentMethod === 'PIX' || paymentMethod === 'CASH') ? subtotal * 0.1 : 0;
  const finalTotal = Math.max(0, subtotal - discount - appliedCredit);

  const isCustomerValid = customer.nome.length > 3 || customer.whatsapp.length >= 0; // Relaxed for quick sale
  const canFinishSale = !!paymentMethod;

  const filteredProducts = products.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!pdv && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#f4f3f0]">
        <Card padding="large">
          <span className="material-symbols-outlined text-6xl text-gray-300">store_off</span>
          <h2 className="text-xl font-bold mt-4">Nenhum PDV Vinculado</h2>
          <p className="text-gray-500">Você precisa estar vinculado a um PDV para realizar vendas.</p>
        </Card>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const pdfBlob = await receiptService.generateReceipt(
        { id: currentSaleId || '0000', appliedCredit },
        cart,
        customer,
        paymentMethod || 'DINHEIRO'
      );

      const url = window.URL.createObjectURL(pdfBlob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante_aurora_${currentSaleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!customer.whatsapp) return;

    try {
      setIsGeneratingPdf(true);
      const itemsList = cart.map(item => `- ${item.quantity}x ${item.product.nome}`).join('\n');
      let message = `Olá ${customer.nome || 'Cliente'}! 🌸\n\nObrigado pela sua compra na *Aurora Folheados*.\n\n🛍️ *Resumo da Venda*\n${itemsList}\n\n💰 *Total:* R$ ${finalTotal.toFixed(2)}${discount > 0 ? ` (Desconto de 10% aplicado: -R$ ${discount.toFixed(2)})` : ''}\n💳 *Pagamento:* ${paymentMethod === 'PIX' ? 'Pix' : paymentMethod === 'CARD' ? 'Cartão' : 'Dinheiro'}\n\nAgradecemos a preferência! ✨`;

      // Generate PDF
      const pdfBlob = await receiptService.generateReceipt(
        { id: currentSaleId || '0000', appliedCredit },
        cart,
        customer,
        paymentMethod || 'DINHEIRO'
      );

      // Create File object for sharing
      const pdfFile = new File([pdfBlob], `comprovante_${currentSaleId}.pdf`, { type: 'application/pdf' });

      // 1. Try Native Share (Mobile) - Sends FILE directly
      // Diagnostic check for development
      const isSecure = window.isSecureContext;
      const canShare = navigator.canShare && navigator.canShare({ files: [pdfFile] });

      if (canShare && isSecure) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: 'Comprovante Aurora Folheados',
            text: message
          });
          return; // Success!
        } catch (shareError) {
          console.log('Share API canceled or failed, falling back to link', shareError);
        }
      } else {
        // Log reason for dev
        console.log('Native Share unavailable:', { isSecure, canShare, userAgent: navigator.userAgent });
      }

      // 2. Fallback: Upload & Link via WhatsApp Web/App
      let pdfUrl = '';
      try {
        const path = await receiptService.uploadReceipt(pdfBlob as Blob, currentSaleId || 'temp');
        pdfUrl = receiptService.getReceiptUrl(path);
      } catch (e: any) {
        console.error('Upload failed', e);
        showToast('Erro ao fazer upload do PDF. O link não será enviado.', 'warning');
      }

      if (pdfUrl) {
        message += `\n\n📄 *Baixe seu cupom fiscal:* ${pdfUrl}`;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;

      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error(err);
      showToast('Erro ao preparar envio.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#f4f3f0]">
        <Card padding="large" className="max-w-lg w-full">
          <div className="size-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-6xl">check_circle</span>
          </div>
          <h2 className="text-3xl font-black text-brand-dark mb-4">Venda Realizada!</h2>

          <div className="bg-gray-50 p-6 rounded-2xl text-left mb-6 space-y-2 border border-gray-100">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Cliente:</span><span className="font-bold">{customer.nome || 'Não identificado'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Total:</span><span className="font-bold">R$ {finalTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Método:</span><span className="font-bold uppercase">{paymentMethod}</span></div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8">
            <Button
              variant="secondary"
              icon="share"
              className="w-full !bg-[#25D366] !text-white !border-none hover:opacity-90 transition-opacity"
              onClick={handleSendWhatsApp}
              loading={isGeneratingPdf}
              disabled={!customer.whatsapp}
            >
              {customer.whatsapp ? 'Enviar Cupom Fiscal via WhatsApp' : 'WhatsApp não informado'}
            </Button>


            <Button
              variant="brand"
              size="lg"
              className="w-full"
              onClick={() => {
                setCart([]);
                setCustomer({ nome: '', whatsapp: '', cpf: '', email: '', cep: '', endereco: '', numero: '' });
                setCustomerFound(false);
                setStep('SELECTION');
                setPaymentMethod(null);
                setIsProcessing(false);
                setAppliedCredit(0);
                loadData();
              }}
            >
              Nova Venda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Floating Cart Button for Mobile */}
      {step === 'SELECTION' && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-6 left-6 h-16 px-6 bg-brand-dark text-white rounded-full shadow-2xl z-[40] flex items-center justify-center gap-3 border-2 border-primary/20"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-3xl">shopping_bag</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 size-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-brand-dark">
                {cart.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </div>
          <span className="font-black text-sm tracking-widest">CONTINUAR</span>
        </button>
      )}

      <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
        <PageHeader
          title={step === 'CUSTOMER' ? 'Identificação do Cliente' : step === 'PAYMENT' ? 'Forma de Pagamento' : 'Frente de Caixa'}
          actions={
            step === 'SELECTION' && isMobileOrTablet && (
              <Button variant="brand" icon="qr_code_scanner" onClick={() => setShowScanner(true)}>Escanear</Button>
            )
          }
        />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
          </div>
        ) : step === 'SELECTION' ? (
          <div className="space-y-6">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Pesquisar por produto ou SKU..."
                className="w-full h-14 pl-12 pr-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2">remove_shopping_cart</span>
                  <p>Nenhum produto encontrado.</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <Card key={product.id} padding="small" className="group">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-50 relative">
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                        Estoque: {product.estoque}
                      </div>
                      {product.imagemUrl ? (
                        <img src={product.imagemUrl} alt={product.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-sm truncate">{product.nome}</h3>
                    <p className="text-[10px] text-gray-400 uppercase">{product.sku}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-primary font-black">R$ {product.preco.toFixed(2)}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="add"
                        className="!p-2"
                        disabled={product.estoque <= 0}
                        onClick={() => addToCart(product)}
                      />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : step === 'CUSTOMER' ? (
          <div className="max-w-xl mx-auto w-full py-10">
            <Card padding="large" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block mb-2">Identificação pelo CPF</label>
                  <div className="relative">
                    <input
                      className="w-full h-16 rounded-2xl border-2 border-gray-100 bg-gray-50 px-6 font-bold text-xl text-center focus:border-primary focus:bg-white transition-all"
                      placeholder="000.000.000-00"
                      maxLength={11}
                      value={customer.cpf}
                      onChange={e => handleCpfLookup(e.target.value)}
                    />
                    {isSearchingCustomer && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {customerFound ? (
                  <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xl">
                        {customer.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-dark">{customer.nome}</h4>
                        <p className="text-sm text-gray-500">{customer.whatsapp}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full !text-[10px] uppercase font-black"
                      onClick={() => {
                        setCustomer({ nome: '', whatsapp: '', cpf: '', email: '', cep: '', endereco: '', numero: '' });
                        setCustomerFound(false);
                      }}
                    >
                      Alterar Cliente
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</label>
                      <input
                        className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                        placeholder="Ex: Maria Oliveira"
                        value={customer.nome}
                        onChange={e => setCustomer({ ...customer, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                      <input
                        className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                        placeholder="(00) 00000-0000"
                        value={customer.whatsapp}
                        onChange={e => setCustomer({ ...customer, whatsapp: e.target.value })}
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Dados Adicionais (Opcional)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          className="h-12 rounded-lg border-gray-200 bg-white px-4 text-sm focus:ring-primary"
                          placeholder="E-mail"
                          value={customer.email}
                          onChange={e => setCustomer({ ...customer, email: e.target.value })}
                        />
                        <input
                          className="h-12 rounded-lg border-gray-200 bg-white px-4 text-sm focus:ring-primary"
                          placeholder="CEP"
                          value={customer.cep}
                          onChange={e => setCustomer({ ...customer, cep: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="brand"
                size="lg"
                className="w-full h-16 text-lg"
                disabled={customer.nome.length < 3}
                onClick={() => setStep('PAYMENT')}
              >
                {customerFound ? 'Confirmar e Continuar' : 'Cadastrar e Continuar'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('SELECTION')}>Voltar para a Sacola</Button>
            </Card>
          </div>
        ) : step === 'PAYMENT' ? (
          <div className="max-w-xl mx-auto w-full py-10">
            <Card padding="large" className="space-y-8">
              <div className="grid grid-cols-3 gap-4">
                {['PIX', 'CARD', 'CASH'].map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${paymentMethod === m ? 'border-primary bg-primary/5 text-brand-dark' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                  >
                    <span className="material-symbols-outlined text-3xl">{m === 'PIX' ? 'bolt' : m === 'CARD' ? 'credit_card' : 'payments'}</span>
                    <span className="text-xs font-black uppercase tracking-widest">{m === 'CASH' ? 'Dinheiro' : m === 'CARD' ? 'Cartão' : 'Pix'}</span>
                  </button>
                ))}
              </div>

              {(paymentMethod === 'PIX' || paymentMethod === 'CASH') && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <p className="text-xs font-bold font-display italic text-center w-full">Desconto de 10% aplicado para pagamento à vista! ✨</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-4xl font-black text-brand-dark">R$ {finalTotal.toFixed(2)}</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!canFinishSale}
                  onClick={() => {
                    if (paymentMethod === 'CASH') {
                      handleFinishSale();
                    } else {
                      setStep('PAYMENT_DETAILS');
                    }
                  }}
                >
                  {paymentMethod === 'CASH' ? 'Finalizar Venda' : 'Ir para Checkout'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('CUSTOMER')}>Voltar para Identificação</Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="max-w-xl mx-auto w-full py-10">
            <Card padding="large" className="relative overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center gap-4">
                  <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-brand-dark">Processando Pagamento...</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                  <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{paymentMethod === 'PIX' ? 'bolt' : paymentMethod === 'CARD' ? 'credit_card' : 'calendar_month'}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-dark">Mercado Pago - Checkout Transparente</h3>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{paymentMethod}</p>
                  </div>
                </div>

                {paymentMethod === 'PIX' ? (
                  <div className="text-center py-4 space-y-6">
                    {pixData ? (
                      <>
                        <div className="bg-white p-4 rounded-2xl mx-auto border-2 border-primary/20 inline-block shadow-inner">
                          <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="PIX QR Code" className="size-48" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Copia e Cola</p>
                          <div className="flex bg-gray-50 p-3 rounded-xl gap-2 border border-gray-100">
                            <input readOnly value={pixData.payload} className="bg-transparent text-[10px] font-mono flex-1 overflow-hidden truncate" />
                            <button onClick={() => navigator.clipboard.writeText(pixData.payload)} className="text-primary material-symbols-outlined text-lg">content_copy</button>
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-600 animate-pulse">sync</span>
                          <p className="text-xs font-bold text-emerald-700">Aguardando pagamento...</p>
                        </div>
                      </>
                    ) : (
                      <Button variant="primary" size="lg" className="w-full" onClick={handleFinishSale} loading={isProcessing}>Gerar QR Code PIX</Button>
                    )}
                  </div>
                ) : paymentMethod === 'CARD' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número do Cartão</label>
                      <input
                        className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                        placeholder="0000 0000 0000 0000"
                        value={ccForm.number}
                        onChange={e => setCcForm({ ...ccForm, number: e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome no Cartão</label>
                      <input
                        className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                        placeholder="NOME DO TITULAR"
                        value={ccForm.holderName}
                        onChange={e => setCcForm({ ...ccForm, holderName: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validade (MM/AA)</label>
                        <input
                          className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                          placeholder="MM/AA"
                          maxLength={5}
                          value={ccForm.expiry}
                          onChange={e => setCcForm({ ...ccForm, expiry: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CVV</label>
                        <input
                          className="w-full h-14 rounded-xl border-gray-100 bg-gray-50 px-4 font-medium focus:ring-primary"
                          placeholder="000"
                          maxLength={4}
                          value={ccForm.ccv}
                          onChange={e => setCcForm({ ...ccForm, ccv: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleFinishSale}
                      loading={isProcessing}
                      disabled={!ccForm.number || !ccForm.holderName || ccForm.expiry.length < 5}
                    >
                      Pagar Agora
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-10">Método não implementado para checkout transparente.</p>
                )}

                <div className="pt-6 border-t border-gray-100 space-y-3">
                  <Button variant="ghost" className="w-full" onClick={() => { setStep('PAYMENT'); setPixData(null); }}>Alterar Método de Pagamento</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <aside className={`
        fixed lg:static inset-y-0 right-0 w-full sm:w-[400px] lg:w-[400px] 
        bg-white border-l border-gray-200 flex flex-col z-[50] shadow-2xl
        transition-all duration-300 transform
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-brand-dark uppercase">Sacola</h3>
            <p className="text-xs text-gray-400">{cart.length} itens selecionados</p>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-brand-dark"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
          {cart.map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group">
              <div className="relative">
                {item.product.imagemUrl ? (
                  <img src={item.product.imagemUrl} alt="" className="size-16 rounded-xl object-cover" />
                ) : (
                  <div className="size-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                    <span className="material-symbols-outlined">image</span>
                  </div>
                )}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="absolute -top-2 -left-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-brand-dark truncate pr-4">{item.product.nome}</p>
                <p className="text-[10px] text-gray-400 font-medium">{item.product.sku}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-primary font-black">R$ {item.product.preco.toFixed(2)}</span>

                  <div className="flex items-center bg-white border border-gray-100 rounded-lg p-1 gap-3">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      className="size-6 rounded-md hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-dark transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="text-xs font-black min-w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      className="size-6 rounded-md hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-dark transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <span className="material-symbols-outlined text-6xl">shopping_basket</span>
              <p className="text-sm mt-2">Sua sacola está vazia</p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400"><span>Subtotal (Itens)</span><span>R$ {subtotal.toFixed(2)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-brand-secondary font-bold">
                <span>Desconto (10%)</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            {appliedCredit > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-bold">
                <span>Crédito de Troca</span>
                <span>- R$ {appliedCredit.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4 border-t border-dashed border-gray-200">
              <span className="text-gray-400 text-[10px] font-black uppercase">Total Final</span>
              <span className="text-3xl font-black text-brand-dark">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {step === 'SELECTION' && (
            <Button
              variant="brand"
              size="lg"
              className="w-full"
              disabled={cart.length === 0}
              onClick={() => {
                setStep('CUSTOMER');
                setIsCartOpen(false);
              }}
            >
              Identificar Cliente
            </Button>
          )}
        </div>
      </aside>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default PDVCheckout;
