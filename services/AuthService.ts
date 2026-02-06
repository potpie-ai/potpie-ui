import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import type { User } from "firebase/auth";

interface SignupPayload {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  providerData: any[];
  accessToken?: string;
  providerUsername?: string;
}

interface SignupResponse {
  exists: boolean;
  token?: string;
  needs_github_linking?: boolean;
}

interface CheckEmailResponse {
  has_sso?: boolean;
}

interface ResolveGitHubConflictResponse {
  success: boolean;
  message: string;
  deleted_firebase_uid?: string;
}

interface LinkGitHubPayload {
  uid: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  linkToUserId: string;
  githubFirebaseUid?: string;
  accessToken?: string;
  providerUsername?: string;
}

export default class AuthService {
  private static baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  /**
   * Sign up or sign in with email/password
   * Sends structured payload to the signup endpoint
   */
  static async signupWithEmailPassword(user: User): Promise<SignupResponse> {
    const headers = await getHeaders();
    
    const payload: SignupPayload = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "",
      emailVerified: user.emailVerified,
      createdAt: user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toISOString()
        : "",
      lastLoginAt: user.metadata?.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).toISOString()
        : "",
      providerData: user.providerData || [],
      // No accessToken for email/password
      // No providerUsername for email/password
    };

    try {
      const response = await axios.post<SignupResponse>(
        `${this.baseUrl}/api/v1/signup`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Signup API error:", error);
      }
      // Check for 409 Conflict (GitHub already linked) or other errors
      const errorMessage =
        error.response?.data?.error || 
        error.response?.data?.details ||
        error.message ||
        "Signup call unsuccessful";
      throw new Error(errorMessage);
    }
  }

  /**
   * Sign up or sign in with GitHub
   * Includes accessToken and providerUsername for GitHub authentication
   */
  static async signupWithGitHub(
    user: User,
    accessToken: string,
    providerUsername: string
  ): Promise<SignupResponse> {
    const headers = await getHeaders();

    const payload: SignupPayload = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "",
      emailVerified: user.emailVerified,
      createdAt: user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toISOString()
        : "",
      lastLoginAt: user.metadata?.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).toISOString()
        : "",
      providerData: user.providerData,
      accessToken: accessToken,
      providerUsername: providerUsername,
    };

    try {
      const response = await axios.post<SignupResponse>(
        `${this.baseUrl}/api/v1/signup`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("GitHub signup API error:", error);
      }
      // Check for 409 Conflict (GitHub already linked) or other errors
      const errorMessage =
        error.response?.data?.error || 
        error.response?.data?.details ||
        error.message ||
        "Sign-in unsuccessful";
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if an email is registered with SSO
   * Returns whether the email has SSO authentication
   */
  static async checkEmailForSSO(email: string): Promise<CheckEmailResponse> {
    try {
      const response = await axios.get<CheckEmailResponse>(
        `${this.baseUrl}/api/v1/account/check-email?email=${encodeURIComponent(email)}`,
        { validateStatus: () => true } // Don't throw on any status
      );
      return response.data;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error checking SSO status:", error);
      }
      throw error;
    }
  }

  /**
   * Resolve GitHub credential conflict
   * When a GitHub account is already linked to another Firebase user,
   * this endpoint allows the current user to claim the GitHub account
   * by deleting the conflicting user from the backend.
   */
  static async resolveGitHubConflict(
    currentUserUid: string,
    conflictingGitHubUid: string,
    githubAccessToken?: string,
    githubUsername?: string
  ): Promise<ResolveGitHubConflictResponse> {
    const headers = await getHeaders();

    try {
      const response = await axios.post<ResolveGitHubConflictResponse>(
        `${this.baseUrl}/api/v1/resolve-github-conflict`,
        {
          current_user_uid: currentUserUid,
          conflicting_github_uid: conflictingGitHubUid,
          github_access_token: githubAccessToken,
          github_username: githubUsername,
        },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Resolve GitHub conflict API error:", error);
      }
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details ||
        error.message ||
        "Failed to resolve GitHub conflict";
      throw new Error(errorMessage);
    }
  }

  /**
   * Link GitHub to an existing user account
   * Used after conflict resolution or for first-time GitHub linking
   */
  static async linkGitHub(payload: LinkGitHubPayload): Promise<SignupResponse> {
    const headers = await getHeaders();

    try {
      const response = await axios.post<SignupResponse>(
        `${this.baseUrl}/api/v1/signup`,
        {
          uid: payload.uid,
          email: payload.email,
          displayName: payload.displayName,
          emailVerified: payload.emailVerified,
          linkToUserId: payload.linkToUserId,
          githubFirebaseUid: payload.githubFirebaseUid,
          accessToken: payload.accessToken,
          providerUsername: payload.providerUsername,
        },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Link GitHub API error:", error);
      }
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details ||
        error.message ||
        "Failed to link GitHub account";
      throw new Error(errorMessage);
    }
  }
}

