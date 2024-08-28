"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();

  if (user == null) {
    router.push("/sign-in");
    return null;
  }

  return (
    <>
      <div
        className={`grid h-screen w-full
          }`}
      >
        <div className="flex flex-col">
          <main className="overflow-auto py-5 px-7 pb-12">{children}</main>
        </div>
      </div>
    </>
  );
}
