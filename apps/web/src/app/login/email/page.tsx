import { Suspense } from 'react';
import { EmailAuth } from '@/components/EmailAuth';

export default function EmailLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailAuth />
    </Suspense>
  );
}


