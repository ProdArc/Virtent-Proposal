import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Metadata genérica — cada proposta em /[slug] sobrescreve title/description
// via generateMetadata com o conteúdo real daquele cliente.
export const metadata: Metadata = {
  title: "Virtent — Propostas Comerciais",
  description: "Propostas comerciais personalizadas da Virtent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-[#F9FBF8] text-[#18181B] min-h-full">
        {children}
      </body>
    </html>
  );
}
