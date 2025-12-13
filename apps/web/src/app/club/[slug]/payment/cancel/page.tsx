import { redirect } from 'next/navigation';

interface PaymentCancelPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentId?: string; [key: string]: string | string[] | undefined }>;
}

export default async function PaymentCancelPage({ params, searchParams }: PaymentCancelPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const paymentId = searchParamsResolved.paymentId as string | undefined;

  // Update payment status to cancelled if paymentId provided
  if (paymentId) {
    const { getSupabaseServerClient } = await import('@/lib/supabase');
    const supabase = getSupabaseServerClient();
    
    await supabase
      .from('Payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId);
  }

  // Redirect back to confirm page with cancellation message
  redirect(`/club/${slug}/confirm?payment=cancelled${paymentId ? `&paymentId=${paymentId}` : ''}`);
}



