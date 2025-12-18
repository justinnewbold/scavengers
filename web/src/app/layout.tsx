import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Scavengers - AI-Powered Scavenger Hunts",
  description: "Create amazing scavenger hunts in seconds with AI. Free for small groups. No ads. Ever.",
  keywords: ["scavenger hunt", "AI", "games", "outdoor", "adventure", "team building"],
  authors: [{ name: "Scavengers Team" }],
  openGraph: {
    title: "Scavengers - AI-Powered Scavenger Hunts",
    description: "Create amazing scavenger hunts in seconds with AI. Free for small groups. No ads. Ever.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
