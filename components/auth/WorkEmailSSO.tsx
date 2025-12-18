'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { authClient } from '@/lib/sso/unified-auth';
import { LinkProviderDialog } from './LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';
import Image from 'next/image';

interface WorkEmailSSOProps {
  email: string;
  onNeedsLinking?: (response: SSOLoginResponse) => void;
  onSuccess?: () => void;
}

function WorkEmailSSOContent({ email, onNeedsLinking, onSuccess }: WorkEmailSSOProps) {
  const router = useRouter();
  const [linkingData, setLinkingData] = useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);

  // Detect which SSO provider to use based on email domain
  const detectProvider = (emailDomain: string): 'google' | 'both' => {
    const domain = emailDomain.toLowerCase();
    
    // Google domains - use Google
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return 'google';
    }
    
    // For work emails with custom domains, show Google option
    return 'both';
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        // Check if response is successful before parsing JSON
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          const errorMessage = `Failed to fetch user info from Google: ${userInfoResponse.status} ${userInfoResponse.statusText}${errorText ? ` - ${errorText}` : ''}`;
          if (process.env.NODE_ENV === 'development') {
            console.error('Google userinfo API error:', errorMessage);
          }
          toast.error('Google sign-in failed. Please try again.');
          return;
        }

        // Parse JSON only if response is successful
        let userInfo;
        try {
          userInfo = await userInfoResponse.json();
        } catch (jsonError: any) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse Google userinfo response:', jsonError);
          }
          toast.error('Invalid response from Google. Please try again.');
          return;
        }

        // Verify email matches
        if (userInfo.email.toLowerCase() !== email.toLowerCase()) {
          toast.error('Email does not match. Please use the correct email.');
          return;
        }

        // Send to backend
        const response = await authClient.ssoLogin(
          userInfo.email,
          'google',
          tokenResponse.access_token,
          {
            sub: userInfo.sub,
            name: userInfo.name,
            given_name: userInfo.given_name,
            family_name: userInfo.family_name,
            picture: userInfo.picture,
          }
        );

        handleSSOResponse(response);
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Google SSO error:', error);
        }
        toast.error('Google sign-in failed. Please try again.');
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled or failed');
    },
  });

  const handleSSOResponse = (response: SSOLoginResponse) => {
    if (response.status === 'success') {
      toast.success('Signed in successfully');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } else if (response.status === 'needs_linking') {
      setLinkingData(response);
      setShowLinkingDialog(true);
      if (onNeedsLinking) {
        onNeedsLinking(response);
      }
    } else if (response.status === 'new_user') {
      toast.success('Welcome! Account created');
      router.push('/onboarding');
    }
  };

  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const provider = detectProvider(emailDomain);

  return (
    <>
      {provider === 'google' ? (
        <button
          onClick={() => handleGoogleLogin()}
          className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
        >
          <Image
            src="/images/google-g-2015.svg"
            alt="Google"
            width={20}
            height={20}
            className="mr-2"
          />
          <span className="text-gray-700 font-medium">Continue with Google</span>
        </button>
      ) : (
        // Show Google option for work emails
        <div className="space-y-3">
          <button
            onClick={() => handleGoogleLogin()}
            className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
          >
            <Image
              src="/images/google-g-2015.svg"
              alt="Google"
              width={20}
              height={20}
              className="mr-2"
            />
            <span className="text-gray-700 font-medium">Continue with Google</span>
          </button>
        </div>
      )}

      {linkingData && (
        <LinkProviderDialog
          isOpen={showLinkingDialog}
          onClose={() => setShowLinkingDialog(false)}
          linkingData={linkingData}
          onLinked={() => {
            router.push('/dashboard');
          }}
        />
      )}
    </>
  );
}

export function WorkEmailSSO({ email, onNeedsLinking, onSuccess }: WorkEmailSSOProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID;

  if (!googleClientId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Google SSO not configured: NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID is missing');
    }
    return (
      <div className="text-red-600 text-sm">
        Google SSO is not configured
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <WorkEmailSSOContent
        email={email}
        onNeedsLinking={onNeedsLinking}
        onSuccess={onSuccess}
      />
    </GoogleOAuthProvider>
  );
}

