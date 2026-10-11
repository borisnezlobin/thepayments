import type { Metadata } from "next";
import { cooperHewitt, syne } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Payments",
  description: "Sell to AI agents and keep the card fee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${syne.variable} ${cooperHewitt.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface text-body text-ink">{children}</body>
    </html>
  );
}
