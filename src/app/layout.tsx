import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "EatPlan｜個人化飲食規劃",
  description: "依個人目標自動產生每週 Costco 食譜與採購清單",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EatPlan",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
