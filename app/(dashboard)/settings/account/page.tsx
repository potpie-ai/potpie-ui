'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/configs/Firebase-config';
import { authClient } from '@/lib/sso/unified-auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { UserAccount, AuthProvider } from '@/types/auth';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const token = await user.getIdToken();
      const accountData = await authClient.getAccount(token);
      setAccount(accountData);
    } catch (error) {
      console.error('Load account error:', error);
      toast.error('Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (providerType: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      await authClient.setPrimaryProvider(token, providerType);
      toast.success('Primary provider updated');
      loadAccount();
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error('Failed to update primary provider');
    }
  };

  const handleUnlink = async (providerType: string) => {
    if (!confirm('Are you sure you want to unlink this provider?')) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      await authClient.unlinkProvider(token, providerType);
      toast.success('Provider unlinked');
      loadAccount();
    } catch (error: any) {
      console.error('Unlink error:', error);
      toast.error(error.response?.data?.error || 'Failed to unlink provider');
    }
  };

  const providerInfo: Record<string, { name: string; icon: string }> = {
    firebase_github: { name: 'GitHub', icon: '🐙' },
    sso_google: { name: 'Google', icon: '🔵' },
    sso_azure: { name: 'Microsoft', icon: '🔷' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load account</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-500">Email</span>
            <p className="font-medium">{account.email}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Display Name</span>
            <p className="font-medium">{account.display_name || 'Not set'}</p>
          </div>
          {account.organization && (
            <div>
              <span className="text-sm text-gray-500">Organization</span>
              <p className="font-medium">{account.organization_name || account.organization}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage your sign-in methods. You can link multiple providers to access your account.
        </p>

        <div className="space-y-3">
          {account.providers.map((provider) => {
            const info = providerInfo[provider.provider_type] || {
              name: provider.provider_type,
              icon: '🔐',
            };

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="font-medium flex items-center">
                      {info.name}
                      {provider.is_primary && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Linked {new Date(provider.linked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!provider.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(provider.provider_type)}
                    >
                      Set as Primary
                    </Button>
                  )}
                  {account.providers.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUnlink(provider.provider_type)}
                    >
                      Unlink
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => router.push('/sso-login')}
          >
            + Add Another Sign-In Method
          </Button>
        </div>
      </div>
    </div>
  );
}

