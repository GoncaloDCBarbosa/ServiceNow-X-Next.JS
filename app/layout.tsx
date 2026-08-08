import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted from the TRH Design System (tokens/README.md → typography.font.ui
// / .mono). Local files avoid a runtime dependency on Google Fonts entirely.
const interSans = localFont({
  src: [
    { path: "./fonts/Inter-VariableFont_opsz,wght.ttf", style: "normal" },
    { path: "./fonts/Inter-Italic-VariableFont_opsz,wght.ttf", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/JetBrainsMono-VariableFont_wght.ttf", style: "normal" },
    { path: "./fonts/JetBrainsMono-Italic-VariableFont_wght.ttf", style: "italic" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRH Plus | Gamification Console",
  description:
    "Live console for TRH Plus challenges and users, built on the ServiceNow Table API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
