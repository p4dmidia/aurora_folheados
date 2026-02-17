import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_URL = 'https://sandbox.asaas.com/api/v3'
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

  const API_KEY = Deno.env.get('ASAAS_API_KEY')
  if (!API_KEY) {
    console.error('[ASAAS] CRITICAL: ASAAS_API_KEY is missing!')
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const body = await req.json()
    let { action, data } = body

    // Detect direct Asaas Webhook (unwrapped payload)
    if (!action && body.event && body.payment) {
      action = 'webhook'
      data = body
    }

    console.log(`[ASAAS] Incoming Request - Action: ${action}`);

    if (action === 'get-or-create-customer') {
      const { nome, cpf, email, whatsapp, mobilePhone } = data

      // 1. Check DB
      const { data: client } = await supabase
        .from('clientes')
        .select('asaas_id')
        .eq('cpf', cpf)
        .single()

      if (client?.asaas_id) {
        return new Response(JSON.stringify({ asaasId: client.asaas_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 2. Search Asaas
      const searchRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${cpf}`, {
        headers: { 'access_token': API_KEY! }
      })
      const searchData = await searchRes.json()

      if (searchData.data && searchData.data.length > 0) {
        const asaasId = searchData.data[0].id
        await supabase.from('clientes').update({ asaas_id: asaasId }).eq('cpf', cpf)
        return new Response(JSON.stringify({ asaasId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 3. Create Asaas
      const createRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'access_token': API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nome,
          cpfCnpj: cpf,
          email: email,
          mobilePhone: mobilePhone || whatsapp,
          notificationDisabled: true
        })
      })
      const newCustomer = await createRes.json()

      if (newCustomer.errors) throw new Error(newCustomer.errors[0].description)

      await supabase.from('clientes').update({ asaas_id: newCustomer.id }).eq('cpf', cpf)
      return new Response(JSON.stringify({ asaasId: newCustomer.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create-payment') {
      const { customer, billingType, value, dueDate, description, creditCard, creditCardHolderInfo, remoteIp } = data

      const payBody: any = {
        customer,
        billingType,
        value,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        description,
        externalReference: data.vendaId
      }

      if (billingType === 'CREDIT_CARD') {
        payBody.creditCard = creditCard
        payBody.creditCardHolderInfo = creditCardHolderInfo
        payBody.remoteIp = remoteIp || '127.0.0.1'
      }

      const payRes = await fetch(`${ASAAS_URL}/payments`, {
        method: 'POST',
        headers: {
          'access_token': API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payBody)
      })
      const payment = await payRes.json()

      if (payment.errors) throw new Error(payment.errors[0].description)

      if (billingType === 'PIX') {
        const pixRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
          headers: { 'access_token': API_KEY! }
        })
        const pixData = await pixRes.json()
        return new Response(JSON.stringify({ payment, pix: pixData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ payment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'webhook') {
      const { event, payment } = data
      console.log(`[ASAAS WEBHOOK] Event: ${event}, PaymentID: ${payment.id}`);

      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        const vendaId = payment.externalReference
        if (vendaId) {
          console.log(`[ASAAS WEBHOOK] Updating sale ${vendaId} to CONCLUIDA`);
          await supabase.from('vendas').update({ status: 'CONCLUIDA' }).eq('id', vendaId)
          await supabase.from('parcelas_crediario').update({ status: 'PAGO' }).eq('asaas_id', payment.id)
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
    console.error(`[ASAAS] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
