"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Github, Loader2 } from "lucide-react";
import axios from "axios";
import { headers } from "next/headers";
import getHeaders from "@/app/utils/headers.util";

export default function SignUp() {
  const formSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email(),
    password: z.string().min(6, { message: "Password is required" }),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const route = useRouter();
  const provider = new GithubAuthProvider();
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await updateProfile(result.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });
      form.reset();
      toast.success(
        "Account created successfully as  " + result.user.displayName
      );
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const userSignup = axios
        .post(`${baseUrl}/signup`, result,{headers:headers})
        .then((res) => res.data)
        .catch((e) => {
          toast.error("Signup call unsuccessful");
        });
      route.push("/");
    } catch (e) {
      toast.error("Failed to create account");
    }
  };

  const onGithub = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

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
      toast.success(
        "Account created successfully as  " + result.user.displayName
      );
    } catch (e) {
      toast.error("Failed to create account");
    }
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input
                        id="first-name"
                        placeholder="Max"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input
                        id="last-name"
                        placeholder="Rosh"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
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
              Create an account
            </Button>
          </form>
        </Form> */}
        <Button
          variant="outline"
          className="w-full text-background bg-[#2b3137] hover:bg-[#2b3137] outline-none border-none hover:opacity-95"
          onClick={onGithub}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              <Github className="mr-2 w-4 h-4" /> Sign up with GitHub
            </>
          )}
        </Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?
          <Link href="/sign-in" className="underline">
            {""} Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
