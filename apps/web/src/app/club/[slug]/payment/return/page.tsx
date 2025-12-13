import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase';

interface PaymentReturnPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentId?: string; [key: string]: string | string[] | undefined }>;
}

export default async function PaymentReturnPage({ params, searchParams }: PaymentReturnPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const paymentId = searchParamsResolved.paymentId as string | undefined;

  if (!paymentId) {
    redirect(`/club/${slug}/confirm?error=missing_payment_id`);
  }

  // Check payment status
  const supabase = getSupabaseServerClient();
  const { data: payment, error } = await supabase
    .from('Payments')
    .select('*, Bookings!inner(id)')
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    redirect(`/club/${slug}/confirm?error=payment_not_found`);
  }

  // Redirect based on payment status
  if (payment.status === 'completed') {
    // Payment successful - redirect to booking confirmation
    redirect(`/club/${slug}/booking/${payment.bookingId}?payment=success`);
  } else if (payment.status === 'failed' || payment.status === 'cancelled') {
    // Payment failed or cancelled
    redirect(`/club/${slug}/confirm?error=payment_${payment.status}&paymentId=${paymentId}`);
  } else {
    // Payment still pending - redirect back to confirm page
    redirect(`/club/${slug}/confirm?payment=pending&paymentId=${paymentId}`);
  }
}



