"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ReactQueryClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
};

export default ReactQueryClientProvider;
