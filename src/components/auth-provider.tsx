"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

const TZ_COOKIE_NAME = "user_timezone";

/**
 * Detect browser timezone and store it in a cookie so server-side
 * code (API routes, server components) can read it.
 * The cookie is refreshed on every page load to stay current.
 */
function useTimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        // Set cookie with 1-year expiry, accessible by server
        document.cookie = `${TZ_COOKIE_NAME}=${encodeURIComponent(tz)};path=/;max-age=31536000;SameSite=Lax`;
      }
    } catch {
      // Intl not supported — server will use default (Asia/Shanghai)
    }
  }, []);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useTimezoneSync();

  return (
    <SessionProvider
      // Avoid refetching session too aggressively which can cause re-renders
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
