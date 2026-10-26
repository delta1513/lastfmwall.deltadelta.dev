import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Last.fm Animated Track Wall",
  description: "Animated wall of your top album art from Last.fm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black">{children}</body>
    </html>
  );
}
