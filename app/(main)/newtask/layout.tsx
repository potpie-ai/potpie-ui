import Navbar from "@/app/(main)/chat/[chatId]/components/Navbar";

export default function NewTaskLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar showShare={false} showTitle={false} />
      {children}
    </>
  );
}
