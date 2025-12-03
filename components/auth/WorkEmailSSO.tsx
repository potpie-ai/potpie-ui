'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/sso/unified-auth';
import { LinkProviderDialog } from './LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';

interface WorkEmailSSOProps {
  email: string;
  onNeedsLinking?: (response: SSOLoginResponse) => void;
  onSuccess?: () => void;
}

function WorkEmailSSOContent({ email, onNeedsLinking, onSuccess }: WorkEmailSSOProps) {
  const router = useRouter();
  const { instance: msalInstance } = useMsal();
  const [linkingData, setLinkingData] = useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);

  // Detect which SSO provider to use based on email domain
  const detectProvider = (emailDomain: string): 'google' | 'azure' => {
    const domain = emailDomain.toLowerCase();
    
    // Microsoft domains
    const microsoftDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
    if (microsoftDomains.includes(domain)) {
      return 'azure';
    }
    
    // Default to Google (most common for work emails)
    return 'google';
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
        const userInfo = await userInfoResponse.json();

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
        console.error('Google SSO error:', error);
        toast.error(error.response?.data?.error || 'Google sign-in failed');
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled or failed');
    },
  });

  const handleAzureLogin = async () => {
    try {
      const loginResponse = await msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
      });

      const account = loginResponse.account;
      const idToken = loginResponse.idToken;

      // Verify email matches
      if (account.username.toLowerCase() !== email.toLowerCase()) {
        toast.error('Email does not match. Please use the correct email.');
        return;
      }

      // Send to backend
      const response = await authClient.ssoLogin(
        account.username,
        'azure',
        idToken,
        {
          oid: account.localAccountId,
          name: account.name,
          preferred_username: account.username,
        }
      );

      handleSSOResponse(response);
    } catch (error: any) {
      console.error('Azure SSO error:', error);
      toast.error(error.response?.data?.error || 'Azure sign-in failed');
    }
  };

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
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-gray-700 font-medium">Continue with Google</span>
        </button>
      ) : (
        <button
          onClick={handleAzureLogin}
          className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23">
            <path fill="#f25022" d="M0 0h11v11H0z" />
            <path fill="#00a4ef" d="M12 0h11v11H12z" />
            <path fill="#7fba00" d="M0 12h11v11H0z" />
            <path fill="#ffb900" d="M12 12h11v11H12z" />
          </svg>
          <span className="text-gray-700 font-medium">Continue with Microsoft</span>
        </button>
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
    return (
      <div className="text-red-600 text-sm">
        Google SSO not configured. Please set NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID
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

