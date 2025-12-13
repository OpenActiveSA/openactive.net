/**
 * PayFast Integration Utilities
 * 
 * Functions to handle PayFast payment processing
 * Documentation: https://developers.payfast.co.za/docs
 */

export interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passPhrase?: string; // Optional: for secure signature generation
  sandbox: boolean; // true for sandbox, false for production
}

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first?: string;
  name_last?: string;
  email_address: string;
  cell_number?: string;
  m_payment_id: string; // Your payment ID (UUID from Payments table)
  amount: string; // Amount in ZAR (format: "100.00")
  item_name: string; // Description of the item
  item_description?: string;
  custom_int1?: string; // Can store bookingId
  custom_str1?: string; // Can store clubId
  custom_str2?: string; // Can store userId
}

export interface PayFastResponse {
  payment_id?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Get PayFast configuration from environment variables
 */
export function getPayFastConfig(): PayFastConfig {
  const merchantId = process.env.PAYFAST_MERCHANT_ID || '';
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY || '';
  const passPhrase = process.env.PAYFAST_PASSPHRASE || '';
  const sandbox = process.env.PAYFAST_SANDBOX === 'true' || !process.env.PAYFAST_MERCHANT_ID;

  if (!merchantId || !merchantKey) {
    console.warn('PayFast credentials not configured. Using sandbox mode.');
  }

  return {
    merchantId,
    merchantKey,
    passPhrase,
    sandbox,
  };
}

/**
 * Get PayFast base URL (sandbox or production)
 */
export function getPayFastUrl(sandbox: boolean): string {
  if (sandbox) {
    return 'https://sandbox.payfast.co.za/eng/process';
  }
  return 'https://www.payfast.co.za/eng/process';
}

/**
 * Get PayFast onsite process URL (sandbox or production)
 */
export function getPayFastOnsiteUrl(sandbox: boolean): string {
  if (sandbox) {
    return 'https://sandbox.payfast.co.za/onsite/process';
  }
  return 'https://www.payfast.co.za/onsite/process';
}

/**
 * Generate PayFast signature
 * PayFast uses MD5 hash of all parameters (sorted alphabetically) + passphrase
 */
export function generatePayFastSignature(data: Record<string, string>, passPhrase?: string): string {
  // PayFast requires fields in their ORIGINAL ORDER, NOT alphabetically sorted!
  // Documentation: "Do not use the API signature format, which uses alphabetical ordering!"
  
  // Build query string preserving original order (filter out empty values and signature)
  let queryString = '';
  for (const [key, value] of Object.entries(data)) {
    // Skip signature field
    if (key === 'signature') continue;
    
    // Skip empty/null/undefined values
    if (!value || value === null || value === undefined) continue;
    
    // Convert to string and trim
    const strValue = String(value).trim();
    if (strValue === '') continue;
    
    // Add to query string (preserving order)
    if (queryString) queryString += '&';
    // PayFast expects URL-encoded values
    queryString += `${key}=${encodeURIComponent(strValue)}`;
  }

  // Add passphrase if provided (appended at the end)
  if (passPhrase && passPhrase.trim() !== '') {
    queryString += `&passphrase=${encodeURIComponent(passPhrase.trim())}`;
  }

  // Generate MD5 hash (PayFast uses MD5)
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(queryString).digest('hex');
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[PayFast Signature Debug]', {
      queryStringForHash: queryString.substring(0, 300) + (queryString.length > 300 ? '...' : ''),
      hash: hash,
      hasPassphrase: !!passPhrase,
      fieldOrder: Object.keys(data).filter(k => k !== 'signature' && data[k] && String(data[k]).trim() !== ''),
    });
  }
  
  return hash;
}

/**
 * Verify PayFast signature from callback/ITN
 */
export function verifyPayFastSignature(data: Record<string, string>, passPhrase?: string): boolean {
  const receivedSignature = data.signature;
  if (!receivedSignature) {
    return false;
  }

  const calculatedSignature = generatePayFastSignature(data, passPhrase);
  return receivedSignature.toLowerCase() === calculatedSignature.toLowerCase();
}

/**
 * Build PayFast payment form data
 */
export function buildPayFastPaymentData(
  config: PayFastConfig,
  paymentData: Omit<PayFastPaymentData, 'merchant_id' | 'merchant_key'>
): PayFastPaymentData {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const data: PayFastPaymentData = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: paymentData.return_url || `${baseUrl}/club/${paymentData.custom_str1}/payment/return`,
    cancel_url: paymentData.cancel_url || `${baseUrl}/club/${paymentData.custom_str1}/payment/cancel`,
    notify_url: paymentData.notify_url || `${baseUrl}/api/payments/payfast/notify`,
    email_address: paymentData.email_address,
    m_payment_id: paymentData.m_payment_id,
    amount: parseFloat(paymentData.amount).toFixed(2), // Ensure 2 decimal places
    item_name: paymentData.item_name,
    ...paymentData,
  };

  // Generate signature
  const signature = generatePayFastSignature(data as Record<string, string>, config.passPhrase);
  (data as any).signature = signature;

  return data;
}

/**
 * Parse PayFast ITN (Instant Transaction Notification) data
 */
