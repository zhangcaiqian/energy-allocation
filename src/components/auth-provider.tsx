"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Avoid refetching session too aggressively which can cause re-renders
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
