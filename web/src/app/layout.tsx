import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Scavengers - AI-Powered Scavenger Hunts",
  description: "Create amazing scavenger hunts in seconds with AI. Free for small groups. No ads. Ever.",
  keywords: ["scavenger hunt", "AI", "games", "outdoor", "adventure", "team building"],
  authors: [{ name: "Scavengers Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Scavengers",
  },
  openGraph: {
    title: "Scavengers - AI-Powered Scavenger Hunts",
    description: "Create amazing scavenger hunts in seconds with AI. Free for small groups. No ads. Ever.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
