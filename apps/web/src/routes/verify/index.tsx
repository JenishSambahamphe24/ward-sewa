import { createFileRoute } from '@tanstack/react-router';
import { VerifyForm } from '@/features/verify/verify-form.tsx';
import { VerifyPage } from '@/features/verify/verify-page.tsx';

export const Route = createFileRoute('/verify/')({
  component: () => (
    <VerifyPage>
      <VerifyForm />
    </VerifyPage>
  ),
});
