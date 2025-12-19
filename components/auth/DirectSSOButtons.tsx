'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signInWithCustomToken, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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

  const handleGoogleLogin = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      // Request additional scopes if needed
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      
      // Sign in with Firebase Google provider
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Extract Google OAuth credential to get the Google OAuth ID token
      // (not the Firebase ID token - backend expects Google OAuth ID token with issuer: accounts.google.com)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential || !credential.idToken) {
        throw new Error('Failed to get Google OAuth ID token');
      }
      
      // This is the Google OAuth ID token (issuer: accounts.google.com) that backend expects
      const googleIdToken = credential.idToken;
      
      // Get user info from the Firebase user object
      const userInfo = {
        email: user.email || '',
        sub: user.uid,
        name: user.displayName || '',
        given_name: user.displayName?.split(' ')[0] || '',
        family_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        picture: user.photoURL || '',
      };

      // Send to backend with Google OAuth ID token (JWT with issuer: accounts.google.com)
      const response = await authClient.ssoLogin(
        userInfo.email,
        'google',
        googleIdToken, // Google OAuth ID token, not Firebase ID token
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
      // Handle user cancellation
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User cancelled, don't show error
        return;
      }
      toast.error(getUserFriendlyError(error));
    }
  };

  return (
    <>
      <div className="space-y-3">
        <button
          onClick={() => handleGoogleLogin()}
          className="btn-enterprise flex items-center justify-center w-full h-14 px-5 py-4 gap-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 hover:shadow-md text-base"
        >
          <Image
            src="/images/google-g-2015.svg"
            alt="Google"
            width={24}
            height={24}
            className="flex-shrink-0"
          />
          <span className="text-gray-700 font-medium text-base">Continue with Google</span>
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
  // Firebase GoogleAuthProvider uses the Firebase project's OAuth config
  // No need for NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID when using Firebase
  return (
    <DirectSSOButtonsContent
      onNeedsLinking={onNeedsLinking}
      onSuccess={onSuccess}
      onNewUser={onNewUser}
      isSignUpPage={isSignUpPage}
    />
  );
}
