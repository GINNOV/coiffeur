import type { Metadata } from "next";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda del salone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-dvh flex-col">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
