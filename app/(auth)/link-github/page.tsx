"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { auth } from "@/configs/Firebase-config";
import {
  arrowcon,
  chat,
  cloud,
  cross,
  logo60,
  logoWithText,
  sendBlue,
  setting,
} from "@/public";
import axios from "axios";
import { GithubAuthProvider, linkWithPopup } from "firebase/auth";
import { Link, LucideCheck, LucideGithub } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import React, { useRef } from "react";
import { toast } from "sonner";

const LinkGithub = () => {
  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const posthog = usePostHog();
  const router = useRouter();
  const popupRef = useRef<Window | null>(null);
  posthog.capture("github login clicked");
  const openPopup = () => {
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const provider = new GithubAuthProvider();
  provider.addScope("repo");
  provider.addScope("read:org");
  provider.addScope("user");

  const onGithub = async () => {
    try {
      // Capture the currently signed-in user (work email / SSO) BEFORE opening the GitHub popup.
      // We will link GitHub to this existing account instead of creating a new GitHub-only user.
      const originalUser = auth.currentUser;
      const linkToUserId = originalUser?.uid;

      if (!linkToUserId || !originalUser) {
        toast.error("Please sign in with your work email first, then link GitHub.");
        return;
      }

      // Link GitHub to the currently signed-in work/SSO user
      const result = await linkWithPopup(originalUser, provider);

      // Extract GitHub provider UID from providerData (stable across sessions)
      const githubProviderUid =
        result.user.providerData.find((p) => p.providerId === "github.com")
          ?.uid || result.user.uid;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      const userSignup = axios
        .post(
          `${baseUrl}/api/v1/signup`,
          {
            // Link GitHub to the original SSO/work account
            uid: linkToUserId,
            linkToUserId: linkToUserId,
            githubFirebaseUid: githubProviderUid, // GitHub provider UID (from providerData)
            email: result.user.email,
            displayName:
              result.user.displayName || result.user.email?.split("@")[0],
            emailVerified: result.user.emailVerified,
            createdAt: result.user.metadata?.creationTime
              ? new Date(result.user.metadata.creationTime).toISOString()
              : "",
            lastLoginAt: result.user.metadata?.lastSignInTime
              ? new Date(result.user.metadata.lastSignInTime).toISOString()
              : "",

            providerData: result.user.providerData,
            accessToken: (result as any)._tokenResponse.oauthAccessToken,
            providerUsername: (result as any)._tokenResponse.screenName,
          },
          { headers: headers }
        )
        .then((res: { data: any }) => {
          openPopup();
          router.push(`/newchat`);
          return res.data;
        })
        .catch((e: any) => {
          // Check for 409 Conflict (GitHub already linked)
          if (e?.response?.status === 409 && e?.response?.data?.error) {
            toast.error(e.response.data.error);
          } else if (e?.response?.data?.error) {
            toast.error(e.response.data.error);
          } else {
          toast.error("Signup call unsuccessful");
          }
        });
      toast.success(
        "Account created successfully as  " + result.user.displayName
      );
    } catch (e) {
      toast.error("Failed to create account");
    }
  };

  return (
    <section className="lg:flex-row flex-col-reverse flex items-center justify-between w-full lg:h-screen relative">
      <div className="flex items-center justify-center w-1/2 h-full p-6">
        <div className="relative h-full w-full rounded-lg overflow-hidden">
          <Image
            src={"/images/landing.png"}
            alt="landing"
            layout="fill"
            objectFit="cover"
          />
        </div>
      </div>

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-14 text-gray-800">
        <Image src={logoWithText} alt="logo" />
        <div className="flex items-center justify-center flex-col text-border">
          <h3 className="text-2xl font-bold text-black">
            One last step and you are ready to go!
          </h3>
          <div className="flex items-start justify-start flex-col mt-10 gap-4 text-gray-800">
            <p className="flex items-center justify-center text-start gap-4">
              <LucideCheck
                size={20}
                className="bg-primary rounded-full p-[0.5px] text-white"
              />
              Link your GitHub account to select the repositories you want to
              build your AI agents on.
            </p>
            <p className="flex items-center justify-center text-start gap-4">
              <LucideCheck
                size={20}
                className="bg-primary rounded-full p-[0.5px] text-white"
              />
              You can choose to add more repositories later on from the
              dashboard
            </p>
          </div>
          <Button
            onClick={() => onGithub()}
            className="mt-14 gap-2 hover:bg-black bg-gray-800"
          >
            <LucideGithub className=" rounded-full border border-white p-1" />
            Link your GitHub account
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LinkGithub;
