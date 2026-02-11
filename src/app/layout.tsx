import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/lib/fontawesome";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "留白 — 你的精力觉察伙伴",
  description: "像管理资产一样管理精力，在忙碌中留出呼吸的空间。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf9f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen bg-[#faf9f6]">
        <AuthProvider>
          <main className="max-w-md mx-auto min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
