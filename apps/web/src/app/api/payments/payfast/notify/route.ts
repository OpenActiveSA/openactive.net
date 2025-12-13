import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getPayFastConfig, verifyPayFastSignature, parsePayFastITN, getPaymentStatusFromPayFast } from '@/lib/payfast';

/**
 * API Route: PayFast ITN (Instant Transaction Notification) Webhook
 * 
 * Handles PayFast payment notifications
 * POST /api/payments/payfast/notify
 * 
 * PayFast will send POST requests to this endpoint with payment status updates
 */
export async function POST(request: NextRequest) {
  try {
    // PayFast sends data as form-urlencoded
    const formData = await request.formData();
    const itnData: Record<string, string> = {};
    
    // Parse form data
    for (const [key, value] of formData.entries()) {
      itnData[key] = typeof value === 'string' ? value : value.toString();
    }
    
    console.log('PayFast ITN received:', itnData);

    const config = getPayFastConfig();

    // Verify signature
    const isValid = verifyPayFastSignature(itnData, config.passPhrase);
    if (!isValid) {
      console.error('Invalid PayFast signature:', itnData);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Get payment ID from PayFast data
    const paymentId = itnData.m_payment_id; // This is our payment UUID
    const payfastPaymentId = itnData.pf_payment_id; // PayFast's payment ID
    const paymentStatus = itnData.payment_status;

    if (!paymentId) {
      console.error('No payment ID in PayFast ITN:', itnData);
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('Payments')
      .select('*, Bookings!inner(id, status)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentId, paymentError);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Map PayFast status to our payment status
    const status = getPaymentStatusFromPayFast(paymentStatus);

    // Update payment record
    const updateData: any = {
      status,
      payfastPaymentId: payfastPaymentId || payment.payfastPaymentId,
      payfastSignature: itnData.signature,
      payfastResponse: itnData,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.paidAt = new Date().toISOString();
      
      // Update booking status if payment is completed
      if (payment.bookingId) {
        await supabase
          .from('Bookings')
          .update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentId: payment.id,
          })
          .eq('id', payment.bookingId);
      }
    } else if (status === 'failed') {
      updateData.failedAt = new Date().toISOString();
      
      // Update booking payment status
      if (payment.bookingId) {
        await supabase
          .from('Bookings')
          .update({
            paymentStatus: 'failed',
          })
          .eq('id', payment.bookingId);
      }
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('Payments')
      .update(updateData)
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Return success response to PayFast
    // PayFast expects specific response format
    return new NextResponse('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (err: any) {
    console.error('Error processing PayFast ITN:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

