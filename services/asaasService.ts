import { supabase } from '../lib/supabase';

const FUNCTION_URL = '/functions/v1/asaas-integration';

export const asaasService = {
    async getOrCreateCustomer(data: { nome: string; cpf: string; email?: string; whatsapp?: string }) {
        const { data: response, error } = await supabase.functions.invoke('asaas-integration', {
            body: { action: 'get-or-create-customer', data }
        });

        if (error) {
            const errorData = await (error as any).context?.json();
            throw new Error(errorData?.error || 'Erro ao sincronizar cliente');
        }
        if (response.error) throw new Error(response.error);

        return response.asaasId;
    },

    async createPayment(data: {
        vendaId: string;
        customer: string;
        billingType: 'PIX' | 'CREDIT_CARD';
        value: number;
        description?: string;
        creditCard?: any;
        creditCardHolderInfo?: any;
        remoteIp?: string;
    }) {
        const { data: response, error } = await supabase.functions.invoke('asaas-integration', {
            body: { action: 'create-payment', data }
        });

        if (error) {
            const errorData = await (error as any).context?.json();
            throw new Error(errorData?.error || 'Erro ao processar pagamento');
        }
        if (response.error) throw new Error(response.error);

        return response;
    }
};
