import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RegionProvider } from "@/contexts/RegionContext";
import { AuthProvider } from "@/lib/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <RegionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </RegionProvider>
      </body>
    </html>
  );
}
