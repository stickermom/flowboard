
import { supabase } from '@/lib/supabase'; // Assuming strict type checking might fail if I use the client side lib, but this is server route.
import crypto from 'crypto';
import { NextResponse } from 'next/server';
// Actually, for server routes, usually strictly server-side clients are preferred, but let's check lib/supabase first or use direct rest if needed. 
// Typically Next.js App Router uses standard fetch or a server-client. 
// Given the existing code uses `../lib/supabase` in CartModal, I'll check if it's safe for server.
// If 'lib/supabase' creates a CreateBrowserClient, it might not work here.
// I will assume for now I should use a fresh admin client or the existing one if it's universal.
// Let's rely on standard 'razorpay' libUtils if available for signature? No, razorpay node lib has it.
import Razorpay from 'razorpay';

// We need to create a server-side supabase client usually to bypass RLS if needed, OR relies on the fact that this is a system update.
// However, the `supabase` imported from `lib/supabase` is likely the public client. 
// Updates to 'orders' table might have RLS. 
// If RLS allows users to update their own orders, this might work if we have context. 
// But here, it's a webhook, so no user context.
// WE NEED A SERVICE ROLE CLIENT for the webhook to update any order.
// I will check `lib/supabase.ts` first to see what it exports.

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers.get('x-razorpay-signature') as string;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    console.log('[Webhook Debug] Secret defined?', !!secret);
    console.log('[Webhook Debug] Received Sig:', signature);
    console.log('[Webhook Debug] Calculated Sig:', expectedSignature);
    
    if (expectedSignature !== signature) {
      console.error('[Webhook Error] Signature Mismatch');
      return NextResponse.json({ error: 'Invalid signature', expected: expectedSignature, received: signature }, { status: 400 });
    }

    const body = JSON.parse(text);

     if (body.event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      const orderId = payment.order_id; // Razorpay order_id, likely stored in 'payment_data' or we need to match it.
      // Wait, in Checkout we created an order in Razorpay (razorpay_order_id).
      // We haven't stored that razorpay_order_id in our supabase 'orders' table yet in the current flow?
      // In the NEW flow, we create the Supabase Order FIRST.
      // So we need to store the `razorpay_order_id` in our Supabase `orders` table to match safely.
      
      // Let's assume we will add a column 'razorpay_order_id' to `orders` table or store it in `payment_data`.
      // For simplicity, let's query orders where payment_data->>razorpay_order_id matches, 
      // OR we can pass our internal Order ID in notes to Razorpay.
      
      // Better approach: When creating Razorpay Order, pass our Internal Order ID in `notes`.
      const flowboardOrderId = payment.notes.flowboard_order_id;

      if (flowboardOrderId) {
          // Update Order Status
          // Using Service Role Key is safer here. Use process.env.SUPABASE_SERVICE_ROLE_KEY
           const { createClient } = require('@supabase/supabase-js');
           const supabaseAdmin = createClient(
             process.env.NEXT_PUBLIC_SUPABASE_URL,
             process.env.SUPABASE_SERVICE_ROLE_KEY
           );

          const { error } = await supabaseAdmin
            .from('orders')
            .update({
              status: 'paid',
              payment_id: payment.id
            })
            .eq('id', flowboardOrderId); // Assuming UUID or ID
            
          if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
          }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
