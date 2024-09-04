import type { Metadata } from "next";
import MullishRegularFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import LayoutProviders from "@/providers/LayoutProviders";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "potpie",
  description: "PotPie.ai",
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
          GeistSans.className
        )}
      >
        <LayoutProviders>{children}</LayoutProviders>
        <Toaster richColors theme="light" closeButton />
      </body>
    </html>
  );
}
