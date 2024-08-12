import type { Metadata } from "next";
import MullishRegularFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import ReactQueryClientProvider from "@/providers/ReactQueryClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthContextProvider } from "@/contexts/AuthContext";
import LayoutProviders from "@/providers/LayoutProviders";
import PHProvider from "@/providers/PostHogProvider";

const mullishRegular = MullishRegularFont({
  src: "fonts/Mulish-VariableFont_wght.ttf",
  variable: "--font-mulish",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HundredMarks.ai",
  description: "Hundremarks.ai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-mulish antialiased ",
          mullishRegular.variable
        )}
      >
        <PHProvider>
        <ReactQueryClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthContextProvider>
              <LayoutProviders>{children}</LayoutProviders>
            </AuthContextProvider>
          </ThemeProvider>
        </ReactQueryClientProvider>
        </PHProvider>
        <Toaster richColors theme="light" closeButton />
      </body>
    </html>
  );
}
