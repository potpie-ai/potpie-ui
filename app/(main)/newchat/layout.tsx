import Navbar from "../chat/components/Navbar";

export default function RootLayout({
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
