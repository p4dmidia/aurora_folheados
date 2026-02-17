import { supabase } from '../lib/supabase';

export const mercadoPagoService = {
    async createPayment(data: {
        vendaId: string;
        paymentMethodId: 'pix' | 'credit_card';
        amount: number;
        description: string;
        payer: {
            email: string;
            first_name: string;
            last_name?: string;
            identification?: {
                type: 'CPF';
                number: string;
            };
        };
        token?: string; // For credit card
        installments?: number;
    }) {
        const { data: response, error } = await supabase.functions.invoke('mercadopago-integration', {
            body: { action: 'create-payment', data }
        });

        if (error) {
            const errorData = await (error as any).context?.json();
            throw new Error(errorData?.error || 'Erro ao processar pagamento no Mercado Pago');
        }

        if (response.error) throw new Error(response.error);

        return response;
    }
};
