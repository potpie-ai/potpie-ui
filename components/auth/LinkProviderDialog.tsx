'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/sso/unified-auth';
import { toast } from 'sonner';
import type { SSOLoginResponse } from '@/types/auth';
import { getUserFriendlyError, getUserFriendlyProviderName } from '@/lib/utils/errorMessages';

interface LinkProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  linkingData: SSOLoginResponse;
  onLinked: () => void;
}

export function LinkProviderDialog({
  isOpen,
  onClose,
  linkingData,
  onLinked,
}: LinkProviderDialogProps) {
  const [isLinking, setIsLinking] = useState(false);

  const handleConfirm = async () => {
    if (!linkingData.linking_token) {
      console.error('No linking token provided');
      return;
    }

    console.log('=== LINK PROVIDER DIALOG - CONFIRM ===');
    console.log('Linking token:', linkingData.linking_token);
    console.log('Full linking data:', linkingData);

    setIsLinking(true);
    try {
      console.log('Calling authClient.confirmLinking...');
      const result = await authClient.confirmLinking(linkingData.linking_token);
      console.log('confirmLinking result:', result);
      toast.success('Account linked successfully!');
      onLinked();
      onClose();
    } catch (error: any) {
      console.error('=== LINKING ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);
      console.error('Full error:', JSON.stringify(error, null, 2));
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLinking(false);
      console.log('=== END LINK PROVIDER DIALOG - CONFIRM ===');
    }
  };

  const handleCancel = async () => {
    if (linkingData.linking_token) {
      try {
        await authClient.cancelLinking(linkingData.linking_token);
      } catch (error) {
        console.error('Cancel linking error:', error);
      }
    }
    onClose();
  };

  const existingProviderNames = linkingData.existing_providers?.map(
    (p) => getUserFriendlyProviderName(p)
  ).join(', ');

  const newProviderType = linkingData.message.includes('Google') ? 'Google' :
                          'SSO';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link {newProviderType} Account?</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 mb-2">
                <span className="font-semibold">{linkingData.email}</span> already has an account
              </p>
              <p className="text-sm text-gray-600 mb-3">
                You're currently signed in with: <span className="font-medium">{existingProviderNames}</span>
              </p>
              <p className="text-sm text-gray-600">
                Would you like to link your {newProviderType} account to enable signing in with both methods?
              </p>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">After linking:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Sign in with {existingProviderNames} or {newProviderType}
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All your data stays in one account
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Manage providers in account settings
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLinking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLinking}
          >
            {isLinking ? 'Linking...' : `Link ${newProviderType} Account`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

