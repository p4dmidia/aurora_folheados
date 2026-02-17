import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
        const body = await req.json()
        let { action, data } = body

        // Handle webhooks (notification)
        if (req.method === 'POST' && !action) {
            if (body.type === 'payment' || body.action === 'payment.created' || body.action === 'payment.updated') {
                action = 'webhook';
                data = body;
            }
        }

        if (action === 'create-payment') {
            const { paymentMethodId, amount, description, payer, token, installments, vendaId } = data

            const payBody: any = {
                transaction_amount: amount,
                description: description,
                payment_method_id: paymentMethodId,
                payer: {
                    email: payer.email,
                    first_name: payer.first_name,
                    last_name: payer.last_name || '',
                    identification: payer.identification
                },
                external_reference: vendaId,
                notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-integration`
            }

            if (paymentMethodId === 'credit_card') {
                payBody.token = token
                payBody.installments = installments || 1
            }

            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': crypto.randomUUID()
                },
                body: JSON.stringify(payBody)
            })

            const result = await response.json()

            if (result.errors || result.status === 400) {
                throw new Error(result.message || result.errors?.[0]?.message || 'Erro ao criar pagamento no Mercado Pago')
            }

            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (action === 'webhook') {
            const paymentId = data.data?.id || data.id;
            if (!paymentId) return new Response('OK', { headers: corsHeaders });

            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
            });
            const payment = await response.json();

            if (payment.status === 'approved') {
                const vendaId = payment.external_reference;
                if (vendaId) {
                    console.log(`[MP Webhook] Atualizando venda ${vendaId} para CONCLUIDA`);
                    await supabase.from('vendas').update({ status: 'CONCLUIDA' }).eq('id', vendaId);
                }
            }

            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ error: 'Action not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        })

    } catch (error) {
        console.error(`[MercadoPago] Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