export function parsePayFastITN(formData: FormData | URLSearchParams): Record<string, string> {
  const data: Record<string, string> = {};
  
  if (formData instanceof FormData) {
    for (const [key, value] of formData.entries()) {
      data[key] = typeof value === 'string' ? value : value.toString();
    }
  } else if (formData instanceof URLSearchParams) {
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Get payment status from PayFast response
 */
export function getPaymentStatusFromPayFast(paymentStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  // PayFast payment statuses:
  // COMPLETE - Payment completed successfully
  // PENDING - Payment is pending
  // FAILED - Payment failed
  // CANCELLED - Payment was cancelled
  
  const status = paymentStatus.toUpperCase();
  
  switch (status) {
    case 'COMPLETE':
      return 'completed';
    case 'PENDING':
      return 'pending';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/**
 * Convert data array to query string for PayFast onsite
 * IMPORTANT: This must match generatePayFastSignature exactly (same filtering, same ORDER)
 * PayFast requires fields in ORIGINAL ORDER, NOT alphabetically sorted!
 */
export function dataToString(dataArray: Record<string, string>): string {
  // Build query string preserving original order (EXACT same logic as signature generation)
  let pfOutput = '';
  for (const [key, value] of Object.entries(dataArray)) {
    // Skip signature field (will be added at the end)
    if (key === 'signature') continue;
    
    // Skip empty/null/undefined values (same as signature generation)
    if (!value || value === null || value === undefined) continue;
    
    // Convert to string and trim (same as signature generation)
    const strValue = String(value).trim();
    if (strValue === '') continue;
    
    // Add to query string (preserving order, same encoding as signature generation)
    if (pfOutput) pfOutput += '&';
    pfOutput += `${key}=${encodeURIComponent(strValue)}`;
  }
  
  // Add signature at the end (signature is calculated on data WITHOUT signature field)
  if (dataArray.signature && dataArray.signature.trim() !== '') {
    pfOutput += `&signature=${encodeURIComponent(dataArray.signature.trim())}`;
  }
  
  return pfOutput;
}

/**
 * Generate PayFast onsite payment identifier (UUID)
 * This calls PayFast's onsite/process endpoint to get a UUID for the modal
 */
export async function generatePayFastOnsiteIdentifier(
  config: PayFastConfig,
  paymentData: Omit<PayFastPaymentData, 'merchant_id' | 'merchant_key'>
): Promise<string | null> {
  // Validate that merchant credentials are configured
  if (!config.merchantId || !config.merchantKey) {
    throw new Error('PayFast merchant credentials (merchant_id and merchant_key) are required but not configured. Please set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables.');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const slug = paymentData.custom_str1 || 'club';
  
  // Build payment data in PayFast's expected order
  // PayFast requires fields in a specific order for signature generation
  // Order: merchant_id, merchant_key, return_url, cancel_url, notify_url, 
  //        name_first, name_last, email_address, cell_number, m_payment_id,
  //        amount, item_name, item_description, custom_int1, custom_str1, custom_str2
  const data: PayFastPaymentData = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: paymentData.return_url || `${baseUrl}/club/${slug}/payment/return`,
    cancel_url: paymentData.cancel_url || `${baseUrl}/club/${slug}/payment/cancel`,
    notify_url: paymentData.notify_url || `${baseUrl}/api/payments/payfast/notify`,
    name_first: paymentData.name_first || '',
    name_last: paymentData.name_last || '',
    email_address: paymentData.email_address,
    cell_number: paymentData.cell_number || '',
    m_payment_id: paymentData.m_payment_id,
    amount: parseFloat(paymentData.amount).toFixed(2),
    item_name: paymentData.item_name,
    item_description: paymentData.item_description || '',
    custom_int1: paymentData.custom_int1 || '',
    custom_str1: paymentData.custom_str1 || '',
    custom_str2: paymentData.custom_str2 || '',
  };
  
  console.log('PayFast onsite data (merchant_id/merchant_key included):', {
    merchant_id: data.merchant_id ? '***' + data.merchant_id.slice(-4) : 'MISSING',
    merchant_key: data.merchant_key ? '***' + data.merchant_key.slice(-4) : 'MISSING',
    amount: data.amount,
    email: data.email_address,
  });

  // Generate signature
  const signature = generatePayFastSignature(data as Record<string, string>, config.passPhrase);
  (data as any).signature = signature;

  // Convert to query string
  const pfParamString = dataToString(data as Record<string, string>);

  // Debug: Log the exact data being sent (for troubleshooting signature issues)
  console.log('[PayFast Onsite Debug]', {
    hasPassphrase: !!config.passPhrase,
    passphraseValue: config.passPhrase ? '***' + config.passPhrase.slice(-4) : 'none',
    signature: signature,
    dataKeys: Object.keys(data).sort(),
    queryStringLength: pfParamString.length,
    queryStringPreview: pfParamString.substring(0, 300),
    // Show what data will be used for signature (without signature field)
    dataForSignature: Object.keys(data).filter(k => k !== 'signature').sort().map(k => `${k}=${String(data[k]).substring(0, 20)}...`),
  });

  // Call PayFast onsite endpoint
  const onsiteUrl = getPayFastOnsiteUrl(config.sandbox);
  
  try {
    const response = await fetch(onsiteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: pfParamString,
    });

    const responseText = await response.text();
    console.log('PayFast onsite response status:', response.status);
    console.log('PayFast onsite response text:', responseText);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse PayFast response as JSON:', responseText);
      throw new Error(`PayFast returned invalid response: ${responseText.substring(0, 200)}`);
    }

    if (result.uuid) {
      return result.uuid;
    }

    // Check for error messages in response
    if (result.error) {
      console.error('PayFast onsite error:', result.error);
      throw new Error(`PayFast error: ${result.error}`);
    }

    if (result.status && result.status !== 'success') {
      console.error('PayFast onsite failed:', result);
      throw new Error(`PayFast returned status: ${result.status}`);
    }

    console.error('PayFast onsite UUID generation failed - no UUID in response:', result);
    throw new Error('PayFast did not return a UUID');
  } catch (error: any) {
    console.error('Error generating PayFast onsite identifier:', error);
    throw error; // Re-throw to get better error messages
  }
}

