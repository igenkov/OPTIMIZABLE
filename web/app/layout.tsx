import type { Metadata } from "next";
import { Oswald, Source_Serif_4 } from "next/font/google";
import { PhosphorProvider } from "@/components/PhosphorProvider";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-oswald",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-serif",
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
      <body className={`${oswald.variable} ${sourceSerif.variable} font-serif antialiased`}>
        <PhosphorProvider>{children}</PhosphorProvider>
      </body>
    </html>
  );
}
