"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ConfluenceRedirectPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            }
        >
            <ConfluenceRedirectContent />
        </Suspense>
    );
}

function ConfluenceRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );
    const [message, setMessage] = useState("");

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log("🔍 Confluence OAuth Callback Debug Info:");
                console.log("- Full URL:", window.location.href);
                console.log("- Search params:", searchParams.toString());

                const error = searchParams.get("error");
                const errorDescription = searchParams.get("error_description");
                const success = searchParams.get("success");
                const code = searchParams.get("code");
                const state = searchParams.get("state");

                console.log("- Error:", error);
                console.log("- Error Description:", errorDescription);
                console.log("- Success:", success);
                console.log("- Code:", code ? "Present" : "Missing");
                console.log("- State:", state);

                if (success === "true") {
                    setStatus("success");
                    setMessage("Successfully connected to Confluence!");
                    setTimeout(() => {
                        router.push("/integrations");
                    }, 2000);
                    return;
                }

                if (error) {
                    throw new Error(errorDescription || error);
                }

                if (!code) {
                    throw new Error("No authorization code received from Confluence");
                }

                console.log("✅ Authorization code received, saving integration...");

                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
                const response = await fetch(
                    `${baseUrl}/api/v1/integrations/confluence/save`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: code,
                            // use configured redirect_uri to match exactly what was sent to Atlassian
                            redirect_uri:
                                process.env.NEXT_PUBLIC_CONFLUENCE_REDIRECT_URI ||
                                "http://localhost:8001/integrations/confluence/redirect",
                            instance_name: "Confluence Integration",
                            integration_type: "confluence",
                            timestamp: new Date().toISOString(),
                            user_id: state || undefined,
                        }),
                    }
                );

                console.log("📊 Save response status:", response.status);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("❌ Save error:", errorData);
                    throw new Error(
                        errorData.detail ||
                        errorData.message ||
                        `Failed to save integration (${response.status})`
                    );
                }

                const data = await response.json();
                console.log("✅ Integration saved successfully:", data);

                setStatus("success");
                setMessage("Successfully connected to Confluence!");

                setTimeout(() => {
                    router.push("/integrations");
                }, 2000);
            } catch (error) {
                console.error("❌ OAuth callback error:", error);
                setStatus("error");
                setMessage(
                    error instanceof Error
                        ? error.message
                        : "Failed to complete Confluence integration"
                );
            }
        };

        handleCallback();
    }, [searchParams, router]);

    const handleRetry = () => {
        router.push("/integrations/confluence");
    };

    const handleGoBack = () => {
        router.push("/integrations/confluence");
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Image
                                src="/images/confluence-1.svg"
                                alt="Confluence"
                                width={24}
                                height={24}
                            />
                        </div>
                        <CardTitle className="text-xl">Confluence Integration</CardTitle>
                    </div>
                    <CardDescription>
                        {status === "loading" && "Connecting to Confluence..."}
                        {status === "success" && "Successfully connected to Confluence!"}
                        {status === "error" && "Connection failed"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6">
                        {status === "loading" && (
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                        )}
                        {status === "success" && (
                            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                        )}
                        {status === "error" && (
                            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                        )}

                        <p className="text-center text-gray-600 mb-4">{message}</p>

                        {status === "error" && (
                            <div className="flex gap-2 w-full">
                                <Button onClick={handleGoBack} variant="outline" className="flex-1">
                                    Go Back
                                </Button>
                                <Button onClick={handleRetry} className="flex-1">
                                    Try Again
                                </Button>
                            </div>
                        )}

                        {status === "success" && (
                            <p className="text-sm text-gray-500">
                                Redirecting to integrations page...
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
