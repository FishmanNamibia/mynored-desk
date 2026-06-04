import type React from "react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { AuthProvider } from "@lib/auth-context";
import { DevBanner } from "@/components/dev-banner";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NORED Desk - Internal Workplace",
  description: "Unified internal workplace for NORED teams",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.className} font-sans antialiased`} suppressHydrationWarning>
        <DevBanner />
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
