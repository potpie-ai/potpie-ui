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
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
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
      githubAppUrl, '_blank', 'noopener,noreferrer'
    );
  };

  const provider = new GithubAuthProvider();
  provider.addScope('repo');
  provider.addScope('read:org');
  provider.addScope('user');
  
  const onGithub = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      const userSignup = axios
        .post(`${baseUrl}/api/v1/signup`, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split("@")[0],
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
        },{headers:headers})
        .then((res: { data: any }) => {
          openPopup();
          router.push(`/newchat`);
          return res.data;
        })
        .catch((e: any) => {
          toast.error("Signup call unsuccessful");
        });
      toast.success(
        "Account created successfully as  " + result.user.displayName
      );
    } catch (e) {
      toast.error("Failed to create account");
    }
  };

  return (
    <section className="flex items-center justify-between w-full h-screen relative">
      <div className="w-full bg-[#515983] h-full flex flex-col items-center justify-center gap-28">
        <div className="h-3/6 w-3/5 bg-white rounded-3xl relative">
          <div className="flex justify-between flex-col w-full h-full">
            <div className="mt-auto py-6 px-4 flex flex-col gap-5 h-full">
              <div className="flex items-start justify-start gap-2">
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  AK
                </div>
                <div className="bg-[#FFF1E0] h-20 w-[70%] rounded-lg"></div>
              </div>
              <div className="flex items-start justify-end gap-2">
                <div className="bg-[#E0F3FF] h-20 w-[70%] rounded-lg"></div>
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  <Image src={logo60} alt="logo60" className="rounded-full" />
                </div>
              </div>
              <div className="flex items-start justify-start gap-2">
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  AK
                </div>
                <div className="bg-[#FFF1E0] h-10 w-[70%] rounded-lg"></div>
              </div>
            </div>
            <div className="mb-6 w-5/6 mx-auto h-10 flex justify-end border-2 rounded-sm border-[#3E99DB]">
              <Image src={sendBlue} alt="sendBlue" className="ml-auto mr-2" />
            </div>
          </div>
          <Image
            src={arrowcon}
            className="absolute -bottom-[6rem] right-0 "
            alt="arrowcon"
          />
          <Image src={cross} className="absolute top-0 -right-11" alt="cross" />
        </div>
        <div className="text-xl text-center text-white font-bold mb-10">
          Build AI agents specialised on your <br /> codebase in a minute
        </div>
      </div>
      <div className="w-full h-full flex items-center justify-center flex-col gap-14">
        <Image src={logoWithText} alt="logo" />
        <div className="flex items-center justify-center flex-col text-border">
          <h3 className="text-2xl font-bold text-black">
            One last step and you are ready to go!
          </h3>
          <div className="flex items-start justify-start flex-col mt-10 gap-4">
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
          <Button onClick={() => onGithub()} className="mt-14 gap-2">
            <LucideGithub className=" rounded-full border border-white p-1" />
            Link your GitHub account
          </Button>
        </div>
      </div>
      <Image src={chat} className="absolute top-0" alt="chat" />
      <Image src={cloud} className="absolute bottom-2" alt="cloud" />
      <Image src={setting} className="absolute top-0 right-0" alt="setting" />
    </section>
  );
};

export default LinkGithub;