"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";

type RedirectStatus = "loading" | "success" | "already_exists" | "error";

export default function LinearRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RedirectStatus>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const success = searchParams.get("success");
        const alreadyExists = searchParams.get("already_exists");
        const callbackUserName = searchParams.get("user_name");

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (success === "true") {
          if (alreadyExists === "true") {
            setStatus("already_exists");
            setMessage(
              "This Linear workspace is already connected to your account."
            );
          } else {
            setStatus("success");
            setMessage(
              callbackUserName
                ? `Connected to Linear as ${callbackUserName}.`
                : "Successfully connected to Linear."
            );
          }

          setTimeout(() => {
            router.push("/integrations");
          }, 2500);
          return;
        }

        // We received an OAuth code but the backend should have already
        // converted it into a redirect with success=true. Treat as success
        // but don't trust the message.
        if (code) {
          setStatus("success");
          setMessage("Linear integration completed.");
          setTimeout(() => {
            router.push("/integrations");
          }, 2500);
          return;
        }

        throw new Error("No authorization code or success parameter received");
      } catch (e) {
        console.error("Linear OAuth callback error:", e);
        setMessage(
          e instanceof Error ? e.message : "An unknown error occurred"
        );
        setStatus("error");
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  const handleBackToIntegrations = () => {
    router.push("/integrations");
  };

  const handleRetry = () => {
    router.push("/integrations/linear");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image
                src="/images/linear.svg"
                alt="Linear"
                width={32}
                height={32}
              />
            </div>
            <CardTitle className="text-xl">Linear Integration</CardTitle>
            <CardDescription>
              {status === "loading" && "Connecting to Linear..."}
              {status === "success" && "Successfully connected to Linear!"}
              {status === "already_exists" && "Already connected"}
              {status === "error" && "Connection Failed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  Please wait while we complete the connection.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <p className="text-sm text-gray-600">{message}</p>
                <p className="text-sm text-gray-600">
                  Redirecting to integrations page...
                </p>
              </div>
            )}

            {status === "already_exists" && (
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-8 h-8 text-amber-500" />
                <p className="text-sm text-gray-600">{message}</p>
                <p className="text-xs text-gray-500">
                  Returning to your integrations...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <p className="text-sm text-gray-600">{message}</p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={handleBackToIntegrations}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Integrations
                  </Button>
                  <Button onClick={handleRetry} className="flex-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
