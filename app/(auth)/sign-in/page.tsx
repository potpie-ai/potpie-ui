"use client";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GithubAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

import { LucideCheck, LucideGithub } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useSearchParams } from "next/navigation";

export default function Signin() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const agent_id = searchParams.get("agent_id");
  const redirectUrl = searchParams.get("redirect");

  // Extract agent_id from redirect URL if present
  let redirectAgent_id = "";
  if (redirectUrl) {
    try {
      const redirectPath = decodeURIComponent(redirectUrl);
      const url = new URL(redirectPath, window.location.origin);
      redirectAgent_id = url.searchParams.get("agent_id") || "";
    } catch (e) {
      console.error("Error parsing redirect URL:", e);
    }
  }

  // Use agent_id from either direct parameter or redirect URL
  const finalAgent_id = agent_id || redirectAgent_id;

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, { message: "Password is required" }),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const provider = new GithubAuthProvider();
  provider.addScope("read:org");
  provider.addScope("user:email");

  const handleExternalRedirect = async (token: string) => {
    if (finalAgent_id) {
      window.location.href = `/shared-agent?agent_id=${finalAgent_id}`;
    } else if (source === "vscode") {
      window.location.href = `http://localhost:54333/auth/callback?token=${token}`;
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const user = userCredential.user;
        const headers = await getHeaders();
        const userSignup = await axios
          .post(`${baseUrl}/api/v1/signup`, user, { headers: headers })
          .then((res) => {
            if (source === "vscode") {
              console.log("res.data", res.data);
              handleExternalRedirect(res.data.token);
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            }
            return res.data;
          })
          .catch((e) => {
            toast.error("Signup call unsuccessful");
          });
        toast.success("Logged in successfully as " + user.displayName);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        toast.error(errorMessage);
      });
  };

  const onGithub = async () => {
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const credential = GithubAuthProvider.credentialFromResult(result);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (credential) {
          try {
            const headers = await getHeaders();
            const userSignup = await axios.post(
              `${baseUrl}/api/v1/signup`,
              {
                uid: result.user.uid,
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
                accessToken: credential.accessToken,
                providerUsername: (result as any)._tokenResponse.screenName,
              },
              { headers: headers }
            );

            posthog.identify(result.user.uid, {
              email: result.user.email,
              name: result.user?.displayName || "",
            });
            //if this is a new user
            if (!userSignup.data.exists) {
              // For new users, redirect to onboarding
              toast.success(
                "Account created successfully as " + result.user.displayName
              );

              const urlSearchParams = new URLSearchParams(
                window.location.search
              );
              const plan = (
                urlSearchParams.get("plan") ||
                urlSearchParams.get("PLAN") ||
                ""
              ).toLowerCase();
              const prompt = urlSearchParams.get("prompt") || "";

              return (window.location.href = `/onboarding?uid=${result.user.uid}&email=${encodeURIComponent(result.user.email || "")}&name=${encodeURIComponent(result.user.displayName || "")}&plan=${plan}&prompt=${encodeURIComponent(prompt)}&agent_id=${encodeURIComponent(finalAgent_id || "")}`);
            }

            if (source === "vscode") {
              handleExternalRedirect(userSignup.data.token);
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            } else {
              window.location.href = "/newchat";
            }

            toast.success(
              "Logged in successfully as " + result.user.displayName
            );
          } catch (e: any) {
            console.error("API error:", e);
            toast.error("Sign-in unsuccessful");
          }
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.customData?.email;
        const credential = GithubAuthProvider.credentialFromError(error);
        toast.error(errorMessage);
      });
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

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-2">
        <div className="flex items-center justify-center flex-row gap-2">
          <Image
            src={"/images/potpie-blue.svg"}
            width={100}
            height={100}
            alt="logo"
          />
          <h1 className="text-7xl font-bold text-gray-700">potpie</h1>
        </div>
        <div className="flex items-center justify-center flex-col text-border">
          {/* <h3 className="text-2xl font-bold text-black">Get Started!</h3> */}
          {/* <div className="flex items-start justify-start flex-col mt-10 gap-4">
          <p className="flex items-center justify-center text-start gap-4">
            <LucideCheck
              size={20}
              className="bg-primary rounded-full p-[0.5px] text-white"
            />
            Select the repositories you want to build your AI agents on.
          </p>
          <p className="flex items-center justify-center text-start gap-4">
            <LucideCheck
              size={20}
              className="bg-primary rounded-full p-[0.5px] text-white"
            />
            You can choose to add more repositories later on from the
            dashboard
          </p>
        </div> */}
          <Button
            onClick={() => onGithub()}
            className="mt-14 gap-2 w-60 hover:bg-black bg-gray-800"
          >
            <LucideGithub className=" rounded-full border border-white p-1" />
            Signin with GitHub
          </Button>
          <div className="mt-4 text-center text-sm text-black">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
