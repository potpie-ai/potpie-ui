import Navbar from "../chat/[chatId]/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar showShare={false} />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
