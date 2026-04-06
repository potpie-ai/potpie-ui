import type { Metadata } from "next";
import localFont from "next/font/local";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import LayoutProviders from "@/providers/LayoutProviders";
import { GeistSans } from "geist/font/sans";

const UncutSans = localFont({
  src: [
    {
      path: "../public/fonts/Uncut-Sans-VF.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-uncut",
  display: "swap",
});

const RobotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const DmMono = localFont({
  src: [
    {
      path: "../public/fonts/DMMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "potpie - ai agents for your codebase in minutes",
  description: "Build task-oriented custom agents for your codebase that perform engineering tasks with high precision powered by intelligence and context from your data. Build agents for use cases like system design, debugging, integration testing, onboarding etc.",
  icons: {
    icon: "/images/Green Icon.svg",
    shortcut: "/images/Green Icon.svg",
    apple: "/images/Green Icon.svg",
  },
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
          "min-h-screen font-mulish antialiased ",
          GeistSans.className,
          UncutSans.variable,
          RobotoMono.variable,
          DmMono.variable
        )}
      >
        <LayoutProviders>{children}</LayoutProviders>
        <Toaster />
      </body>
    </html>
  );
}
