import { Syne } from "next/font/google";
import localFont from "next/font/local";

export const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const cooperHewitt = localFont({
  src: [
    { path: "./fonts/cooper-hewitt/CooperHewitt-Book.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cooper-hewitt/CooperHewitt-BookItalic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cooper-hewitt/CooperHewitt-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cooper-hewitt/CooperHewitt-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cooper-hewitt/CooperHewitt-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cooper-hewitt",
  display: "swap",
});
