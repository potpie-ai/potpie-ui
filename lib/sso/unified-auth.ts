import axios from 'axios';
import type { SSOLoginResponse, UserAccount, AuthProvider } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class UnifiedAuthClient {
  private baseURL: string;

  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Authenticate via SSO provider
   */
  async ssoLogin(
    email: string,
    ssoProvider: 'google' | 'azure',
    idToken: string,
    providerData?: Record<string, any>
  ): Promise<SSOLoginResponse> {
    const response = await axios.post<SSOLoginResponse>(
      `${this.baseURL}/api/v1/sso/login`,
      {
        email,
        sso_provider: ssoProvider,
        id_token: idToken,
        provider_data: providerData,
      }
    );
    return response.data;
  }

  /**
   * Confirm linking a new provider to existing account
   */
  async confirmLinking(linkingToken: string): Promise<{ message: string; provider: AuthProvider }> {
    const response = await axios.post(
      `${this.baseURL}/api/v1/providers/confirm-linking`,
      { linking_token: linkingToken }
    );
    return response.data;
  }

  /**
   * Cancel a pending provider link
   */
  async cancelLinking(linkingToken: string): Promise<void> {
    await axios.delete(
      `${this.baseURL}/api/v1/providers/cancel-linking/${linkingToken}`
    );
  }

  /**
   * Get user's connected providers
   */
  async getMyProviders(firebaseToken: string): Promise<{ providers: AuthProvider[]; primary_provider?: AuthProvider }> {
    const response = await axios.get(
      `${this.baseURL}/api/v1/providers/me`,
      {
        headers: { Authorization: `Bearer ${firebaseToken}` },
      }
    );
    return response.data;
  }

  /**
   * Set a provider as primary
   */
  async setPrimaryProvider(
    firebaseToken: string,
    providerType: string
  ): Promise<void> {
    await axios.post(
      `${this.baseURL}/api/v1/providers/set-primary`,
      { provider_type: providerType },
      {
        headers: { Authorization: `Bearer ${firebaseToken}` },
      }
    );
  }

  /**
   * Unlink a provider from account
   */
  async unlinkProvider(
    firebaseToken: string,
    providerType: string
  ): Promise<void> {
    await axios.delete(
      `${this.baseURL}/api/v1/providers/unlink`,
      {
        data: { provider_type: providerType },
        headers: { Authorization: `Bearer ${firebaseToken}` },
      }
    );
  }

  /**
   * Get complete account information
   */
  async getAccount(firebaseToken: string): Promise<UserAccount> {
    const response = await axios.get<UserAccount>(
      `${this.baseURL}/api/v1/account/me`,
      {
        headers: { Authorization: `Bearer ${firebaseToken}` },
      }
    );
    return response.data;
  }
}

export const authClient = new UnifiedAuthClient();

