import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * API Route: PayFast Payment Return Handler (for iframe)
 * 
 * Handles PayFast return redirect within iframe
 * GET /api/payments/payfast/return?paymentId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return new NextResponse('Payment ID required', { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Get payment record
    const { data: payment, error } = await supabase
      .from('Payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return new NextResponse('Payment not found', { status: 404 });
    }

    // Return HTML page that communicates with parent
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Return</title>
  <style>
    body {
      margin: 0;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    .success {
      color: #22c55e;
    }
    .pending {
      color: #f59e0b;
    }
    .failed {
      color: #ef4444;
    }
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    ${payment.status === 'completed' ? `
      <div class="success">
        <h2>✓ Payment Successful!</h2>
        <p>Your payment has been processed successfully.</p>
        <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">This window will close automatically...</p>
      </div>
    ` : payment.status === 'pending' ? `
      <div class="pending">
        <div class="spinner"></div>
        <h2>Payment Processing</h2>
        <p>Your payment is being processed. Please wait...</p>
      </div>
    ` : `
      <div class="failed">
        <h2>✗ Payment ${payment.status === 'failed' ? 'Failed' : 'Cancelled'}</h2>
        <p>Your payment could not be completed.</p>
      </div>
    `}
  </div>
  <script>
    // Notify parent window about payment status
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PAYFAST_RETURN',
        paymentId: '${paymentId}',
        status: '${payment.status}',
        url: window.location.href
      }, '*');
    }
    
    // Auto-close after 3 seconds if successful
    if ('${payment.status}' === 'completed') {
      setTimeout(function() {
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'PAYFAST_CLOSE',
            paymentId: '${paymentId}'
          }, '*');
        }
      }, 3000);
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (err: any) {
    console.error('Error handling payment return:', err);
    return new NextResponse('Error processing return', { status: 500 });
  }
}

