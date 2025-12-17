import Navbar from "../chat/[chatId]/components/Navbar";

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
