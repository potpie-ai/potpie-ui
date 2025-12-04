'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { WorkEmailButton } from '@/components/auth/WorkEmailButton';
import { WorkEmailSSO } from '@/components/auth/WorkEmailSSO';
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';

export default function SSOLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [showSSOButton, setShowSSOButton] = useState(false);
  const [linkingData, setLinkingData] = useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);

  const handleEmailSubmit = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setShowSSOButton(true);
  };

  const handleNeedsLinking = (response: SSOLoginResponse) => {
    setLinkingData(response);
    setShowLinkingDialog(true);
  };

  const handleLinked = () => {
    router.push('/dashboard');
  };

  const handleSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID || ''}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                Sign in to Potpie
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Use your work email to sign in with SSO
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {!showSSOButton ? (
                <WorkEmailButton
                  onEmailSubmit={handleEmailSubmit}
                />
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 text-center">
                    Sign in with: <span className="font-medium">{email}</span>
                  </div>
                  <WorkEmailSSO
                    email={email}
                    onNeedsLinking={handleNeedsLinking}
                    onSuccess={handleSuccess}
                  />
                  <button
                    onClick={() => {
                      setShowSSOButton(false);
                      setEmail('');
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Use different email
                  </button>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-50 px-2 text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/sign-in')}
                className="w-full px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign in with GitHub
              </button>
            </div>
          </div>
        </div>

        {linkingData && (
          <LinkProviderDialog
            isOpen={showLinkingDialog}
            onClose={() => setShowLinkingDialog(false)}
            linkingData={linkingData}
            onLinked={handleLinked}
          />
        )}
    </GoogleOAuthProvider>
  );
}

