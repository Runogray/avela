import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, MuseoModerno, Inter_Tight, Inter, Figtree, Italiana } from "next/font/google";
import "./globals.css";

// Dote, elegant serif display for the Manage-event / celebration pages.
const italiana = Italiana({
  variable: "--font-italiana",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Display, the emotional register: names, headings, wishes.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

// Body / UI, the trustworthy register: everything functional, every number.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Dote, the wordmark. Variable font (no weight array, avoids a Turbopack
// build error and still covers the 500/600/700 weights the logo uses).
const museo = MuseoModerno({
  variable: "--font-museo",
  subsets: ["latin"],
  display: "swap",
});

// Dote, UI + headings.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

// Dote, input values.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Dote, body / running text (warmer, more character than Inter).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Avela",
    template: "%s · Avela",
  },
  description:
    "Create a celebration page to receive gifts, RSVPs, and good wishes for your wedding, birthday, or baby shower.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${museo.variable} ${interTight.variable} ${inter.variable} ${figtree.variable} ${italiana.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
