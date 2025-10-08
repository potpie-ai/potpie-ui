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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

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

        try {
          const userSignup = await axios.post(
            `${baseUrl}/api/v1/signup`,
            {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split("@")[0],
              emailVerified: user.emailVerified,
              createdAt: user.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toISOString()
                : "",
              lastLoginAt: user.metadata?.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toISOString()
                : "",
              providerData: user.providerData,
              provider: "email",
            },
            { headers: headers }
          );

          if (source === "vscode") {
            console.log("res.data", userSignup.data);
            handleExternalRedirect(userSignup.data.token);
          } else if (finalAgent_id) {
            handleExternalRedirect("");
          } else {
            window.location.href = "/newchat";
          }

          toast.success("Logged in successfully");
        } catch (e) {
          console.error("API error:", e);
          toast.error("Sign-in unsuccessful");
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        if (errorCode === "auth/user-not-found" || errorCode === "auth/wrong-password") {
          toast.error("Invalid email or password");
        } else if (errorCode === "auth/too-many-requests") {
          toast.error("Too many failed login attempts. Please try again later.");
        } else {
          toast.error(errorMessage);
        }
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

            // Check if this is a new user - if so, reject sign-up via GitHub
            if (!userSignup.data.exists) {
              // New users cannot sign up with GitHub - redirect to sign-up page
              toast.error("Please sign up with your work email address.");
              return (window.location.href = "/sign-up");
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

        <div className="flex items-center justify-center flex-col text-border w-full max-w-md px-6">
          <h3 className="text-2xl font-bold text-black mb-6">Welcome back</h3>

          {/* Email/Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@company.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
              >
                Sign in
              </Button>
            </form>
          </Form>

          <div className="relative w-full my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* GitHub Button - For existing users only */}
          <Button
            onClick={() => onGithub()}
            className="w-full gap-2 hover:bg-black bg-gray-800"
          >
            <LucideGithub className="rounded-full border border-white p-1" />
            Sign in with GitHub
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
