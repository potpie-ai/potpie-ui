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

if (typeof window !== "undefined") {
  console.log("PostHog Key:", process.env.NEXT_PUBLIC_POSTHOG_KEY);
  console.log("PostHog Host:", process.env.NEXT_PUBLIC_POSTHOG_HOST);

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    loaded: () => {
      if (typeof window !== 'undefined') {
        posthog.startSessionRecording();
      }
    },
  });
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
