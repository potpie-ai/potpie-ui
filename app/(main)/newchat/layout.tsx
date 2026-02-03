import Navbar from "../chat/[chatId]/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar showShare={false} />
      {children}
    </>
  );
}
