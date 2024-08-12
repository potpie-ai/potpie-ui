"use client";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GithubAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import { MomentumBG } from "@/public";
import axios from "@/app/api/interceptors/httpInterceptor";

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
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // console.log(data);
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        const userSignup = axios
          .post(`/signup`, user)
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
        if (credential) {
          const userSignup = axios
            .post(`/signup`, {
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
    <div className="flex items-center justify-center py-12">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mx-auto grid w-[350px] gap-6"
        >
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-extrabold">Login</h1>
            {/* <p className="text-balance text-secondary">
              Enter your email below to login to your account
            </p> */}
          </div>
          <div className="grid gap-4">
            {/* <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="m@example.com"
                      required
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
                <FormItem className="grid gap-2">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input id="password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              Login
            </Button> */}
            <Button
              type="button"
              onClick={onGithub}
              className="w-full text-background bg-[#2b3137] hover:bg-[#2b3137] outline-none border-none hover:opacity-95"
            >
              <Github className="mr-2 h-4 w-4 inline " /> Login with Github
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
