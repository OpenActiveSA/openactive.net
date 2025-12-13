import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getPayFastConfig, buildPayFastPaymentData, getPayFastUrl, generatePayFastOnsiteIdentifier } from '@/lib/payfast';

/**
 * API Route: Initiate PayFast Payment
 * 
 * Creates a payment record and returns PayFast payment URL
 * POST /api/payments/payfast/initiate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, clubId, userId, amount, itemName, itemDescription, userEmail, userName, userPhone } = body;

    // Validate required fields (bookingId is optional for test payments)
    if (!clubId || !userId || !amount || !itemName || !userEmail) {
      console.error('Missing required fields:', { clubId, userId, amount, itemName, userEmail, bookingId });
      return NextResponse.json(
        { error: 'Missing required fields: clubId, userId, amount, itemName, userEmail' },
        { status: 400 }
      );
    }

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const config = getPayFastConfig();

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('Payments')
      .insert({
        clubId,
        userId,
        bookingId: bookingId || null, // Optional - null for test payments
        amount: paymentAmount,
        currency: 'ZAR',
        status: 'pending',
        provider: 'payfast',
        itemName,
        itemDescription: itemDescription || null,
        payerEmail: userEmail,
        payerName: userName || null,
        payerPhone: userPhone || null,
        payfastMerchantId: config.merchantId,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', {
        message: paymentError.message,
        details: paymentError.details,
        hint: paymentError.hint,
        code: paymentError.code,
        fullError: paymentError,
      });
      
      // Check if it's an RLS (Row Level Security) error
      const isRLSError = paymentError.code === '42501' || 
                        paymentError.message?.includes('permission denied') ||
                        paymentError.message?.includes('row-level security');
      
      if (isRLSError) {
        return NextResponse.json(
          { 
            error: 'Failed to create payment record', 
            details: 'Database permissions error. The service_role key is required for server-side payment creation.',
            hint: 'Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file',
            code: paymentError.code,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create payment record', 
          details: paymentError.message,
          hint: paymentError.hint,
          code: paymentError.code,
        },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Build PayFast payment data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const slug = body.slug || 'club';

    // Use API routes for iframe return/cancel (on-page flow)
    const paymentData = {
      return_url: `${baseUrl}/api/payments/payfast/return?paymentId=${payment.id}`,
      cancel_url: `${baseUrl}/api/payments/payfast/cancel?paymentId=${payment.id}`,
      notify_url: `${baseUrl}/api/payments/payfast/notify`,
      email_address: userEmail,
      name_first: userName?.split(' ')[0] || '',
      name_last: userName?.split(' ').slice(1).join(' ') || '',
      cell_number: userPhone || '',
      m_payment_id: payment.id, // Use payment UUID as PayFast payment ID
      amount: paymentAmount.toFixed(2),
      item_name: itemName,
      item_description: itemDescription || '',
      custom_int1: bookingId || '', // Store bookingId in custom field (empty for test payments)
      custom_str1: clubId, // Store clubId
      custom_str2: userId, // Store userId
    };

    // Use PayFast onsite payment method for on-page embedding
    // This generates a UUID that allows embedding the payment form
    let onsiteUuid: string | null = null;
    let onsiteError: any = null;
    try {
      onsiteUuid = await generatePayFastOnsiteIdentifier(config, paymentData);
    } catch (error: any) {
      onsiteError = error;
      console.error('Error generating PayFast onsite UUID:', error);
      // Fallback to regular payment flow if onsite fails
      // This might happen if onsite payments aren't enabled for the merchant account
      console.log('Falling back to regular PayFast payment flow');
    }

    // If onsite payment fails, fall back to regular form submission
    if (!onsiteUuid) {
      console.log('Using regular PayFast payment flow (form submission)');
      
      // Build PayFast payment data for regular form submission
      const payfastData = buildPayFastPaymentData(config, paymentData);
      const payfastUrl = getPayFastUrl(config.sandbox);

      // Update payment record with PayFast data
      await supabase
        .from('Payments')
        .update({
          payfastResponse: payfastData as any,
          returnUrl: payfastData.return_url,
          cancelUrl: payfastData.cancel_url,
          notifyUrl: payfastData.notify_url,
        })
        .eq('id', payment.id);

      // Return payment form URL for iframe embedding (will use form submission)
      // Note: Regular PayFast forms may redirect away from iframe due to X-Frame-Options
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        paymentFormUrl: `/api/payments/payfast/form/${payment.id}`,
        embedded: true,
        onsite: false, // Indicates we're using regular flow
        warning: onsiteError ? `Onsite payment unavailable: ${onsiteError.message}. Using regular flow.` : undefined,
      });
    }

    // Build PayFast payment data for reference
    const payfastData = buildPayFastPaymentData(config, paymentData);

    // Update payment record with PayFast data and UUID
    await supabase
      .from('Payments')
      .update({
        payfastResponse: payfastData as any,
        returnUrl: payfastData.return_url,
        cancelUrl: payfastData.cancel_url,
        notifyUrl: payfastData.notify_url,
        payfastPaymentId: onsiteUuid, // Store the onsite UUID
      })
      .eq('id', payment.id);

    // Return onsite payment URL for iframe embedding
    const onsitePaymentUrl = config.sandbox
      ? `https://sandbox.payfast.co.za/onsite/payments/${onsiteUuid}`
      : `https://www.payfast.co.za/onsite/payments/${onsiteUuid}`;

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentFormUrl: `/api/payments/payfast/form/${payment.id}`, // Route that renders the iframe wrapper
      onsiteUuid,
      onsitePaymentUrl, // Direct PayFast onsite payment URL
      embedded: true,
    });
  } catch (err: any) {
    console.error('Error initiating PayFast payment:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

