import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "./components/AppShell";

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
  title: {
    default: "TRH Plus Gamification Console",
    template: "%s — TRH Plus",
  },
  description:
    "Run the TRH Plus gamification programme: challenges, participations and players.",
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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
