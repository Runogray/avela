import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// All fonts are self-hosted (src/app/fonts, OFL, via Fontsource) so builds
// never depend on fetching Google Fonts. Variable fonts cover every weight.

// Dote, elegant serif display for the Manage-event / celebration pages.
const italiana = localFont({
  variable: "--font-italiana",
  src: "./fonts/italiana-latin-400-normal.woff2",
  weight: "400",
  display: "swap",
});

// Display, the emotional register: names, headings, wishes.
const fraunces = localFont({
  variable: "--font-fraunces",
  src: [
    { path: "./fonts/fraunces-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/fraunces-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  display: "swap",
});

// Body / UI, the trustworthy register: everything functional, every number.
const hanken = localFont({
  variable: "--font-hanken",
  src: "./fonts/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

// Dote, the wordmark.
const museo = localFont({
  variable: "--font-museo",
  src: "./fonts/museomoderno-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

// Dote, UI + headings.
const interTight = localFont({
  variable: "--font-inter-tight",
  src: "./fonts/inter-tight-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

// Dote, input values.
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

// Dote, body / running text (warmer, more character than Inter).
const figtree = localFont({
  variable: "--font-figtree",
  src: "./fonts/figtree-latin-wght-normal.woff2",
  weight: "300 900",
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
