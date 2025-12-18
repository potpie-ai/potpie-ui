export type ProviderType = 
  | 'firebase_github' 
  | 'sso_google';

export type SSOLoginStatus = 
  | 'success' 
  | 'needs_linking' 
  | 'new_user';

export interface AuthProvider {
  id: string;
  user_id: string;
  provider_type: ProviderType;
  provider_uid: string;
  provider_data?: Record<string, any>;
  is_primary: boolean;
  linked_at: string;
  last_used_at?: string;
}

export interface SSOLoginResponse {
  status: SSOLoginStatus;
  user_id?: string;
  email: string;
  display_name?: string;
  access_token?: string;
  firebase_token?: string;
  message: string;
  linking_token?: string;
  existing_providers?: string[];
}

export interface UserAccount {
  user_id: string;
  email: string;
  display_name?: string;
  organization?: string;
  organization_name?: string;
  email_verified: boolean;
  created_at: string;
  providers: AuthProvider[];
  primary_provider?: string;
}
