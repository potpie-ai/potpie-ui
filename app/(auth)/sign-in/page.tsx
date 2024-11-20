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
import { LucideCheck, LucideGithub } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";

export default function Signin() {
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
  provider.addScope('repo');
  provider.addScope('read:org');
  provider.addScope('user');

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const user = userCredential.user;
        const headers = await getHeaders();
        const userSignup = axios
          .post(`${baseUrl}/api/v1/signup`, user,{headers:headers})
          .then((res) => res.data)
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
      .then((result) => {
        // alert(JSON.stringify(result));
        // alert(result.user);
        // alert(JSON.stringify({ ...result.user, providerUsername: result._tokenResponse.screenName }));
        const credential = GithubAuthProvider.credentialFromResult(result);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (credential) {
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
              accessToken: credential.accessToken,
              providerUsername: (result as any)._tokenResponse.screenName,
            })
            .then((res: { data: any }) => res.data)
            .catch((e: any) => {
              toast.error("Signup call unsuccessful");
            });
          toast.success("Logged in successfully");
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.customData.email;
        const credential = GithubAuthProvider.credentialFromError(error);
        toast.error(errorMessage);
      });
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
        <Button onClick={() => onGithub()} className="mt-14 gap-2 w-80">
          <LucideGithub className=" rounded-full border border-white p-1" />
          Signin with GitHub
        </Button>
        <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
      </div>
    </div>
    <Image src={chat} className="absolute top-0" alt="chat" />
    <Image src={cloud} className="absolute bottom-2" alt="cloud" />
    <Image src={setting} className="absolute top-0 right-0" alt="setting" />
  </section>
  );
}
