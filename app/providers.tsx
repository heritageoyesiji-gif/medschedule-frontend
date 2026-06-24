"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { SocketListener } from "@/components/shared/SocketListener";
import { Toaster } from "sonner";
import { MSWProvider } from "./MSWProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MSWProvider>
      <QueryClientProvider client={queryClient}>
        <SocketListener />
        {children}
        <Toaster richColors position="top-right" />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </MSWProvider>
  );
}
