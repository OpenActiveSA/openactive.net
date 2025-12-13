'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import styles from '@/styles/admin.module.css';

interface PaymentTestPageProps {
  params: Promise<{ slug: string }>;
}

export default function PaymentTestPage({ params }: PaymentTestPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [amount, setAmount] = useState('100.00');
  const [itemName, setItemName] = useState('Test Payment');
  const [itemDescription, setItemDescription] = useState('Testing PayFast integration');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);

  // Load club ID from slug
  useEffect(() => {
    const loadClub = async () => {
      try {
        const supabase = getSupabaseClientClient();
        const { data: clubs } = await supabase
          .from('Clubs')
          .select('id, name')
          .eq('is_active', true);
        
        if (clubs) {
          const foundClub = clubs.find(c => generateSlug(c.name) === slug);
          if (foundClub) {
            setClubId(foundClub.id);
          }
        }
      } catch (err) {
        console.error('Error loading club:', err);
      }
    };
    
    if (slug) {
      loadClub();
    }
  }, [slug]);

  const [showPaymentFrame, setShowPaymentFrame] = useState(false);
  const [paymentFormUrl, setPaymentFormUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Listen for messages from payment iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin (PayFast will redirect)
      if (event.data && event.data.type) {
        const { type, paymentId: msgPaymentId, status, error } = event.data;
        
        if (msgPaymentId !== paymentId) return; // Ignore messages for other payments
        
        switch (type) {
          case 'PAYFAST_LOADING':
            setSuccess('Loading payment form...');
            break;
          case 'PAYFAST_LOADED':
            setSuccess('Payment form loaded. Please complete your payment.');
            break;
          case 'PAYFAST_COMPLETE':
          case 'PAYFAST_RETURN':
            setShowPaymentFrame(false);
            if (status === 'completed') {
              setSuccess('Payment completed successfully! Check the Payments table in your database.');
              setError('');
            } else if (status === 'pending') {
              setSuccess('Payment is being processed. Please wait for confirmation.');
            } else {
              setError(`Payment ${status}. Please try again.`);
            }
            break;
          case 'PAYFAST_CANCEL':
            setShowPaymentFrame(false);
            setError('Payment was cancelled.');
            setSuccess('');
            break;
          case 'PAYFAST_ERROR':
            setShowPaymentFrame(false);
            setError(error || 'An error occurred during payment processing.');
            setSuccess('');
            break;
          case 'PAYFAST_CLOSE':
            // Optionally close the iframe
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [paymentId]);

  const handleTestPayment = async () => {
    if (!user) {
      setError('You must be logged in to test payments');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!itemName) {
      setError('Please enter an item name');
      return;
    }

    if (!userEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!clubId) {
      setError('Club not found. Please wait for the page to load.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Initiate payment
      const response = await fetch('/api/payments/payfast/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: null, // No booking for test
          clubId: clubId,
          userId: user.id,
          slug: slug,
          amount: parseFloat(amount),
          itemName: itemName,
          itemDescription: itemDescription,
          userEmail: userEmail,
          userName: userName || userEmail.split('@')[0],
          userPhone: userPhone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      if (!result.paymentFormUrl) {
        throw new Error('Failed to get payment form URL');
      }

      setPaymentId(result.paymentId);
      setSuccess(`Payment initiated! Payment ID: ${result.paymentId}`);
      setPaymentFormUrl(result.paymentFormUrl);
      setShowPaymentFrame(true);
      setIsLoading(false);
      
    } catch (err: any) {
      console.error('Error initiating test payment:', err);
      setError(err.message || 'Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e27',
      color: '#ffffff',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '8px',
        }}>
          Payment Test Page
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '32px',
        }}>
          Test PayFast payment integration (on-page - no popup)
        </p>

        {showPaymentFrame && paymentFormUrl && (
          <div style={{
            marginBottom: '32px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                color: '#ffffff',
              }}>
                Payment Gateway
              </h2>
            </div>
            <iframe
              src={paymentFormUrl}
              style={{
                width: '100%',
                height: '800px',
                border: 'none',
                display: 'block',
                backgroundColor: '#ffffff',
              }}
              title="PayFast Payment"
              allow="payment"
              sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups allow-modals"
            />
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#22c55e',
          }}>
            {success}
          </div>
        )}

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '32px',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Amount (ZAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
              placeholder="100.00"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Item Name
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
              placeholder="Test Payment"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Item Description
            </label>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical',
              }}
              placeholder="Testing PayFast integration"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
              placeholder="test@example.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Name (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
              placeholder="John Doe"
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
              placeholder="+27 12 345 6789"
            />
          </div>

          <button
            onClick={handleTestPayment}
            disabled={isLoading || showPaymentFrame}
            style={{
              width: '100%',
              padding: '14px 24px',
              backgroundColor: isLoading || showPaymentFrame ? 'rgba(102, 126, 234, 0.5)' : '#667eea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || showPaymentFrame ? 'not-allowed' : 'pointer',
              opacity: isLoading || showPaymentFrame ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Processing...' : showPaymentFrame ? 'Payment Processing...' : 'Test PayFast Payment'}
          </button>

          <div style={{
            marginTop: '32px',
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#ffffff',
            }}>
              Testing Instructions
            </h3>
            <ul style={{
              listStyle: 'disc',
              paddingLeft: '20px',
              lineHeight: '1.8',
            }}>
              <li>Fill in the payment details above</li>
              <li>Click "Test PayFast Payment" to initiate a test payment</li>
              <li>The PayFast payment form will appear on this page (no popup)</li>
              <li>Complete the payment within the embedded form</li>
              <li>Use PayFast test cards for sandbox testing</li>
              <li>After payment, you'll see the result on this page</li>
              <li>Check the Payments table in your database to see the payment record</li>
            </ul>
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '4px',
            }}>
              <strong>Sandbox Test Card:</strong> 5200 8282 8282 8210 (any CVV, any future expiry date)
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
        }}>
          <button
            onClick={() => router.push(`/club/${slug}/admin`)}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    </div>
  );
}

