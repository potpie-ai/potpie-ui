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
import Image from 'next/image';

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
    if (process.env.NODE_ENV === 'development') {
      console.log('=== SSO Response Debug ===');
      console.log('Full SSO Response:', JSON.stringify(response, null, 2));
      console.log('Response Status:', response.status);
      console.log('Response user_id:', response.user_id);
      console.log('Response email:', response.email);
      console.log('Has onNewUser callback:', !!onNewUser);
      console.log('Has onSuccess callback:', !!onSuccess);
    }
    
    // Create Firebase session if custom token is provided
    if (response.firebase_token) {
      try {
        await signInWithCustomToken(auth, response.firebase_token);
        if (process.env.NODE_ENV === 'development') {
          console.log('Firebase session created successfully');
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create Firebase session:', error);
        }
        toast.error(getUserFriendlyError(error));
        return;
      }
    }
    
    if (response.status === 'success') {
      if (process.env.NODE_ENV === 'development') {
        console.log('→ Handling SUCCESS status - redirecting to success handler');
      }
      // Only show success toast if not on sign-up page (where we'll show error instead)
      if (!isSignUpPage) {
        toast.success('Signed in successfully');
      }
      if (onSuccess) {
        if (process.env.NODE_ENV === 'development') {
          console.log('→ Calling onSuccess callback with response');
        }
        // Pass response to onSuccess so it can detect if user already exists
        onSuccess(response);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('→ No onSuccess callback, redirecting to /newchat');
        }
        router.push('/newchat');
      }
    } else if (response.status === 'needs_linking') {
      if (process.env.NODE_ENV === 'development') {
        console.log('→ Handling NEEDS_LINKING status - showing linking dialog');
      }
      setLinkingData(response);
      setShowLinkingDialog(true);
      if (onNeedsLinking) {
        onNeedsLinking(response);
      }
    } else if (response.status === 'new_user') {
      if (process.env.NODE_ENV === 'development') {
        console.log('→ Handling NEW_USER status - redirecting to onboarding');
      }
      toast.success('Welcome! Account created');
      if (onNewUser) {
        if (process.env.NODE_ENV === 'development') {
          console.log('→ Calling onNewUser callback with response:', response);
        }
        onNewUser(response);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('→ No onNewUser callback, redirecting to onboarding directly');
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('→ Redirecting to onboarding:', onboardingUrl);
        }
        router.push(onboardingUrl);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('→ Unknown SSO response status:', response.status);
      }
      toast.error('An unexpected error occurred. Please try signing in again.');
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('=== End SSO Response Debug ===');
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

        // Check if response is successful before parsing JSON
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          const errorMessage = `Failed to fetch user info from Google: ${userInfoResponse.status} ${userInfoResponse.statusText}${errorText ? ` - ${errorText}` : ''}`;
          if (process.env.NODE_ENV === 'development') {
            console.error('Google userinfo API error:', errorMessage);
          }
          throw new Error(errorMessage);
        }

        // Parse JSON only if response is successful
        let userInfo;
        try {
          userInfo = await userInfoResponse.json();
        } catch (jsonError: any) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse Google userinfo response:', jsonError);
          }
          throw new Error('Invalid response from Google userinfo API');
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
        toast.error(getUserFriendlyError(error));
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled. Please try again.');
    },
  });

  return (
    <>
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
      <DirectSSOButtonsContent
        onNeedsLinking={onNeedsLinking}
        onSuccess={onSuccess}
        onNewUser={onNewUser}
        isSignUpPage={isSignUpPage}
      />
    </GoogleOAuthProvider>
  );
}
