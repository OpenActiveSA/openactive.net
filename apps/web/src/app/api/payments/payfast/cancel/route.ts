import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

/**
 * API Route: PayFast Payment Cancel Handler (for iframe)
 * 
 * Handles PayFast cancel redirect within iframe
 * GET /api/payments/payfast/cancel?paymentId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');

    if (paymentId) {
      const supabase = getSupabaseServerClient();
      
      // Update payment status to cancelled
      await supabase
        .from('Payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId);
    }

    // Return HTML page that communicates with parent
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Cancelled</title>
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
    .cancelled {
      color: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="cancelled">
      <h2>Payment Cancelled</h2>
      <p>You have cancelled the payment process.</p>
      <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">This window will close automatically...</p>
    </div>
  </div>
  <script>
    // Notify parent window about cancellation
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PAYFAST_CANCEL',
        paymentId: '${paymentId || ''}',
        url: window.location.href
      }, '*');
    }
    
    // Auto-close after 2 seconds
    setTimeout(function() {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PAYFAST_CLOSE',
          paymentId: '${paymentId || ''}'
        }, '*');
      }
    }, 2000);
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
    console.error('Error handling payment cancel:', err);
    return new NextResponse('Error processing cancellation', { status: 500 });
  }
}

