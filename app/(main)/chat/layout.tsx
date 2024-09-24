import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col -m-4 lg:ga-m-6 lg:-m-6">
      <Navbar />
      {children}
    </div>
  );
}
