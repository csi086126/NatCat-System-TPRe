import type { Metadata } from "next";
import "./globals.css";
import { RegionProvider } from "@/contexts/RegionContext";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "NatCat System - TPRe",
  description: "Natural Catastrophe Risk Assessment System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <RegionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </RegionProvider>
      </body>
    </html>
  );
}
