'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/sso/unified-auth';
import { toast } from '@/components/ui/sonner';
import type { SSOLoginResponse } from '@/types/auth';
import { getUserFriendlyError, getUserFriendlyProviderName } from '@/lib/utils/errorMessages';
import { Zap, Check } from 'lucide-react';

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
      return;
    }

    setIsLinking(true);
    try {
      await authClient.confirmLinking(linkingData.linking_token);
      toast.success('Accounts connected! You\'re all set to go');
      onLinked();
      onClose();
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Account linking failed:', error.message);
      }
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLinking(false);
    }
  };

  const handleCancel = async () => {
    if (linkingData.linking_token) {
      try {
        await authClient.cancelLinking(linkingData.linking_token);
      } catch (error) {
        // Silently handle cancel errors - user is already canceling
        if (process.env.NODE_ENV === 'development') {
          console.error('Cancel linking error:', error);
        }
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
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 mb-2">
                <span className="font-semibold">{linkingData.email}</span> already has an account
              </p>
              <p className="text-sm text-gray-600 mb-3">
                You&apos;re currently signed in with: <span className="font-medium">{existingProviderNames}</span>
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
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Sign in with {existingProviderNames} or {newProviderType}
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                All your data stays in one account
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-green-500" />
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

