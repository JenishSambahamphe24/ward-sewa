import { createFileRoute } from '@tanstack/react-router';
import { VerificationCodeHelper } from '@/features/verify/verification-code.helper.ts';
import { VerifyForm } from '@/features/verify/verify-form.tsx';
import { VerifyPage } from '@/features/verify/verify-page.tsx';
import { VerifyResult } from '@/features/verify/verify-result.tsx';

export const Route = createFileRoute('/verify/$code')({
  params: {
    parse: (params) => ({ code: VerificationCodeHelper.normalize(params.code) }),
    stringify: (params) => ({ code: params.code }),
  },
  component: VerifyCodePage,
});

function VerifyCodePage() {
  const { code } = Route.useParams();
  return (
    <VerifyPage>
      <VerifyResult code={code} />
      <VerifyForm key={code} initialCode={code} />
    </VerifyPage>
  );
}
