"use client";
import Loading from "@/app/loading";
import { TooltipProvider } from "@/components/ui/tooltip";
import { store, persistor } from "@/lib/state/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "next-themes";
import { AuthContextProvider } from "@/contexts/AuthContext";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FormbricksProvider from "@/app/formbricks";
import { isPostHogEnabled } from "@/lib/utils";

// Conditionally initialize PostHog based on environment variables
if (typeof window !== "undefined") {
  if (isPostHogEnabled()) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: true,
      loaded: () => {
        if (typeof window !== "undefined") {
          posthog.startSessionRecording();
        }
      },
    });
    console.log("PostHog initialized with real implementation");
  } else {
    // Override methods with no-op implementations while maintaining the original posthog object
    posthog.capture = () => undefined;
    posthog.identify = () => {};
    posthog.reset = () => {};
    posthog.startSessionRecording = () => {};
    console.log(
      "PostHog initialized with mock implementation for local development"
    );
  }
}

const LayoutProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthContextProvider>
            <FormbricksProvider />
            <PersistGate loading={<Loading />} persistor={persistor}>
              <Provider store={store}>
                <TooltipProvider>{children}</TooltipProvider>
              </Provider>
            </PersistGate>
          </AuthContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
};

export default LayoutProviders;
