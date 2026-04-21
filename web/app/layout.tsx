import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import { PhosphorProvider } from "@/components/PhosphorProvider";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "Optimizable — Just a Man. Properly.",
  description: "AI-powered testosterone health optimization",
  openGraph: {
    title: "Optimizable — Just a Man. Properly.",
    description: "AI-powered testosterone health optimization",
    url: "https://optimizable.vercel.app",
    siteName: "Optimizable",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Optimizable — Just a Man. Properly.",
    description: "AI-powered testosterone health optimization",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={oswald.variable}><PhosphorProvider>{children}</PhosphorProvider></body>
    </html>
  );
}
