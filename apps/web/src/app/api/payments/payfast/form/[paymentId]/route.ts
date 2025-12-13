import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getPayFastConfig, generatePayFastSignature } from '@/lib/payfast';

/**
 * API Route: PayFast Payment Form (Embedded)
 * 
 * Renders an HTML page with a PayFast form that auto-submits
 * This is designed to be embedded in an iframe
 * GET /api/payments/payfast/form/[paymentId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const supabase = getSupabaseServerClient();

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('Payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return new NextResponse('Payment not found', { status: 404 });
    }

    const payfastData = (payment.payfastResponse as any) || {};
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Get current PayFast config to ensure we have merchant credentials
    const config = getPayFastConfig();
    
    // Validate that merchant credentials are configured
    if (!config.merchantId || !config.merchantKey) {
      return new NextResponse(
        'PayFast merchant credentials are not configured. Please set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables.',
        { status: 500 }
      );
    }
    
    // Determine PayFast URL from sandbox mode
    const isSandbox = config.sandbox;
    
    // Get the onsite UUID from payment record (if available)
    const onsiteUuid = payment.payfastPaymentId;
    
    // Check if we have onsite UUID, otherwise use regular form submission
    let onsitePaymentUrl: string | null = null;
    if (onsiteUuid && onsiteUuid.length > 30) { // UUIDs are typically 36 chars
      // PayFast onsite payment URL - this will show the card input form
      onsitePaymentUrl = isSandbox
        ? `https://sandbox.payfast.co.za/onsite/payments/${onsiteUuid}`
        : `https://www.payfast.co.za/onsite/payments/${onsiteUuid}`;
    }

    // If no onsite UUID, use regular form submission
    const payfastUrl = isSandbox 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Use API routes for iframe return/cancel (on-page flow)
    const returnUrl = `${baseUrl}/api/payments/payfast/return?paymentId=${paymentId}`;
    const cancelUrl = `${baseUrl}/api/payments/payfast/cancel?paymentId=${paymentId}`;
    
    // Update payfastData with correct return/cancel URLs and ensure merchant credentials are included
    const updatedPayfastData: Record<string, string> = {
      ...payfastData,
      merchant_id: config.merchantId, // Always include from current config
      merchant_key: config.merchantKey, // Always include from current config
      return_url: returnUrl,
      cancel_url: cancelUrl,
    };
    
    // Remove empty values and regenerate signature with current data and passphrase
    const cleanData: Record<string, string> = {};
    for (const [key, value] of Object.entries(updatedPayfastData)) {
      if (key === 'signature') continue; // Don't include old signature
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        cleanData[key] = String(value).trim();
      }
    }
    
    // Regenerate signature with current data and passphrase
    const newSignature = generatePayFastSignature(cleanData, config.passPhrase);
    cleanData.signature = newSignature;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayFast Payment</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    p {
      margin: 0;
      opacity: 0.9;
    }
    .payfast-container {
      width: 100%;
      height: 100vh;
      border: none;
      display: none;
    }
    .payfast-container.active {
      display: block;
    }
    .error-container {
      display: none;
      padding: 2rem;
      text-align: center;
      color: #ef4444;
    }
    .error-container.active {
      display: block;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading-container">
    <div class="spinner"></div>
    <h1>Loading Payment...</h1>
    <p>Please wait while we connect to PayFast</p>
  </div>
  
  <iframe 
    id="payfast-iframe" 
    class="payfast-container"
    name="payfast-iframe"
    ${onsitePaymentUrl ? `src="${onsitePaymentUrl}"` : ''}
    title="PayFast Payment"
    allow="payment"
    sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups allow-modals"
  ></iframe>
  
  ${!onsitePaymentUrl ? `
  <form id="payfast-form" method="POST" action="${payfastUrl}" target="payfast-iframe" style="display: none;">
    ${Object.entries(cleanData)
      .filter(([key]) => key !== 'notify_url') // Don't include notify_url in form (it's for webhooks)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === '') return '';
        // Escape HTML special characters
        const escapedValue = String(value)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<input type="hidden" name="${key}" value="${escapedValue}">`;
      })
      .join('\n')}
  </form>
  ` : ''}
  
  <div id="error" class="error-container">
    <h2>Payment Error</h2>
    <p id="error-message">An error occurred while loading the payment form.</p>
  </div>

  <script>
    (function() {
      const iframe = document.getElementById('payfast-iframe');
      const loading = document.getElementById('loading');
      const error = document.getElementById('error');
      const errorMessage = document.getElementById('error-message');
      
      // Notify parent that payment form is loading
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'PAYFAST_LOADING', paymentId: '${paymentId}' }, '*');
      }
      
      ${!onsitePaymentUrl ? `
      // Auto-submit form if using regular flow
      const form = document.getElementById('payfast-form');
      if (form) {
        setTimeout(function() {
          try {
            form.submit();
          } catch (e) {
            loading.style.display = 'none';
            error.classList.add('active');
            errorMessage.textContent = 'Failed to submit payment form: ' + e.message;
            
            if (window.parent !== window) {
              window.parent.postMessage({ 
                type: 'PAYFAST_ERROR', 
                paymentId: '${paymentId}',
                error: e.message
              }, '*');
            }
          }
        }, 500);
      }
      ` : ''}
      
      // Handle iframe load
      iframe.onload = function() {
        loading.style.display = 'none';
        iframe.classList.add('active');
        
        // Notify parent that payment form is loaded
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'PAYFAST_LOADED', paymentId: '${paymentId}' }, '*');
        }
        
        // Check if iframe has been redirected to return/cancel URL
        try {
          const iframeUrl = iframe.contentWindow.location.href;
          
          // If redirected to return/cancel URL, handle it
          if (iframeUrl.includes('/api/payments/payfast/return') || 
              iframeUrl.includes('/api/payments/payfast/cancel') ||
              iframeUrl.includes('/payment/return') ||
              iframeUrl.includes('/payment/cancel')) {
            // Payment completed or cancelled
            if (window.parent !== window) {
              window.parent.postMessage({ 
                type: 'PAYFAST_COMPLETE', 
                paymentId: '${paymentId}',
                url: iframeUrl
              }, '*');
            }
          }
        } catch (e) {
          // Cross-origin - can't access iframe content, which is expected for PayFast
          // PayFast will handle the redirect and we'll catch it via message events
        }
      };
      
      // Handle iframe errors
      iframe.onerror = function() {
        loading.style.display = 'none';
        error.classList.add('active');
        errorMessage.textContent = 'Failed to load payment form. Please try again.';
        
        if (window.parent !== window) {
          window.parent.postMessage({ 
            type: 'PAYFAST_ERROR', 
            paymentId: '${paymentId}',
            error: 'Failed to load payment form'
          }, '*');
        }
      };
      
      // Listen for messages from iframe (if PayFast redirects to our return page)
      window.addEventListener('message', function(event) {
        // Accept messages from PayFast domains or our own domain
        const allowedOrigins = [
          'https://sandbox.payfast.co.za',
          'https://www.payfast.co.za',
          '${baseUrl}'
        ];
        
        // For security, you might want to verify origin
        // if (!allowedOrigins.some(origin => event.origin.includes(origin))) return;
        
        if (event.data && event.data.type === 'PAYFAST_RETURN') {
          if (window.parent !== window) {
            window.parent.postMessage({ 
              type: 'PAYFAST_COMPLETE', 
              paymentId: event.data.paymentId,
              url: event.data.url
            }, '*');
          }
        }
      });
      
      // Poll for URL changes (fallback method)
      let lastUrl = '';
      setInterval(function() {
        try {
          const currentUrl = iframe.contentWindow.location.href;
          if (currentUrl !== lastUrl && currentUrl !== 'about:blank') {
            lastUrl = currentUrl;
            
            if (currentUrl.includes('/api/payments/payfast/return') || 
                currentUrl.includes('/api/payments/payfast/cancel')) {
              if (window.parent !== window) {
                window.parent.postMessage({ 
                  type: 'PAYFAST_COMPLETE', 
                  paymentId: '${paymentId}',
                  url: currentUrl
                }, '*');
              }
            }
          }
        } catch (e) {
          // Cross-origin - ignore
        }
      }, 1000);
    })();
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN', // Allow embedding in same origin
      },
    });
  } catch (err: any) {
    console.error('Error rendering payment form:', err);
    return new NextResponse('Error loading payment form', { status: 500 });
  }
}

