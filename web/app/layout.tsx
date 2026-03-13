import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "Optimizable — Malemaxxing, Quantified",
  description: "AI-powered testosterone health optimization",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={oswald.variable}>{children}</body>
    </html>
  );
}
