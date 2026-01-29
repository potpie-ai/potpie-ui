"use client";

import {
  GithubAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  User,
  UserCredential,
} from "firebase/auth";

type GithubOAuthResult =
  | {
      status: "linked";
      credential: UserCredential;
      accessToken: string | null;
      providerUsername?: string;
    }
  | {
      status: "already_linked";
    };

const GITHUB_PROVIDER_ID = "github.com";

/**
 * Triggers GitHub OAuth for the given Firebase user ensuring the required scopes
 * are granted. If the account is already linked, it skips the popup.
 */
export const ensureGithubOAuth = async (
  user: User | null,
  options: { forceReauth?: boolean } = {}
): Promise<GithubOAuthResult> => {
  if (!user) {
    throw new Error("GitHub OAuth requires an authenticated user.");
  }

  const hasGithubLinked = user.providerData?.some(
    (provider) => provider.providerId === GITHUB_PROVIDER_ID
  );

  const provider = new GithubAuthProvider();
  provider.addScope("read:user");
  provider.addScope("read:org");
  provider.addScope("user:email");

  // When the account is already linked we optionally re-authenticate to refresh tokens.
  if (hasGithubLinked && !options.forceReauth) {
    return { status: "already_linked" };
  }

  try {
    const result = hasGithubLinked
      ? await reauthenticateWithPopup(user, provider)
      : await linkWithPopup(user, provider);

    const credential = GithubAuthProvider.credentialFromResult(result);
    const accessToken =
      credential?.accessToken ??
      (result as any)?._tokenResponse?.oauthAccessToken ??
      null;

    const providerUsername = (result as any)?._tokenResponse?.screenName;

    return {
      status: "linked",
      credential: result,
      accessToken,
      providerUsername,
    };
  } catch (error: any) {
    // If the provider is already linked but reauth is not requested, surface as already linked.
    if (error?.code === "auth/provider-already-linked") {
      return { status: "already_linked" };
    }
    throw error;
  }
};
