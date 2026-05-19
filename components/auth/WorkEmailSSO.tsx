'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/configs/Firebase-config';
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

  const handleGoogleLogin = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      // Request additional scopes if needed
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      
      // Sign in with Firebase Google provider
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Verify email matches
      if (user.email?.toLowerCase() !== email.toLowerCase()) {
        toast.error('Email mismatch! Please use the email you signed up with');
        return;
      }
      
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
      toast.error('Google sign-in hiccup! Give it another shot?');
    }
  };

  const handleSSOResponse = (response: SSOLoginResponse) => {
    if (response.status === 'success') {
      // Check if GitHub needs to be linked
      if (response.needs_github_linking) {
        if (process.env.NODE_ENV === 'development') {
          console.log('→ GitHub not linked, redirecting to onboarding');
        }
        toast.info('Almost there! Link your GitHub to unlock the magic');
        
        // Redirect to onboarding with user info from SSO response
        const onboardingParams = new URLSearchParams({
          ...(response.user_id && { uid: response.user_id }),
          ...(response.email && { email: response.email }),
          ...(response.display_name && { name: response.display_name }),
        });
        
        window.location.href = `/onboarding?${onboardingParams.toString()}`;
        return;
      }
      
      toast.success('Welcome back! Ready to build something amazing?');
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
      toast.success('Welcome to the team! Let\'s get you set up');
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
  // Firebase GoogleAuthProvider uses the Firebase project's OAuth config
  // No need for NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID when using Firebase
  return (
    <WorkEmailSSOContent
      email={email}
      onNeedsLinking={onNeedsLinking}
      onSuccess={onSuccess}
    />
  );
}

