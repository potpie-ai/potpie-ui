'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/configs/Firebase-config';
import { authClient } from '@/lib/sso/unified-auth';
import { LinkProviderDialog } from './LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';
import { getUserFriendlyError } from '@/lib/utils/errorMessages';

interface DirectSSOButtonsProps {
  onNeedsLinking?: (response: SSOLoginResponse) => void;
  onSuccess?: (response?: SSOLoginResponse) => void;
  onNewUser?: (response: SSOLoginResponse) => void;
  isSignUpPage?: boolean; // Flag to indicate if this is on sign-up page
}

function DirectSSOButtonsContent({ onNeedsLinking, onSuccess, onNewUser, isSignUpPage = false }: DirectSSOButtonsProps) {
  const router = useRouter();
  const [linkingData, setLinkingData] = useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = useState(false);

  const handleSSOResponse = async (response: SSOLoginResponse) => {
    // Create Firebase session if custom token is provided
    if (response.firebase_token) {
      try {
        await signInWithCustomToken(auth, response.firebase_token);
      } catch (error: any) {
        toast.error(getUserFriendlyError(error));
        return;
      }
    }
    
    if (response.status === 'success') {
      // Only show success toast if not on sign-up page (where we'll show error instead)
      if (!isSignUpPage) {
        toast.success('You\'re in! Welcome back.');
      }
      if (onSuccess) {
        onSuccess(response);
      } else {
        router.push('/newchat');
      }
    } else if (response.status === 'needs_linking') {
      setLinkingData(response);
      setShowLinkingDialog(true);
      if (onNeedsLinking) {
        onNeedsLinking(response);
      }
    } else if (response.status === 'new_user') {
      toast.success('Welcome aboard! Let\'s get you started.');
      if (onNewUser) {
        onNewUser(response);
      } else {
        // Get URL parameters for plan, prompt, agent_id
        const urlSearchParams = new URLSearchParams(window.location.search);
        const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
        const prompt = urlSearchParams.get("prompt") || "";
        const agent_id = urlSearchParams.get("agent_id") || "";
        
        // Redirect to onboarding with user info from SSO response
        const onboardingParams = new URLSearchParams({
          ...(response.user_id && { uid: response.user_id }),
          ...(response.email && { email: response.email }),
          ...(response.display_name && { name: response.display_name }),
          ...(plan && { plan }),
          ...(prompt && { prompt }),
          ...(agent_id && { agent_id }),
        });
        
        const onboardingUrl = `/onboarding?${onboardingParams.toString()}`;
        router.push(onboardingUrl);
      }
    } else {
      toast.error('Hmm, something unexpected happened. Mind trying again?');
    }
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
        toast.error(getUserFriendlyError(error));
      }
    },
    onError: () => {
      toast.error('No worries! Sign-in was cancelled. Try again whenever you\'re ready.');
    },
  });

  return (
    <>
      <button
        onClick={() => handleGoogleLogin()}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 h-12 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        <span className="text-gray-700 font-medium text-base">Continue with Google</span>
      </button>

      {linkingData && (
        <LinkProviderDialog
          isOpen={showLinkingDialog}
          onClose={() => setShowLinkingDialog(false)}
          linkingData={linkingData}
          onLinked={() => {
            if (onSuccess) {
              onSuccess();
            } else {
              router.push('/newchat');
            }
          }}
        />
      )}
    </>
  );
}

export function DirectSSOButtons({ onNeedsLinking, onSuccess, onNewUser, isSignUpPage = false }: DirectSSOButtonsProps) {
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
      <DirectSSOButtonsContent
        onNeedsLinking={onNeedsLinking}
        onSuccess={onSuccess}
        onNewUser={onNewUser}
        isSignUpPage={isSignUpPage}
      />
    </GoogleOAuthProvider>
  );
}

