import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AI Gmail Clone",
  description: "An AI-enhanced Gmail-style mail client.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-zinc-50 text-zinc-900 antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

